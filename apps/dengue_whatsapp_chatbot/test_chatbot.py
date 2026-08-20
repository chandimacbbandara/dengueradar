"""Local regression tests for the chatbot and Flask/Vonage boundaries."""

import unittest
from unittest.mock import patch

from app import app
from chatbot import (
    ABOUT_MESSAGE,
    HELP_MESSAGE,
    INVALID_MOH_MESSAGE,
    INVALID_OPTION_MESSAGE,
    LANGUAGE_MENU,
    MESSAGES,
    WELCOME_MESSAGE,
    process_message,
    user_sessions,
)
from llm_service import AssistantServiceError
from prediction_service import get_dengue_prediction
from vonage_service import send_whatsapp_message


class ChatbotTests(unittest.TestCase):
    def setUp(self) -> None:
        user_sessions.clear()
        self.phone = "94770000000"

    def select_english(self) -> None:
        process_message(self.phone, "Hi")
        process_message(self.phone, "1")

    def test_prediction_conversation(self) -> None:
        self.assertEqual(process_message(self.phone, "Hi"), LANGUAGE_MENU)
        self.assertEqual(process_message(self.phone, "1"), WELCOME_MESSAGE)
        self.assertEqual(
            process_message(self.phone, "1"), "Please enter your MOH area code."
        )
        self.assertEqual(process_message(self.phone, "abc"), INVALID_MOH_MESSAGE)

        reply = process_message(self.phone, "102")

        self.assertIn("MOH Area: 102", reply)
        self.assertIn("Predicted Dengue Cases: 25", reply)
        self.assertIn("🟠 MODERATE", reply)

    def test_risk_and_menu_options(self) -> None:
        self.select_english()
        self.assertEqual(
            process_message(self.phone, "2"), "Please enter your MOH area code."
        )
        self.assertIn("🔴 HIGH", process_message(self.phone, "103"))
        self.assertEqual(process_message(self.phone, "3"), ABOUT_MESSAGE)
        self.assertEqual(process_message(self.phone, "4"), HELP_MESSAGE)
        self.assertEqual(process_message(self.phone, "7"), INVALID_OPTION_MESSAGE)

    def test_menu_command_resets_pending_request(self) -> None:
        self.select_english()
        process_message(self.phone, "1")
        self.assertEqual(process_message(self.phone, "MENU"), WELCOME_MESSAGE)

    def test_sinhala_conversation_and_language_change(self) -> None:
        self.assertEqual(process_message(self.phone, "Hi"), LANGUAGE_MENU)
        self.assertEqual(process_message(self.phone, "2"), MESSAGES["si"]["welcome"])
        self.assertEqual(process_message(self.phone, "1"), MESSAGES["si"]["enter_moh"])

        reply = process_message(self.phone, "103")

        self.assertIn("MOH ප්‍රදේශය: 103", reply)
        self.assertIn("🔴 ඉහළ", reply)
        self.assertEqual(process_message(self.phone, "LANGUAGE"), LANGUAGE_MENU)
        self.assertEqual(process_message(self.phone, "1"), WELCOME_MESSAGE)

    def test_tamil_risk_conversation(self) -> None:
        process_message(self.phone, "Hi")
        self.assertEqual(process_message(self.phone, "3"), MESSAGES["ta"]["welcome"])
        self.assertEqual(process_message(self.phone, "2"), MESSAGES["ta"]["enter_moh"])

        reply = process_message(self.phone, "101")

        self.assertIn("MOH பகுதி: 101", reply)
        self.assertIn("🟢 குறைவு", reply)

    def test_help_includes_prevention_and_medical_guidance(self) -> None:
        expected_guidance = {
            "1": ("Reduce mosquito breeding", "urgent medical care"),
            "2": ("මදුරුවන් බෝවන ස්ථාන", "හදිසි වෛද්‍ය ප්‍රතිකාර"),
            "3": ("கொசு இனப்பெருக்க இடங்களைக்", "அவசர மருத்துவச் சிகிச்சை"),
        }

        for language_choice, phrases in expected_guidance.items():
            with self.subTest(language_choice=language_choice):
                user_sessions.clear()
                process_message(self.phone, "Hi")
                process_message(self.phone, language_choice)
                reply = process_message(self.phone, "4")

                self.assertIn(phrases[0], reply)
                self.assertIn(phrases[1], reply)
                self.assertIn("MENU", reply)
                self.assertIn("LANGUAGE", reply)

    @patch("chatbot.ask_dengue_assistant", return_value="Dengue information")
    def test_free_text_question_works_without_menu(self, assistant_mock) -> None:
        reply = process_message(self.phone, "How can I prevent dengue?")

        self.assertEqual(reply, "Dengue information")
        assistant_mock.assert_called_once_with(
            "How can I prevent dengue?", risk_context=None
        )
        self.assertEqual(user_sessions[self.phone]["state"], "MAIN_MENU")

    @patch("chatbot.ask_dengue_assistant", return_value="Risk explanation")
    def test_free_text_moh_question_uses_prediction_context(
        self, assistant_mock
    ) -> None:
        reply = process_message(self.phone, "Explain dengue cases for MOH 102")

        self.assertEqual(reply, "Risk explanation")
        assistant_mock.assert_called_once_with(
            "Explain dengue cases for MOH 102",
            risk_context={
                "area": "MOH 102",
                "predicted_cases": 25,
                "risk_level": "MODERATE",
                "data_status": "DEMO / MOCK DATA",
            },
        )

    @patch(
        "chatbot.ask_dengue_assistant",
        side_effect=AssistantServiceError("provider down"),
    )
    def test_free_text_llm_failure_has_safe_fallback(self, _assistant_mock) -> None:
        reply = process_message(self.phone, "What is dengue?")
        self.assertEqual(reply, MESSAGES["en"]["assistant_unavailable"])

    def test_demo_prediction_shape(self) -> None:
        self.assertEqual(
            get_dengue_prediction("101"),
            {
                "moh_code": "101",
                "predicted_cases": 8,
                "risk_level": "LOW",
                "data_status": "DEMO / MOCK DATA",
            },
        )


class FlaskWebhookTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = app.test_client()

    def test_health_check(self) -> None:
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Dengue WhatsApp Chatbot", response.data)

    def test_status_webhook_acknowledges_with_200(self) -> None:
        response = self.client.post("/status", json={"status": "delivered"})
        self.assertEqual(response.status_code, 200)

    def test_ignored_inbound_payloads_are_acknowledged_with_200(self) -> None:
        cases = (
            {"channel": "sms", "from": "94770000000", "text": "Hi"},
            {"channel": "whatsapp", "from": "94770000000"},
        )
        for payload in cases:
            with self.subTest(payload=payload):
                response = self.client.post("/inbound", json=payload)
                self.assertEqual(response.status_code, 200)

    @patch("app.send_whatsapp_message", return_value={"message_uuid": "test-id"})
    @patch("app.process_message", return_value="reply")
    def test_inbound_message_sends_reply(self, process_mock, send_mock) -> None:
        response = self.client.post(
            "/inbound",
            json={
                "channel": "whatsapp",
                "from": "94770000000",
                "text": "Hi",
            },
        )

        self.assertEqual(response.status_code, 200)
        process_mock.assert_called_once_with("94770000000", "Hi")
        send_mock.assert_called_once_with("94770000000", "reply")

    @patch("app.send_whatsapp_message", side_effect=RuntimeError("test failure"))
    def test_send_failure_returns_500(self, _send_mock) -> None:
        response = self.client.post(
            "/inbound",
            json={
                "channel": "whatsapp",
                "from": "94770000000",
                "text": "Hi",
            },
        )
        self.assertEqual(response.status_code, 500)


class VonageServiceTests(unittest.TestCase):
    @patch("vonage_service.requests.post")
    @patch("vonage_service._validate_configuration")
    def test_outbound_request(self, _validate_mock, post_mock) -> None:
        post_mock.return_value.json.return_value = {"message_uuid": "test-id"}

        result = send_whatsapp_message("94770000000", "hello")

        self.assertEqual(result, {"message_uuid": "test-id"})
        post_mock.return_value.raise_for_status.assert_called_once_with()
        _, kwargs = post_mock.call_args
        self.assertEqual(kwargs["json"]["to"], "94770000000")
        self.assertEqual(kwargs["json"]["channel"], "whatsapp")
        self.assertEqual(kwargs["json"]["message_type"], "text")
        self.assertEqual(kwargs["timeout"], 15)


if __name__ == "__main__":
    unittest.main()
