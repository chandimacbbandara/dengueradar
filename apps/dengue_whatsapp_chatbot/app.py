"""Flask webhooks for the Vonage WhatsApp Sandbox."""

import json
import logging

from flask import Flask, Response, jsonify, render_template, request
from flask_cors import CORS

from chatbot import process_message
from chat_service import chat_response
from config import FLASK_DEBUG, FLASK_HOST, FLASK_PORT
from vonage_service import send_whatsapp_message


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"])


@app.get("/")
def health_check() -> str:
    """Simple route used to confirm that the server is running."""
    return "Dengue WhatsApp Chatbot with Vonage Sandbox is running."


@app.get("/chat")
def web_chat() -> str:
    """Display the separate browser-based dengue assistant."""
    return render_template("chat.html")


@app.post("/api/chat")
def web_chat_api() -> Response:
    """Answer a dengue question using ML model predictions."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    message = data.get("message")
    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "The message must be a non-empty string."}), 400
    if len(message.strip()) > 2000:
        return jsonify({"error": "The message must be 2000 characters or fewer."}), 400

    try:
        reply = chat_response(message.strip())
    except Exception:
        logger.exception("Chat service error")
        reply = "⚠️ Something went wrong. Please try again."

    return jsonify({"reply": reply})


@app.post("/inbound")
def inbound_message() -> Response:
    """Receive a Vonage message, process it, and send the WhatsApp reply."""
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        logger.warning("Ignoring inbound webhook with an invalid JSON body")
        return Response(status=200)

    sender = str(data.get("from", "")).strip()
    message = str(data.get("text", "")).strip()
    channel = str(data.get("channel", "")).strip().lower()

    if channel and channel != "whatsapp":
        logger.warning("Ignoring inbound message from channel %s", channel)
        return Response(status=200)

    if not sender or not message:
        logger.warning("Ignoring inbound webhook without text or sender")
        return Response(status=200)

    try:
        reply_text = process_message(sender, message)
        result = send_whatsapp_message(sender, reply_text)
        logger.info(
            "Sent WhatsApp reply to %s with message UUID %s",
            sender,
            result.get("message_uuid", "unknown"),
        )
    except Exception:
        # A non-success response tells Vonage that delivery did not complete.
        logger.exception("Failed to process or reply to an inbound message")
        return Response("Failed to process message", status=500)

    # Vonage Sandbox retries webhook notifications unless it receives HTTP 200.
    return Response(status=200)


@app.post("/status")
def message_status() -> Response:
    """Receive delivery updates from Vonage and log them for debugging."""
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        logger.warning("Ignoring status webhook with an invalid JSON body")
        return Response(status=200)

    logger.info("Vonage status webhook: %s", json.dumps(data, ensure_ascii=False))
    return Response(status=200)


if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
