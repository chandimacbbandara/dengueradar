"""Rule-based dengue chat service powered by the DengueRadar ML prediction API.

No external LLM required. Responses are grounded in:
  1. Live ML model predictions from the backend
  2. Curated dengue education content
"""

import re
import requests
import logging

from config import BACKEND_URL

logger = logging.getLogger(__name__)

TIMEOUT = 8

# ── Zone/area keyword extractor ────────────────────────────────────────────────

import json
import os

ZONES_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "src", "data", "mohZoneIndex.json")
try:
    with open(ZONES_PATH, "r") as f:
        zones_data = json.load(f)
    KNOWN_ZONES = [v["zoneName"].lower() for v in zones_data.values()]
    KNOWN_ZONES.extend(["colombo", "kandy", "galle", "gampaha", "kalutara", "matara", "kurunegala"])
except Exception as e:
    logger.error("Failed to load MOH zones: %s", e)
    KNOWN_ZONES = ["homagama", "colombo"] # fallback

MOH_CODE_PATTERN = re.compile(r'\b(\d{1,3})\b')
# Sort by length descending to match longest phrases first (e.g., "Kalmunai north" before "Kalmunai")
KNOWN_ZONES = sorted(list(set(KNOWN_ZONES)), key=len, reverse=True)
ZONE_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(z) for z in KNOWN_ZONES) + r')\b',
    re.IGNORECASE,
)


def _extract_location(message: str):
    """Return (moh_code_or_name, display_label) or (None, None)."""
    # Explicit "MOH 50" / "MOH area 50"
    m = re.search(r'\bmoh\s*(?:area|code|zone)?\s*[:#-]?\s*(\d{1,3})\b', message, re.IGNORECASE)
    if m:
        return m.group(1), f"MOH {m.group(1)}"

    # Named zone
    m = ZONE_PATTERN.search(message)
    if m:
        return m.group(1), m.group(1).title()

    # Bare number ≤ 226
    m = MOH_CODE_PATTERN.search(message)
    if m and int(m.group(1)) <= 226:
        return m.group(1), f"MOH {m.group(1)}"

    return None, None


def _fetch_prediction(identifier: str) -> dict | None:
    """Call the backend chatbot predict endpoint and return its data dict or None."""
    try:
        url = f"{BACKEND_URL}/api/chatbot/predict/{identifier}"
        r = requests.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            payload = r.json()
            if payload.get("success"):
                return payload.get("data")
    except Exception as exc:
        logger.warning("[ChatService] Prediction fetch failed: %s", exc)
    return None


def _risk_emoji(level: str) -> str:
    return {"high": "🔴", "moderate": "🟠", "low": "🟢"}.get((level or "").lower(), "⚪")


# General knowledge logic is now handled by the RAG pipeline (llm_service + rag_service)


def _whatsapp_info() -> str:
    import os
    from config import BACKEND_URL # just to ensure imports are fine
    
    # We load it from os.getenv directly since config.py might not have it exposed yet
    wa_link = os.getenv("WHATSAPP_LINK", "https://wa.me/14157386102")
    return (
        "📱 *Connect on WhatsApp*\n\n"
        "You can chat with the DengueRadar AI directly on WhatsApp!\n\n"
        f"Click here to connect: {wa_link}\n\n"
        "_(Note: Since this is a Sandbox, you may need to send a specific 'Join' message first. Check your Vonage dashboard for the exact phrase.)_"
    )


def _prediction_response(data: dict) -> str:
    zone = data.get("moh_zone", "Unknown")
    district = data.get("district", "")
    cases = data.get("predicted_cases", 0)
    risk = (data.get("risk_level") or "unknown").lower()
    emoji = _risk_emoji(risk)
    area = f"{zone} ({district})" if district and district != "Unknown" else zone
    status = data.get("data_status", "")
    status_note = f"\n\n📌 _{status}_" if status else ""

    advice = {
        "high": (
            "⚠️ HIGH risk area. Take extra precautions:\n"
            "• Eliminate all standing water immediately\n"
            "• Use repellent and protective clothing\n"
            "• Monitor for fever — see a doctor promptly if symptoms appear"
        ),
        "moderate": (
            "⚠️ MODERATE risk. Stay vigilant:\n"
            "• Check your home for stagnant water weekly\n"
            "• Use mosquito repellent when outdoors"
        ),
        "low": (
            "✅ LOW risk currently. Keep it that way:\n"
            "• Maintain regular water container checks\n"
            "• Continue basic mosquito prevention"
        ),
    }.get(risk, "Follow standard dengue prevention guidelines.")

    return (
        f"📍 *{area}*\n\n"
        f"{emoji} *Risk Level: {risk.upper()}*\n"
        f"🦟 Predicted Cases (next week): *{cases}*\n\n"
        f"{advice}"
        f"{status_note}\n\n"
        f"⚡ _Powered by DengueRadar AI · LightGBM + XGBoost + CatBoost_"
    )


def _help_message() -> str:
    return (
        "🦟 *DengueRadar AI Assistant*\n\n"
        "I can help you with:\n\n"
        "📍 *Area Risk* — ask about a specific zone:\n"
        "  • \"What is the risk in Homagama?\"\n"
        "  • \"MOH 50 risk\"\n"
        "  • \"Dengue forecast Colombo\"\n\n"
        "🤒 *Symptoms* — type: symptoms\n"
        "🛡️ *Prevention* — type: prevention\n"
        "📱 *WhatsApp* — type: whatsapp\n"
        "ℹ️ *About the system* — type: about\n"
    )


# ── Intent classifier ──────────────────────────────────────────────────────────

def _classify(message: str) -> str:
    m = message.lower()
    if any(w in m for w in ["whatsapp", "link", "connect", "phone", "mobile"]):
        return "whatsapp_link"
    if any(w in m for w in ["help", "what can", "what do", "command", "option"]):
        return "help"
    if any(w in m for w in ["hi", "hello", "hey", "start", "hola"]):
        return "greeting"
    identifier, _ = _extract_location(message)
    if identifier or any(w in m for w in ["risk", "forecast", "predict", "case", "danger", "level", "safe", "moh", "area", "zone", "district"]):
        return "prediction"
    
    # Everything else goes to the RAG pipeline
    return "general_question"


# ── Public entry point ─────────────────────────────────────────────────────────

def chat_response(message: str) -> str:
    """Return a response string for a user message."""
    intent = _classify(message)

    if intent == "greeting":
        return (
            "👋 Hello! I'm the DengueRadar AI Assistant.\n\n"
            "Ask me about dengue risk in your area, symptoms, or prevention tips.\n\n"
            "Try: *\"What is the risk in Homagama?\"*"
        )

    if intent == "help":
        return _help_message()
        
    if intent == "whatsapp_link":
        return _whatsapp_info()

    if intent == "general_question":
        from rag_service import retrieve_knowledge
        from llm_service import ask_dengue_assistant
        
        context = retrieve_knowledge(message)
        try:
            return ask_dengue_assistant(message, knowledge_context=context)
        except Exception as e:
            logger.error("[ChatService] Failed to get LLM response: %s", e)
            return "I'm sorry, I'm having trouble answering that right now. Please try again later."

    identifier, label = _extract_location(message)

    if identifier:
        data = _fetch_prediction(identifier)
        if data:
            from llm_service import ask_dengue_assistant
            try:
                # Pass the prediction data to the LLM to format the response naturally as an MOH expert
                return ask_dengue_assistant(message, knowledge_context=None, risk_context=data)
            except Exception as e:
                logger.error("[ChatService] Failed to get LLM prediction response: %s", e)
                # Fallback to the strict rule-based format if the LLM fails
                return _prediction_response(data)
        return (
            f"⚠️ Could not fetch prediction for *{label}*.\n\n"
            "The backend service may be unavailable or the zone was not found."
        )

    # No location detected — ask for clarification
    return (
        "🦟 I can check dengue risk for any MOH zone in Sri Lanka!\n\n"
        "Please tell me the area name or MOH code, for example:\n"
        "  • *\"What is the risk in Homagama?\"*\n"
        "  • *\"MOH 50\"*\n"
        "  • *\"Dengue forecast Colombo\"*\n\n"
        "Or ask about *symptoms*, *prevention*, or type *help*."
    )
