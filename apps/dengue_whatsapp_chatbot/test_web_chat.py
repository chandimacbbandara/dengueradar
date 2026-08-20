"""Tests for the web-only LLM assistant boundary."""

import unittest
from unittest.mock import patch

from app import app
from llm_service import (
    AssistantServiceError,
    RiskContextError,
    _ask_openrouter,
    _validate_risk_context,
)


class WebChatTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = app.test_client()

    def test_chat_page_loads(self) -> None:
        response = self.client.get("/chat")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Dengue guidance assistant", response.data)

    @patch("app.ask_dengue_assistant", return_value="Remove standing water.")
    def test_chat_api(self, assistant_mock) -> None:
        context = {
            "area": "MOH 102",
            "predicted_cases": 38,
            "risk_level": "HIGH",
        }
        response = self.client.post(
            "/api/chat", json={"message": "Explain this result", "risk_context": context}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"reply": "Remove standing water."})
        assistant_mock.assert_called_once_with(
            "Explain this result", risk_context=context
        )

    def test_chat_api_rejects_empty_message(self) -> None:
        response = self.client.post("/api/chat", json={"message": " "})
        self.assertEqual(response.status_code, 400)

    def test_risk_context_validation(self) -> None:
        with self.assertRaises(RiskContextError):
            _validate_risk_context(
                {"area": "MOH 102", "predicted_cases": 38, "risk_level": "UNKNOWN"}
            )

    @patch(
        "app.ask_dengue_assistant",
        side_effect=AssistantServiceError("provider down"),
    )
    def test_provider_failure_returns_friendly_503(self, _assistant_mock) -> None:
        response = self.client.post("/api/chat", json={"message": "What is dengue?"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("try again later", response.get_json()["reply"].lower())


class LLMServiceTests(unittest.TestCase):
    @patch("llm_service.LLM_MODEL", "test-model")
    @patch("llm_service.LLM_API_KEY", "test-key")
    @patch("llm_service.requests.post")
    def test_openrouter_request_preserves_authoritative_values(self, post_mock) -> None:
        post_mock.return_value.json.return_value = {
            "choices": [{"message": {"content": "Explanation"}}]
        }
        context = {
            "area": "MOH 102",
            "predicted_cases": 38,
            "risk_level": "HIGH",
        }

        self.assertEqual(_ask_openrouter("Explain it", context), "Explanation")

        payload = post_mock.call_args.kwargs["json"]
        self.assertIn(
            'RISK_CONTEXT: {"area":"MOH 102","predicted_cases":38,"risk_level":"HIGH"}',
            payload["messages"][1]["content"],
        )
        self.assertNotIn("test-key", str(payload))

    @patch("llm_service.LLM_MODEL", "test-model")
    @patch("llm_service.LLM_API_KEY", "test-key")
    @patch("llm_service.requests.post")
    def test_missing_risk_data_is_explicit(self, post_mock) -> None:
        post_mock.return_value.json.return_value = {
            "choices": [{"message": {"content": "No data available."}}]
        }

        _ask_openrouter("Is Colombo high risk?", None)

        payload = post_mock.call_args.kwargs["json"]
        self.assertIn(
            "no verified area-level risk data was supplied",
            payload["messages"][1]["content"],
        )


if __name__ == "__main__":
    unittest.main()
