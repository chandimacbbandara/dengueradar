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


# ── Fallback formatter ─────────────────────────────────────────────────────────

def _prediction_response(data: dict) -> str:
    zone = data.get("moh_zone", "Unknown")
    district = data.get("district", "")
    cases = data.get("predicted_cases", 0)
    risk = (data.get("risk_level") or "unknown").lower()
    emoji = _risk_emoji(risk)
    area = f"{zone} ({district})" if district and district != "Unknown" else zone

    return (
        f"📍 *{area}*\n\n"
        f"{emoji} *Risk Level: {risk.upper()}*\n"
        f"🦟 Predicted Cases (next week): *{cases}*\n\n"
        f"⚡ _Powered by DengueRadar AI_"
    )


# ── Public entry point ─────────────────────────────────────────────────────────

def chat_response(message: str) -> str:
    """Return a response string for a user message."""
    # 1. Try to extract a location to fetch risk data
    identifier, label = _extract_location(message)
    
    data = None
    if identifier:
        data = _fetch_prediction(identifier)

    # 2. Retrieve knowledge base context for all queries
    from rag_service import retrieve_knowledge
    from llm_service import ask_dengue_assistant
    
    context = retrieve_knowledge(message)
    
    # 3. Ask the RAG assistant to handle the response entirely
    try:
        return ask_dengue_assistant(message, knowledge_context=context, risk_context=data)
    except Exception as e:
        logger.error("[ChatService] Failed to get LLM response: %s", e)
        
        # If the LLM is down but we successfully fetched prediction data, fallback to basic rule-based formatting
        if data:
            return _prediction_response(data)
            
        return "I'm sorry, I'm having trouble connecting to the AI assistant right now. Please try again later."


