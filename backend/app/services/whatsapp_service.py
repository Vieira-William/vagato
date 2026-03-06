import logging
import os
from twilio.rest import Client
from sqlalchemy.orm import Session
from datetime import datetime
from app.models import WhatsAppPreferences, WhatsAppLog, UserProfile

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.phone_number = os.getenv('TWILIO_PHONE_NUMBER')
        self.verify_service_sid = os.getenv('TWILIO_VERIFY_SERVICE_SID')
        
        self.is_configured = all([self.account_sid, self.auth_token, self.phone_number])
        if self.is_configured:
            self.client = Client(self.account_sid, self.auth_token)
            logger.info("WhatsAppService: Twilio Client Inicializado.")
        else:
            logger.warning("WhatsAppService: Twilio credentials not fully configured.")

    async def send_verification_code(self, phone: str) -> bool:
        """Envia OTP de 6 dígitos via Twilio Verify"""
        if not self.is_configured or not self.verify_service_sid:
            logger.error("Twilio Verify Credentials desativadas ou inválidas.")
            return False
            
        try:
            verification = self.client.verify.v2.services(self.verify_service_sid) \
                .verifications \
                .create(to=phone, channel='whatsapp')
            logger.info(f"Verification OTP sent to {phone}. Status: {verification.status}")
            return True
        except Exception as e:
            logger.error(f"Erro ao enviar OTP Twilio: {str(e)}")
            return False

    async def check_verification_code(self, phone: str, code: str) -> bool:
        """Checa se o OTP digitado bate com a Verify API"""
        if not self.is_configured or not self.verify_service_sid:
            return False
            
        try:
            verification_check = self.client.verify.v2.services(self.verify_service_sid) \
                .verification_checks \
                .create(to=phone, code=code)
            return verification_check.status == "approved"
        except Exception as e:
            logger.error(f"Erro ao checar OTP Twilio: {str(e)}")
            return False

    async def send_alert(self, db: Session, user_id: int, alert_type: str, message_body: str) -> bool:
        """Flúxo Core: Checa pre-requisitos, horários e dispara."""
        if not self.is_configured:
            return False

        # 1. Recupera Perfil e Prefs
        prefs = db.query(WhatsAppPreferences).filter(WhatsAppPreferences.user_id == user_id).first()
        user = db.query(UserProfile).filter(UserProfile.id == user_id).first()

        if not prefs or not prefs.phone_verified or not prefs.is_active:
            logger.info(f"User {user_id} Whatsapp inativo ou nao verificado.")
            return False

        # Apenas PRO
        if not user or getattr(user, 'plano_tipo', 'free') == 'free':
             return False

        # 2. Check individual type switch
        alert_field = f"alert_{alert_type}"
        if not hasattr(prefs, alert_field) or not getattr(prefs, alert_field):
            return False

        # TODO 3: Implementar Restrições avançadas de Horário (quiet_hours), Timezone, Quotas
        
        # 4. Envio Real
        try:
            message = self.client.messages.create(
                from_=f"whatsapp:{self.phone_number}",
                body=message_body,
                to=f"whatsapp:{prefs.phone_number}"
            )
            
            # Log
            log_entry = WhatsAppLog(
                user_id=user_id,
                alert_type=alert_type,
                phone_number=prefs.phone_number,
                message_body=message_body,
                status=message.status,
                provider_id=message.sid,
            )
            db.add(log_entry)
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to send WA message to {prefs.phone_number}: {str(e)}")
            
            log_fail = WhatsAppLog(
                user_id=user_id,
                alert_type=alert_type,
                phone_number=prefs.phone_number,
                message_body=message_body,
                status="failed",
                error=str(e)[:500]
            )
            db.add(log_fail)
            db.commit()
            return False

whatsapp_service = WhatsAppService()
