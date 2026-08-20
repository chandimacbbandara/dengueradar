# Dengue WhatsApp Chatbot — Vonage Sandbox

This project is the WhatsApp interface for the Dengue Prediction System. It
uses Python, Flask, the free Vonage Messages API Sandbox, ngrok, and simple
in-memory sessions. It intentionally contains no machine-learning code.

## Architecture

```text
WhatsApp user
      ↓
Vonage WhatsApp Sandbox
      ↓  JSON POST /inbound
Flask webhook
      ↓
process_message(phone_number, message)
      ↓
get_dengue_prediction(moh_code)
      ↓
Vonage Sandbox Messages API
      ↓
WhatsApp user
```

Vonage and the prediction implementation are separated from the conversation
logic. This means the menus do not need to change when the team's real
prediction module is connected.

## Folder structure

```text
dengue_whatsapp_chatbot/
├── app.py
├── chatbot.py
├── language_messages.py
├── prediction_service.py
├── vonage_service.py
├── config.py
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
└── README.md
```

## File purposes

- `app.py`: receives Vonage inbound and delivery-status webhooks.
- `chatbot.py`: handles menus, language choice, validation, and sessions.
- `language_messages.py`: contains English, Sinhala, and Tamil reply text.
- `prediction_service.py`: replaceable prediction integration boundary.
- `vonage_service.py`: sends text replies through the Vonage Sandbox API.
- `config.py`: loads Vonage and Flask environment variables.
- `requirements.txt`: Flask, Requests, and python-dotenv dependencies.
- `.env`: local credentials; this file is ignored by Git.
- `.env.example`: safe settings template without real credentials.
- `.gitignore`: excludes secrets, environments, and generated files.

## Demo prediction data

`prediction_service.py` currently uses:

| MOH code | Cases | Risk |
|---|---:|---|
| 101 | 8 | LOW |
| 102 | 25 | MODERATE |
| 103 | 54 | HIGH |
| Other numeric codes | 25 | MODERATE |

**DEMO / MOCK DATA — REPLACE DURING INTEGRATION**

## 1. Create a Vonage account and Sandbox

1. Create or sign in to a [Vonage API account](https://dashboard.nexmo.com/).
2. In the dashboard, open **Messaging** and then **Messages Sandbox**.
3. Find WhatsApp and select **Add to sandbox** if it is not active.
4. Scan the displayed QR code with your phone, or open its WhatsApp link.
5. Send the pre-filled join message exactly as shown.
6. Wait for confirmation that your number has been allow-listed.
7. Note the Sandbox WhatsApp number displayed in the dashboard.
8. Find your API key and secret in the dashboard's API settings.

The Sandbox is for development, not production. Vonage currently documents a
fair-use limit of 100 free Sandbox messages per month. Only allow-listed numbers
can participate, and WhatsApp's messaging-window rules still apply.

## 2. Configure `.env`

Open `.env` and enter the values from the Vonage dashboard:

```dotenv
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_SANDBOX_NUMBER=14157386102
VONAGE_MESSAGES_URL=https://messages-sandbox.nexmo.com/v1/messages
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=true
```

Use the exact Sandbox number displayed by Vonage. Vonage's examples normally
use digits only, including the country code, without `+`, spaces, or dashes.

Never upload `.env`, reveal the API secret in screenshots, or paste credentials
into source code. `.env.example` shows the required names safely.

## 3. Create the virtual environment

From this project folder:

```bash
python3 -m venv venv
```

Activate it on macOS/Linux:

```bash
source venv/bin/activate
```

On Windows Command Prompt:

```bat
venv\Scripts\activate
```

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

## 4. Install dependencies

```bash
python -m pip install -r requirements.txt
```

The project uses only:

```text
Flask>=3.0,<4.0
python-dotenv>=1.0,<2.0
requests>=2.32,<3.0
```

Only the packages listed above are required for this Sandbox version.

## 5. Run Flask

```bash
python app.py
```

Open <http://127.0.0.1:5000/>. The response should be:

```text
Dengue WhatsApp Chatbot with Vonage Sandbox is running.
```

The routes are:

- `GET /`: health check.
- `POST /inbound`: inbound Vonage WhatsApp webhook.
- `POST /status`: Vonage delivery-status webhook.

Successful webhook requests return HTTP 200 so the Vonage Sandbox does not
retry them.

Run the local regression tests with:

```bash
python -m unittest -v
```

## 6. Start ngrok

Keep Flask running and open a second terminal:

```bash
ngrok http 5000
```

If ngrok displays:

```text
https://example.ngrok-free.app
```

the complete webhook URLs are:

```text
Inbound: https://example.ngrok-free.app/inbound
Status:  https://example.ngrok-free.app/status
```

The free ngrok URL may change after a restart.

## 7. Configure Vonage webhooks

1. Return to **Messaging → Messages Sandbox** in the Vonage dashboard.
2. Find the Sandbox webhook settings.
3. Set **Inbound webhook URL** to the ngrok address ending in `/inbound`.
4. Set **Status webhook URL** to the ngrok address ending in `/status`.
5. Use HTTP `POST` if the dashboard provides a method choice.
6. Save the webhook settings.

Do not enter `127.0.0.1` in Vonage. It must receive the public HTTPS ngrok URL.

## 8. Test from WhatsApp

Use this order:

1. Run Flask.
2. Run ngrok.
3. Save the current ngrok `/inbound` and `/status` URLs in Vonage.
4. Join the WhatsApp Sandbox from the phone if necessary.
5. Send `Hi` to the displayed Vonage Sandbox WhatsApp number.
6. Select English, Sinhala, or Tamil.
7. Select an option and enter a numeric MOH code.

Example:

```text
User: Hi

Bot: 🌐 Select your language / ඔබගේ භාෂාව තෝරන්න / உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்
     1️⃣ English
     2️⃣ සිංහල
     3️⃣ தமிழ்

User: 1

Bot: 🦟 Welcome to the Dengue Prediction System
     1️⃣ Predict Dengue Cases
     2️⃣ Check Dengue Risk
     3️⃣ About the System
     4️⃣ Help

User: 1
Bot:  Please enter your MOH area code.

User: 102
Bot:  🦟 Dengue Forecast
      MOH Area: 102
      Predicted Dengue Cases: 25
      Risk Level: 🟠 MODERATE
```

Other useful tests:

```text
How can I prevent dengue?          → asks the LLM directly; no menu required
Explain dengue cases for MOH 102  → gets the trusted prediction, then asks the LLM to explain it
2          → asks for an MOH code and shows the risk response
3          → shows information about the system
4          → shows help
7          → shows the invalid-option message
abc        → is rejected when the bot is waiting for an MOH code
MENU       → returns to the main menu from any conversation state
LANGUAGE   → displays the language selector at any time
```

Free-text questions use OpenRouter, while numeric menu options remain available
as a fallback. Only an explicitly labelled code such as `MOH 102` is interpreted
as an area reference. The sender's WhatsApp phone number is never sent to the
LLM. If OpenRouter is unavailable, the bot returns a friendly message and the
menu-based prediction and risk features continue working.

Language choices are stored in the prototype's in-memory user session. A
Flask restart clears them. Use Redis or a database to persist preferences in
production. To edit translations, update `language_messages.py`; the internal
prediction values (`LOW`, `MODERATE`, and `HIGH`) remain unchanged.

## 9. Test chatbot logic without Vonage

This requires no API key, internet connection, ngrok, or WhatsApp account:

```bash
python
```

```python
from chatbot import process_message

phone = "94770000000"
print(process_message(phone, "Hi"))
print(process_message(phone, "1"))  # Select English
print(process_message(phone, "1"))  # Select prediction
print(process_message(phone, "102"))
```

Run all three calls in the same Python process so the in-memory session is
preserved.

## 10. How sessions work

`chatbot.py` stores prototype sessions in a dictionary:

```python
user_sessions["94770000000"] = {
    "state": "WAITING_FOR_MOH_FOR_PREDICTION",
    "language": "en"
}
```

Vonage's inbound `from` number becomes the key, so different phone numbers have
independent states. Restarting Flask clears all sessions. A production system
should replace this dictionary with Redis or a database, but that is outside
this academic prototype.

## 11. Connect the teammate's Python prediction function

The chatbot depends only on:

```python
get_dengue_prediction(moh_code)
```

If the teammate provides `predict_next_week`, replace only the contents of
`prediction_service.py`:

```python
from teammate_model import predict_next_week


def get_dengue_prediction(moh_code: str) -> dict:
    result = predict_next_week(moh_code)
    return {
        "moh_code": moh_code,
        "predicted_cases": int(result["prediction"]),
        "risk_level": str(result["risk"]).upper(),
    }
```

The return dictionary must contain `moh_code`, `predicted_cases`, and
`risk_level`. Risk should be `LOW`, `MODERATE`, or `HIGH`. No changes are needed
in `chatbot.py`, `vonage_service.py`, or `app.py`.

## 12. Connect a separate prediction REST API

If the teammate deploys `POST /predict`, change only `prediction_service.py`:

```python
import os

import requests


PREDICTION_API_URL = os.getenv(
    "PREDICTION_API_URL",
    "http://127.0.0.1:8000/predict",
)


def get_dengue_prediction(moh_code: str) -> dict:
    response = requests.post(
        PREDICTION_API_URL,
        json={"moh_code": moh_code},
        timeout=10,
    )
    response.raise_for_status()
    result = response.json()
    return {
        "moh_code": moh_code,
        "predicted_cases": int(result["predicted_cases"]),
        "risk_level": str(result["risk_level"]).upper(),
    }
```

Add `PREDICTION_API_URL` to `.env` and `.env.example`. Requests is already an
explicit dependency because the Vonage service uses it.

## 13. Web dengue assistant

The browser chatbot is separate from the WhatsApp flow:

```text
Browser -> GET /chat -> POST /api/chat -> llm_service.py -> LLM provider
```

`llm_service.py` owns the provider-specific request and the safety system
prompt. `app.py` only validates the web request and calls
`ask_dengue_assistant()`. The existing `/inbound` and `/status` route bodies,
`chatbot.py`, and `vonage_service.py` remain unchanged.

Add these values to the local `.env` file. Use a model available to your API
project; do not commit the API key.

```dotenv
LLM_PROVIDER=openrouter
LLM_API_KEY=your-server-side-key
LLM_MODEL=openai/gpt-4o-mini
LLM_API_URL=https://openrouter.ai/api/v1/chat/completions
LLM_TIMEOUT_SECONDS=30
```

### Test the LLM service independently

From the project directory, with the environment variables configured:

```bash
python -c 'from llm_service import ask_dengue_assistant; print(ask_dengue_assistant("How can I prevent dengue?"))'
```

Test an explanation using clearly supplied application data:

```bash
python -c 'from llm_service import ask_dengue_assistant; print(ask_dengue_assistant("Explain this result", {"area": "MOH 102", "predicted_cases": 38, "risk_level": "HIGH"}))'
```

### Test the API and browser

Start Flask with `python app.py`, then test a general question:

```bash
curl -sS -X POST http://127.0.0.1:5000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"How can I prevent dengue?"}'
```

Test authoritative risk context:

```bash
curl -sS -X POST http://127.0.0.1:5000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Explain this result","risk_context":{"area":"MOH 102","predicted_cases":38,"risk_level":"HIGH"}}'
```

Open `http://127.0.0.1:5000/chat` to use the web interface. The current UI
sends general questions only. A future prediction screen can include verified
`risk_context` in the same `/api/chat` request; the browser must not create or
guess that context itself.

### Regression and failure checks

Run all isolated tests without calling a real LLM or Vonage service:

```bash
python -m unittest discover -v
```

To verify the webhook boundaries manually, use non-delivery test payloads:

```bash
curl -i -X POST http://127.0.0.1:5000/status \
  -H 'Content-Type: application/json' -d '{"status":"delivered"}'

curl -i -X POST http://127.0.0.1:5000/inbound \
  -H 'Content-Type: application/json' \
  -d '{"channel":"sms","from":"test-user","text":"Hi"}'
```

Both should return HTTP 200. To test LLM failure handling, temporarily omit
`LLM_API_KEY`; `/api/chat` should return HTTP 503 with a friendly reply while
the health, `/inbound`, and `/status` routes continue working.

Checklist:

- Existing WhatsApp chatbot: covered by regression tests
- Vonage inbound webhook: covered by regression tests
- Vonage status webhook: covered by regression tests
- Web chatbot and validation: covered by web-route tests
- LLM request/response connection: mocked unit test plus independent live test
- General dengue questions: independent live test
- High-risk explanation: exact supplied context is tested
- Prevention advice: enforced by the system prompt and checked in live testing
- No invented area-risk data: missing-context instruction is tested
- LLM failure handling: friendly HTTP 503 is tested

## Troubleshooting

- No message arrives at Flask: check that Flask and ngrok are both running and
  that Vonage has the current ngrok `/inbound` URL.
- Flask reports missing environment variables: complete `.env`, save it, and
  restart Flask.
- Vonage returns `401`: check the API key and secret without adding quotes or
  spaces.
- Vonage returns `400`: check that the Sandbox number and recipient use the
  format shown in the dashboard.
- The phone receives nothing: confirm the phone joined the correct Sandbox and
  is still allow-listed.
- Duplicate requests: inspect Flask logs; Vonage retries webhooks that do not
  return a successful HTTP response.

## Presentation summary

> My module is the WhatsApp interface of the Dengue Prediction System. The
> Vonage WhatsApp Sandbox forwards incoming messages as JSON to a Flask webhook.
> The chatbot uses the sender's number to remember the current conversation
> step, validates the MOH code, and calls one independent prediction-service
> function. Flask then sends the reply through the Vonage Sandbox Messages API.
> The current results are clearly marked mock data. During team integration,
> only the prediction service is replaced by the real model or its REST API.

## Safety note

This is an academic prototype, not a medical diagnosis or official
public-health service. It should direct users to the appropriate health
authority for current guidance.
