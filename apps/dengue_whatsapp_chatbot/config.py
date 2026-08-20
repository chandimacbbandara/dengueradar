"""Application configuration loaded from environment variables."""

import os

from dotenv import load_dotenv


load_dotenv()

VONAGE_API_KEY = os.getenv("VONAGE_API_KEY", "").strip()
VONAGE_API_SECRET = os.getenv("VONAGE_API_SECRET", "").strip()
VONAGE_SANDBOX_NUMBER = os.getenv("VONAGE_SANDBOX_NUMBER", "").strip()
VONAGE_MESSAGES_URL = os.getenv(
    "VONAGE_MESSAGES_URL",
    "https://messages-sandbox.nexmo.com/v1/messages",
).strip()

# Web dengue assistant settings. These are deliberately separate from Vonage.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
LLM_MODEL = os.getenv("LLM_MODEL", "").strip()
LLM_API_URL = os.getenv(
    "LLM_API_URL", "https://openrouter.ai/api/v1/chat/completions"
).strip()
LLM_TIMEOUT_SECONDS = os.getenv("LLM_TIMEOUT_SECONDS", "30").strip()

FLASK_HOST = os.getenv("FLASK_HOST", "127.0.0.1")
FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() in {
    "1",
    "true",
    "yes",
    "on",
}

# DengueRadar backend API base URL
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000").rstrip("/")
