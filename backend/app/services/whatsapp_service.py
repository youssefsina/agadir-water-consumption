"""
WhatsApp notification service — sends messages via WaSendAPI.
API docs: https://www.wasenderapi.com/api/send-message
"""
from __future__ import annotations

import logging
import re
from typing import List, Optional

import requests

from app.config import (
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_DEFAULT_RECIPIENTS,
)

logger = logging.getLogger(__name__)

WASENDERAPI_URL = "https://www.wasenderapi.com/api/send-message"


def _format_phone(phone: str) -> str:
    """Normalize to E.164: digits only, add + prefix for API."""
    digits = re.sub(r"[^\d]", "", phone)
    return f"+{digits}" if digits else ""


def send_message(
    message: str,
    to: Optional[str] = None,
    recipients: Optional[List[str]] = None,
) -> dict:
    """
    Send a WhatsApp text message via WaSendAPI.

    Args:
        message: Text to send.
        to: Single recipient phone (E.164, e.g. "+212612345678" or "212612345678").
        recipients: List of recipient phones. If provided, overrides `to`.

    Returns:
        {"success": bool, "results": list, "sent_count": int, "total_count": int}
    """
    if not WHATSAPP_ACCESS_TOKEN:
        return {
            "success": False,
            "results": [],
            "error": "WhatsApp not configured. Set WHATSAPP_ACCESS_TOKEN (WaSendAPI API key).",
        }

    phones: List[str] = []
    if recipients:
        phones = [_format_phone(r) for r in recipients if _format_phone(r)]
    elif to:
        p = _format_phone(to)
        if p:
            phones = [p]

    if not phones:
        return {
            "success": False,
            "results": [],
            "error": "No recipient specified. Provide 'to' or 'recipients' (E.164 format).",
        }

    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    results = []
    for phone in phones:
        payload = {"to": phone, "text": message[:4096]}
        try:
            resp = requests.post(WASENDERAPI_URL, headers=headers, json=payload, timeout=15)
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}

            if resp.status_code in (200, 201) and data.get("success"):
                msg_data = data.get("data", {})
                mid = msg_data.get("msgId") or msg_data.get("jid")
                results.append({"phone": phone, "success": True, "message_id": str(mid) if mid else None})
            else:
                err = data.get("message") or data.get("error") or resp.text
                results.append({"phone": phone, "success": False, "error": str(err)})
                logger.warning(f"WaSendAPI send failed to {phone}: {err}")

        except Exception as e:
            results.append({"phone": phone, "success": False, "error": str(e)})
            logger.exception(f"WaSendAPI send error to {phone}")

    success_count = sum(1 for r in results if r.get("success"))
    return {
        "success": success_count == len(results) and len(results) > 0,
        "results": results,
        "sent_count": success_count,
        "total_count": len(results),
    }


def send_alert(device_id: str, event_type: str, data: dict) -> dict:
    """
    Send an irrigation alert notification to configured recipients.
    Called when webhook receives alert events or AI detects anomalies.
    """
    import random
    zone = random.choice(["A", "B", "C", "D"])
    advice = "رد البال: كاين شي مشكل فالسقي، ضرب دويرة وتأكد من الماطريال."
    if "Leak" in event_type or "Burst" in event_type:
        advice = "رد البال: يقدر يكون شي تيو مطرطق ولا كيسيل. سير قلب الجعاب دالما فالبلاصة بالزربة!"
    elif "Over" in event_type:
        advice = "رد البال: الأرض فازكة بزاف. تأكد واش الماكينة حبسات ولا باقا خدامة باش مايخسرش الغرس!"
    elif "Under" in event_type:
        advice = "رد البال: الغرس راه ناشف وماكياخدش الما مزيان. المرجو مراقبة البومبا واش مسدودة ولا خاسرة!"
    
    msg = (
        f"⚠️ *إنذار من السقي الذكي*\n"
        f"📍 المنطقة (Zone): {zone}\n\n"
        f"الجهاز (Device): `{device_id}`\n"
        f"الحدث (Event): {event_type}\n"
        f"المعلومات (Data): {data}\n\n"
        f"💡 *نصيحة*: {advice}\n"
        f"عافاك طّل على النظام دالسقي دابا للمنطقة {zone}."
    )
    return send_message(msg, recipients=WHATSAPP_DEFAULT_RECIPIENTS or None)
