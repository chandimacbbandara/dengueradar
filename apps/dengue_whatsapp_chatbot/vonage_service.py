"""Small integration layer for sending Vonage Sandbox WhatsApp messages."""

import requests
from requests.auth import HTTPBasicAuth

from config import (
    VONAGE_API_KEY,
    VONAGE_API_SECRET,
    VONAGE_MESSAGES_URL,
    VONAGE_SANDBOX_NUMBER,
)


class VonageConfigurationError(RuntimeError):
    """Raised when required Vonage Sandbox settings are missing."""


def _validate_configuration() -> None:
    missing_names = []
    if not VONAGE_API_KEY:
        missing_names.append("VONAGE_API_KEY")
    if not VONAGE_API_SECRET:
        missing_names.append("VONAGE_API_SECRET")
    if not VONAGE_SANDBOX_NUMBER:
        missing_names.append("VONAGE_SANDBOX_NUMBER")

    if missing_names:
        missing_text = ", ".join(missing_names)
        raise VonageConfigurationError(
            f"Missing required environment variables: {missing_text}"
        )


def send_whatsapp_message(recipient: str, message_text: str) -> dict:
    """Send one text message through the Vonage WhatsApp Sandbox."""
    _validate_configuration()

    payload = {
        "from": VONAGE_SANDBOX_NUMBER,
        "to": str(recipient).strip(),
        "channel": "whatsapp",
        "message_type": "text",
        "text": message_text,
    }

    response = requests.post(
        VONAGE_MESSAGES_URL,
        json=payload,
        auth=HTTPBasicAuth(VONAGE_API_KEY, VONAGE_API_SECRET),
        headers={"Accept": "application/json"},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()
