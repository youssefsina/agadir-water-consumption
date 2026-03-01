"""
⚙️ Settings Router — WhatsApp contact management + notification preferences.
"""
from __future__ import annotations

from typing import Optional
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.supabase_client import supabase_client

router = APIRouter(prefix="/settings", tags=["Settings"])


# ── Schemas ──────────────────────────────────────────────

class WhatsAppContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Contact name")
    phone: str = Field(..., min_length=6, max_length=20, description="Phone in E.164, e.g. +212612345678")

class WhatsAppContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, min_length=6, max_length=20)
    active: Optional[bool] = None


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"[^\d]", "", phone)
    return f"+{digits}" if digits else ""


# ── Routes ───────────────────────────────────────────────

@router.get(
    "/whatsapp/contacts",
    summary="List all WhatsApp notification contacts",
)
async def list_contacts():
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        result = supabase_client.table("whatsapp_contacts").select("*").order("created_at", desc=True).execute()
        return {"contacts": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/whatsapp/contacts",
    summary="Add a WhatsApp notification contact",
)
async def add_contact(body: WhatsAppContactCreate):
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    phone = _normalize_phone(body.phone)
    if not phone or len(phone) < 7:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    try:
        result = supabase_client.table("whatsapp_contacts").insert({
            "name": body.name.strip(),
            "phone": phone,
            "active": True,
        }).execute()
        return {"status": "created", "contact": result.data[0] if result.data else None}
    except Exception as e:
        err_str = str(e)
        if "duplicate" in err_str.lower() or "unique" in err_str.lower():
            raise HTTPException(status_code=409, detail="Phone number already exists")
        raise HTTPException(status_code=500, detail=err_str)


@router.put(
    "/whatsapp/contacts/{contact_id}",
    summary="Update a WhatsApp contact",
)
async def update_contact(contact_id: int, body: WhatsAppContactUpdate):
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name.strip()
    if body.phone is not None:
        phone = _normalize_phone(body.phone)
        if not phone or len(phone) < 7:
            raise HTTPException(status_code=400, detail="Invalid phone number")
        update_data["phone"] = phone
    if body.active is not None:
        update_data["active"] = body.active

    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    try:
        result = supabase_client.table("whatsapp_contacts").update(update_data).eq("id", contact_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"status": "updated", "contact": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/whatsapp/contacts/{contact_id}",
    summary="Delete a WhatsApp contact",
)
async def delete_contact(contact_id: int):
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        result = supabase_client.table("whatsapp_contacts").delete().eq("id", contact_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"status": "deleted", "id": contact_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
