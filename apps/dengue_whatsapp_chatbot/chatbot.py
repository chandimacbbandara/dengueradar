"""Menu and free-text conversation logic for the Dengue WhatsApp chatbot."""

import logging
import re

from language_messages import LANGUAGE_MENU, MESSAGES
from llm_service import AssistantServiceError, ask_dengue_assistant
from prediction_service import get_dengue_prediction


logger = logging.getLogger(__name__)

SELECTING_LANGUAGE = "SELECTING_LANGUAGE"
MAIN_MENU = "MAIN_MENU"
WAITING_FOR_MOH_FOR_PREDICTION = "WAITING_FOR_MOH_FOR_PREDICTION"
WAITING_FOR_MOH_FOR_RISK = "WAITING_FOR_MOH_FOR_RISK"
DEFAULT_LANGUAGE = "en"

LANGUAGE_CHOICES = {
    "1": "en",
    "EN": "en",
    "ENGLISH": "en",
    "2": "si",
    "SI": "si",
    "SINHALA": "si",
    "සිංහල": "si",
    "3": "ta",
    "TA": "ta",
    "TAMIL": "ta",
    "தமிழ்": "ta",
}

# Prototype-only in-memory sessions, keyed by the sender's WhatsApp number.
# A restart clears conversation states and language choices. Use a shared
# database or Redis in production.
user_sessions: dict[str, dict[str, str]] = {}

# English aliases retained for callers that imported the original constants.
WELCOME_MESSAGE = MESSAGES["en"]["welcome"]
INVALID_OPTION_MESSAGE = MESSAGES["en"]["invalid_option"]
INVALID_MOH_MESSAGE = MESSAGES["en"]["invalid_moh"]
ABOUT_MESSAGE = MESSAGES["en"]["about"]
HELP_MESSAGE = MESSAGES["en"]["help"]
ERROR_MESSAGE = MESSAGES["en"]["error"]

MOH_REFERENCE_PATTERN = re.compile(
    r"\bMOH(?:\s+(?:AREA|CODE))?\s*[:#-]?MOH 50 \s*(\d{1,10})\b",
    re.IGNORECASE,
)


def format_risk_level(risk_level: str, language: str = DEFAULT_LANGUAGE) -> str:
    """Add a traffic-light emoji and translate a normalized risk level."""
    normalized_risk = str(risk_level).strip().upper()
    text = MESSAGES.get(language, MESSAGES[DEFAULT_LANGUAGE])
    emojis = {"LOW": "🟢", "MODERATE": "🟠", "HIGH": "🔴"}
    label = text["risk"].get(normalized_risk, text["unknown"])
    return f"{emojis.get(normalized_risk, '⚪')} {label}"


def is_valid_moh_code(moh_code: str) -> bool:
    """Accept non-empty numeric MOH codes containing at most 10 digits."""
    return bool(moh_code) and moh_code.isdigit() and len(moh_code) <= 10


def _show_language_menu(phone_number: str) -> str:
    session = user_sessions.setdefault(phone_number, {})
    session["state"] = SELECTING_LANGUAGE
    return LANGUAGE_MENU


def _show_main_menu(phone_number: str) -> str:
    session = user_sessions.setdefault(phone_number, {})
    language = session.get("language", DEFAULT_LANGUAGE)
    session.update({"state": MAIN_MENU, "language": language})
    return MESSAGES[language]["welcome"]


def _format_prediction(prediction: dict, language: str) -> str:
    text = MESSAGES[language]
    zone_display = prediction.get('moh_zone') or prediction['moh_code']
    district = prediction.get('district', '')
    area_display = f"{zone_display} ({district})" if district and district != 'Unknown' else zone_display
    return f"""🦟 {text['forecast_title']}

{text['moh_area']}: {area_display}

{text['predicted_cases']}: {prediction['predicted_cases']}

{text['risk_level']}: {format_risk_level(prediction['risk_level'], language)}

{text['forecast_note']}

{text['demo_note']}

{text['menu_hint']}"""


def _format_risk(prediction: dict, language: str) -> str:
    text = MESSAGES[language]
    zone_display = prediction.get('moh_zone') or prediction['moh_code']
    district = prediction.get('district', '')
    area_display = f"{zone_display} ({district})" if district and district != 'Unknown' else zone_display
    return f"""📍 {text['moh_area']}: {area_display}

{text['risk_title']}:

{format_risk_level(prediction['risk_level'], language)}

{text['predicted_cases']}: {prediction['predicted_cases']}

{text['demo_note']}

{text['menu_hint']}"""


def _process_moh_code(
    phone_number: str, message: str, state: str, language: str
) -> str:
    if not is_valid_moh_code(message):
        return MESSAGES[language]["invalid_moh"]

    prediction = get_dengue_prediction(message)
    # Preserve the language when returning to a menu-ready state.
    user_sessions[phone_number]["state"] = MAIN_MENU

    if state == WAITING_FOR_MOH_FOR_PREDICTION:
        return _format_prediction(prediction, language)
    return _format_risk(prediction, language)


def _extract_moh_reference(message: str) -> str | None:
    """Extract an explicitly labelled MOH code from a natural-language message."""
    match = MOH_REFERENCE_PATTERN.search(message)
    return match.group(1) if match else None


def _risk_context_from_prediction(prediction: dict) -> dict:
    """Convert trusted prediction output to the LLM's structured context."""
    context = {
        "area": f"MOH {prediction['moh_code']}",
        "predicted_cases": prediction["predicted_cases"],
        "risk_level": prediction["risk_level"],
    }
    if prediction.get("data_status"):
        context["data_status"] = prediction["data_status"]
    return context


def _process_free_text(phone_number: str, message: str, language: str) -> str:
    """Answer a dengue question through the LLM, grounded when MOH is explicit."""
    user_sessions.setdefault(phone_number, {}).update(
        {"state": MAIN_MENU, "language": language}
    )

    risk_context = None
    prediction = None
    moh_code = _extract_moh_reference(message)
    if moh_code is not None:
        prediction = get_dengue_prediction(moh_code)
        risk_context = _risk_context_from_prediction(prediction)

    try:
        # The sender's phone number is intentionally never sent to the LLM.
        return ask_dengue_assistant(message, risk_context=risk_context)
    except AssistantServiceError:
        logger.exception("WhatsApp dengue assistant is unavailable")
        if prediction is not None:
            return _format_risk(prediction, language)
        return MESSAGES[language]["assistant_unavailable"]


def process_message(phone_number: str, message: str) -> str:
    """Process one incoming message and return a localized reply."""
    sender = (phone_number or "unknown-user").strip()

    try:
        cleaned_message = (message or "").strip()
        command = cleaned_message.upper()
        session = user_sessions.get(sender)

        if command in {"LANGUAGE", "LANG", "භාෂාව", "மொழி"}:
            return _show_language_menu(sender)

        if command in {"HI", "HELLO", "START"}:
            if session and session.get("language") in MESSAGES:
                return _show_main_menu(sender)
            return _show_language_menu(sender)

        if session is None:
            if command.isdigit():
                return _show_language_menu(sender)
            return _process_free_text(sender, cleaned_message, DEFAULT_LANGUAGE)

        state = session.get("state", SELECTING_LANGUAGE)

        if state == SELECTING_LANGUAGE:
            language = LANGUAGE_CHOICES.get(command)
            if language is None:
                if command.isdigit():
                    return LANGUAGE_MENU
                return _process_free_text(sender, cleaned_message, DEFAULT_LANGUAGE)
            session.update({"state": MAIN_MENU, "language": language})
            return MESSAGES[language]["welcome"]

        language = session.get("language", DEFAULT_LANGUAGE)

        # MENU works globally, including while waiting for an MOH code.
        if command == "MENU":
            return _show_main_menu(sender)

        if state in {
            WAITING_FOR_MOH_FOR_PREDICTION,
            WAITING_FOR_MOH_FOR_RISK,
        }:
            return _process_moh_code(sender, cleaned_message, state, language)

        if command == "1":
            session["state"] = WAITING_FOR_MOH_FOR_PREDICTION
            return MESSAGES[language]["enter_moh"]

        if command == "2":
            session["state"] = WAITING_FOR_MOH_FOR_RISK
            return MESSAGES[language]["enter_moh"]

        if command == "3":
            return MESSAGES[language]["about"]

        if command == "4":
            return MESSAGES[language]["help"]

        if command.isdigit():
            return MESSAGES[language]["invalid_option"]
        return _process_free_text(sender, cleaned_message, language)

    except Exception:
        logger.exception("Unexpected error while processing chatbot message")
        language = user_sessions.get(sender, {}).get("language", DEFAULT_LANGUAGE)
        return MESSAGES.get(language, MESSAGES[DEFAULT_LANGUAGE])["error"]
