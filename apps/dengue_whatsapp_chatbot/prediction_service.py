"""Integration layer for dengue predictions from the DengueRadar backend API.

Calls the DengueRadar Node.js backend's /api/chatbot/predict/{moh_code} endpoint,
which in turn queries the live ML model predictions (LightGBM + XGBoost + CatBoost
ensemble). Falls back gracefully to a moderate risk estimate if the backend is
unreachable, so the chatbot never crashes.
"""

import logging
import requests

from config import BACKEND_URL

logger = logging.getLogger(__name__)

# Timeout for backend API calls (seconds)
_REQUEST_TIMEOUT = 10

# Fallback prediction used when the backend is unreachable or returns an error.
_FALLBACK_PREDICTION = {
    "predicted_cases": 0,
    "risk_level": "MODERATE",
    "data_status": "Live prediction service temporarily unavailable",
}


def _normalize_risk_level(raw: str) -> str:
    """Normalise any risk level string to LOW | MODERATE | HIGH."""
    mapping = {
        "low": "LOW",
        "moderate": "MODERATE",
        "medium": "MODERATE",
        "high": "HIGH",
        "alert": "HIGH",
        "warning": "HIGH",
        "watch": "MODERATE",
    }
    return mapping.get(str(raw).strip().lower(), "MODERATE")


def get_dengue_prediction(moh_code: str) -> dict:
    """Return a normalized prediction dictionary for one MOH area.

    Calls the DengueRadar backend for live ML model predictions.

    Returns:
        {
            "moh_code": str,
            "moh_zone": str,
            "district": str,
            "predicted_cases": int,
            "risk_level": "LOW" | "MODERATE" | "HIGH",
        }
    """
    normalized_code = str(moh_code).strip()

    try:
        url = f"{BACKEND_URL}/api/chatbot/predict/{normalized_code}"
        logger.info("[PredictionService] Calling backend: %s", url)

        response = requests.get(url, timeout=_REQUEST_TIMEOUT)

        # 404 = the MOH code is not in the database
        if response.status_code == 404:
            logger.warning(
                "[PredictionService] MOH code %s not found in backend",
                normalized_code,
            )
            return {
                "moh_code": normalized_code,
                "moh_zone": f"MOH {normalized_code}",
                "district": "Unknown",
                "predicted_cases": 0,
                "risk_level": "MODERATE",
                "data_status": f"MOH code {normalized_code} not recognised. Valid codes are 1-226.",
            }

        response.raise_for_status()
        payload = response.json()

        if not payload.get("success"):
            logger.warning(
                "[PredictionService] Backend returned failure for code %s: %s",
                normalized_code,
                payload.get("message"),
            )
            return {
                "moh_code": normalized_code,
                "moh_zone": f"MOH {normalized_code}",
                "district": "Unknown",
                **_FALLBACK_PREDICTION,
            }

        data = payload.get("data", {})
        risk_raw = data.get("risk_level", "moderate")

        result = {
            "moh_code": normalized_code,
            "moh_zone": data.get("moh_zone", f"MOH {normalized_code}"),
            "district": data.get("district", "Unknown"),
            "predicted_cases": int(data.get("predicted_cases", 0)),
            "risk_level": _normalize_risk_level(risk_raw),
        }

        # Include data_status only when the backend flags a caveat
        data_status = data.get("data_status")
        if data_status:
            result["data_status"] = data_status

        logger.info(
            "[PredictionService] Got prediction for %s (%s): %s cases, risk=%s",
            result["moh_zone"],
            result["district"],
            result["predicted_cases"],
            result["risk_level"],
        )
        return result

    except requests.exceptions.ConnectionError:
        logger.error(
            "[PredictionService] Backend unreachable at %s — using fallback", BACKEND_URL
        )
    except requests.exceptions.Timeout:
        logger.error("[PredictionService] Backend request timed out — using fallback")
    except Exception as exc:
        logger.exception("[PredictionService] Unexpected error: %s", exc)

    # Graceful fallback — chatbot continues to function
    return {
        "moh_code": normalized_code,
        "moh_zone": f"MOH {normalized_code}",
        "district": "Unknown",
        **_FALLBACK_PREDICTION,
    }
