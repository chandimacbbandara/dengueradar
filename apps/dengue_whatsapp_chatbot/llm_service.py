"""Provider-isolated LLM service for the web dengue assistant."""

from __future__ import annotations

import json
from typing import Any

import requests

from config import (
    LLM_API_KEY,
    LLM_API_URL,
    LLM_MODEL,
    LLM_PROVIDER,
    LLM_TIMEOUT_SECONDS,
)


SYSTEM_PROMPT = """You are a Sri Lankan Medical Officer of Health (MOH) expert and the DengueRadar AI Assistant.

Your role is to answer user questions about Dengue accurately and concisely using ONLY the provided KNOWLEDGE_CONTEXT and RISK_CONTEXT.

Rules you must follow:
1. If the user greets you or asks for help, introduce yourself as the DengueRadar AI Assistant. You can provide dengue risk predictions for any MOH zone in Sri Lanka, as well as general info on symptoms and prevention.
2. If the user asks for a prediction but does not specify a location (or if no RISK_CONTEXT is provided), politely ask them to specify their MOH zone or city.
3. ONLY use facts from the provided KNOWLEDGE_CONTEXT and RISK_CONTEXT to answer the user's question. Do not invent, guess, or use outside knowledge.
4. If the user asks about a specific area and RISK_CONTEXT is provided, format a helpful, professional MOH response explaining the risk level and predicted cases for that area.
5. If the KNOWLEDGE_CONTEXT and RISK_CONTEXT do not contain the answer and it's not a general greeting, simply say: "I'm sorry, I don't have that information right now." Do NOT invent an answer.
6. For symptom questions, state that the response is general education, not an individual diagnosis.
7. Keep answers EXTREMELY concise (under 50 words if possible) for quick WhatsApp reading. Use short bullet points. Do not write essays.
8. Answer in the language of the user's question.
9. Do not mention that you are reading from a context or a document. Just answer naturally as an expert.
10. VERY IMPORTANT: Do NOT output your internal thinking process, reasoning steps, or meta-commentary (e.g., do not say "Here's a thinking process"). Provide ONLY the final response meant for the user.
"""

ALLOWED_RISK_LEVELS = {"LOW", "MODERATE", "HIGH"}


class AssistantServiceError(RuntimeError):
    """Raised when the configured LLM provider cannot return a usable answer."""


class AssistantConfigurationError(AssistantServiceError):
    """Raised when required LLM configuration is absent or unsupported."""


class RiskContextError(ValueError):
    """Raised when application-supplied risk context is malformed."""


def _validate_risk_context(risk_context: Any) -> dict[str, Any] | None:
    if risk_context is None:
        return None
    if not isinstance(risk_context, dict):
        raise RiskContextError("risk_context must be a JSON object.")

    required = {"area", "predicted_cases", "risk_level"}
    if not required.issubset(risk_context):
        raise RiskContextError(
            "risk_context requires area, predicted_cases, and risk_level."
        )

    area = risk_context["area"]
    predicted_cases = risk_context["predicted_cases"]
    risk_level = risk_context["risk_level"]
    if not isinstance(area, str) or not area.strip() or len(area.strip()) > 100:
        raise RiskContextError("risk_context.area must be a non-empty short string.")
    if (
        isinstance(predicted_cases, bool)
        or not isinstance(predicted_cases, int)
        or predicted_cases < 0
    ):
        raise RiskContextError(
            "risk_context.predicted_cases must be a non-negative integer."
        )
    if not isinstance(risk_level, str) or risk_level.upper() not in ALLOWED_RISK_LEVELS:
        raise RiskContextError(
            "risk_context.risk_level must be LOW, MODERATE, or HIGH."
        )

    verified_context = {
        "area": area.strip(),
        "predicted_cases": predicted_cases,
        "risk_level": risk_level.upper(),
    }
    data_status = risk_context.get("data_status")
    if data_status is not None:
        if not isinstance(data_status, str) or not data_status.strip():
            raise RiskContextError("risk_context.data_status must be a string.")
        verified_context["data_status"] = data_status.strip()[:100]
    return verified_context


import re


REASONING_HEADER = re.compile(
    r"(?:here(?:'s| is)\s+(?:a\s+)?thinking\s+process|thinking\s+process)\s*:?",
    re.IGNORECASE,
)
FINAL_ANSWER_MARKER = re.compile(
    r"(?:let's\s+draft|final\s+answer|response|drafting\s+the\s+response|"
    r"here\s+is\s+the\s+response)\s*:\s*",
    re.IGNORECASE,
)


def _clean_response(text: str) -> str:
    """Return only user-facing text, rejecting responses that contain only reasoning."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)

    reasoning_match = REASONING_HEADER.search(text)
    if reasoning_match:
        final_match = FINAL_ANSWER_MARKER.search(text, reasoning_match.end())
        text = text[final_match.end():] if final_match else ""

    text = text.strip()
    text = FINAL_ANSWER_MARKER.sub("", text, count=1).strip()
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1]

    return text.strip()


def _extract_openrouter_text(response_data: dict[str, Any]) -> str:
    try:
        content = response_data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AssistantServiceError(
            "The LLM provider returned no answer text."
        ) from exc

    if isinstance(content, str) and content.strip():
        return _clean_response(content.strip())

    # Some OpenAI-compatible models can return typed text content parts.
    if isinstance(content, list):
        parts = [
            item["text"]
            for item in content
            if isinstance(item, dict) and isinstance(item.get("text"), str)
        ]
        answer = "\n".join(parts).strip()
        if answer:
            return _clean_response(answer)

    raise AssistantServiceError("The LLM provider returned no answer text.")


def _ask_openrouter(user_message: str, knowledge_context: str | None, risk_context: dict | None = None) -> str:
    if not LLM_API_KEY or not LLM_MODEL:
        raise AssistantConfigurationError(
            "LLM_API_KEY and LLM_MODEL must be configured."
        )
    try:
        timeout_seconds = float(LLM_TIMEOUT_SECONDS)
    except (TypeError, ValueError) as exc:
        raise AssistantConfigurationError(
            "LLM_TIMEOUT_SECONDS must be a number."
        ) from exc
    if not 1 <= timeout_seconds <= 120:
        raise AssistantConfigurationError(
            "LLM_TIMEOUT_SECONDS must be between 1 and 120."
        )

    context_text = knowledge_context if knowledge_context else "NONE"
    risk_text = json.dumps(risk_context) if risk_context else "NONE"
    
    payload = {
        "model": LLM_MODEL,
        "max_tokens": 250,
        "reasoning": {"exclude": True},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"KNOWLEDGE_CONTEXT: {context_text}\n\n"
                    f"RISK_CONTEXT: {risk_text}\n\n"
                    f"USER_QUESTION: {user_message}"
                ),
            },
        ],
    }

    try:
        response = requests.post(
            LLM_API_URL,
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=timeout_seconds,
        )
        response.raise_for_status()
        response_data = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise AssistantServiceError("The LLM provider request failed.") from exc

    if not isinstance(response_data, dict):
        raise AssistantServiceError("The LLM provider returned an invalid response.")
    answer = _extract_openrouter_text(response_data)
    if not answer:
        raise AssistantServiceError(
            "The LLM provider returned reasoning without a user-facing answer."
        )
    return answer


def ask_dengue_assistant(
    user_message: str, knowledge_context: str | None = None, risk_context: dict | None = None
) -> str:
    """Return an LLM generated response based purely on the provided knowledge context and risk context."""
    if not isinstance(user_message, str) or not user_message.strip():
        raise ValueError("user_message must be a non-empty string.")

    if LLM_PROVIDER == "openrouter":
        return _ask_openrouter(user_message.strip(), knowledge_context, risk_context)

    raise AssistantConfigurationError(
        f"Unsupported LLM_PROVIDER: {LLM_PROVIDER or '(empty)'}"
    )
