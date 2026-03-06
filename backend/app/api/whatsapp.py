from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from ..database import get_db
from ..models import WhatsAppPreferences, WhatsAppLog
from ..schemas import (
    WhatsAppPreferencesResponse, WhatsAppPreferencesUpdate,
    WhatsAppVerifySendRequest, WhatsAppVerifyConfirmRequest, WhatsAppLogResponse
)
from ..services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Alerts"])

# Projeto single-user — usar ID fixo como as demais rotas
FIXED_USER_ID = 2


def _get_or_create_prefs(db: Session):
    """Retorna ou cria as preferencias de WhatsApp do usuario."""
    prefs = db.query(WhatsAppPreferences).filter(WhatsAppPreferences.user_id == FIXED_USER_ID).first()
    if not prefs:
        prefs = WhatsAppPreferences(
            id=str(uuid.uuid4()),
            user_id=FIXED_USER_ID,
            is_active=False,
            phone_verified=False
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.get("/preferences", response_model=WhatsAppPreferencesResponse)
async def get_preferences(db: Session = Depends(get_db)):
    return _get_or_create_prefs(db)


@router.patch("/preferences", response_model=WhatsAppPreferencesResponse)
async def update_preferences(data: WhatsAppPreferencesUpdate, db: Session = Depends(get_db)):
    prefs = _get_or_create_prefs(db)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(prefs, key, value)
    db.commit()
    db.refresh(prefs)
    return prefs


@router.post("/verify/send")
async def verify_send(req: WhatsAppVerifySendRequest, db: Session = Depends(get_db)):
    prefs = _get_or_create_prefs(db)

    # Salva o numero tentado e reinicia validacao
    prefs.phone_number = req.phone_number
    prefs.phone_verified = False
    db.commit()

    success = await whatsapp_service.send_verification_code(req.phone_number)
    if not success:
        raise HTTPException(status_code=400, detail="Falha ao enviar OTP via Twilio.")

    return {"status": "pending", "message": "OTP enviado com sucesso via WhatsApp."}


@router.post("/verify/confirm")
async def verify_confirm(req: WhatsAppVerifyConfirmRequest, db: Session = Depends(get_db)):
    prefs = _get_or_create_prefs(db)
    if prefs.phone_number != req.phone_number:
        raise HTTPException(status_code=400, detail="Numero nao corresponde ao cadastrado.")

    is_valid = await whatsapp_service.check_verification_code(req.phone_number, req.code)

    if is_valid:
        prefs.phone_verified = True
        prefs.is_active = True
        db.commit()

        # Mensagem de boas-vindas
        await whatsapp_service.send_alert(
            db=db,
            user_id=FIXED_USER_ID,
            alert_type="profile",
            message_body="*Vagato:* Seu WhatsApp foi conectado com sucesso aos Alertas Inteligentes! 🚀"
        )

        return {"status": "approved", "message": "Numero verificado com sucesso."}
    else:
        raise HTTPException(status_code=400, detail="Codigo OTP invalido ou expirado.")


@router.delete("/disconnect")
async def disconnect_whatsapp(db: Session = Depends(get_db)):
    prefs = db.query(WhatsAppPreferences).filter(WhatsAppPreferences.user_id == FIXED_USER_ID).first()
    if prefs:
        prefs.phone_number = None
        prefs.phone_verified = False
        prefs.is_active = False
        db.commit()
    return {"status": "success", "message": "WhatsApp desconectado."}


@router.get("/logs", response_model=List[WhatsAppLogResponse])
async def get_logs(limit: int = 10, db: Session = Depends(get_db)):
    logs = db.query(WhatsAppLog).filter(
        WhatsAppLog.user_id == FIXED_USER_ID
    ).order_by(WhatsAppLog.created_at.desc()).limit(limit).all()
    return logs
