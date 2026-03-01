"""
WhatsApp Notification Service
==============================
Sends WhatsApp messages via the Meta Cloud API (or logs them in dev mode).

For now, this sends simple messages. In production, configure:
  - WHATSAPP_ACCESS_TOKEN
  - WHATSAPP_PHONE_NUMBER_ID
  - WHATSAPP_DEFAULT_RECIPIENTS
"""
from __future__ import annotations

import requests
from typing import Optional, List, Dict, Any

from app.config import (
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_DEFAULT_RECIPIENTS,
)


def _send_via_cloud_api(phone: str, message: str) -> dict:
    """Send a text message via Meta WhatsApp Cloud API."""
    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        return {"success": False, "error": "WhatsApp Cloud API not configured"}

    url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        return {"success": True, "response": resp.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


def send_message(
    message: str,
    to: Optional[str] = None,
    recipients: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Send a WhatsApp message to one or more recipients.

    Args:
        message: text to send
        to: single phone number (e.g. "+212612345678")
        recipients: list of phone numbers

    Returns:
        dict with success status and details
    """
    targets = []
    if to:
        targets.append(to)
    if recipients:
        targets.extend(recipients)
    if not targets:
        targets = WHATSAPP_DEFAULT_RECIPIENTS

    if not targets:
        # Dev mode — just log
        print(f"📱 [WhatsApp DEV] No recipients configured. Message: {message}")
        return {
            "success": True,
            "dev_mode": True,
            "message": message,
            "sent_count": 0,
            "results": [{"status": "logged_dev_mode", "message": message}],
        }

    results = []
    for phone in targets:
        result = _send_via_cloud_api(phone, message)
        results.append({"phone": phone, **result})

    sent_count = sum(1 for r in results if r.get("success"))

    return {
        "success": sent_count > 0 or len(targets) == 0,
        "sent_count": sent_count,
        "total_targets": len(targets),
        "results": results,
    }


def send_alert(
    device_id: str,
    event_type: str,
    data: dict,
) -> Dict[str, Any]:
    """
    Format and send an alert notification via WhatsApp.
    """
    message = (
        f"🚨 *IRRIGATION ALERT*\n\n"
        f"📌 Device: {device_id}\n"
        f"⚠ Event: {event_type}\n"
        f"📊 Details: {data}\n\n"
        f"Please check the dashboard immediately."
    )
    return send_message(message)
