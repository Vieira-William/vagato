"""
Router REST para E-mails Inteligentes.
Endpoints para buscar e-mails classificados por IA e forcar refresh.
"""
from fastapi import APIRouter
import logging

from ..services.email_classifier import EmailClassifierService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Smart Emails"])

# Instancia singleton do servico
_service = EmailClassifierService()


@router.get("/smart-emails/")
async def get_smart_emails():
    """
    Retorna e-mails inteligentes classificados por IA (cache-first).
    Primeira chamada: ~3-4s (fetch Gmail + LLM).
    Chamadas seguintes: <200ms (cache hit).
    """
    try:
        return _service.get_smart_emails()
    except Exception as e:
        logger.error(f"Erro no endpoint smart-emails: {e}")
        return {
            "emails": [],
            "urgent_count": 0,
            "pending_analysis": 0,
            "last_updated": None,
            "cache_fresh": False,
            "gmail_connected": False,
            "error": str(e),
        }


@router.post("/smart-emails/refresh")
async def refresh_smart_emails():
    """
    Forca re-analise dos e-mails (ignora cache).
    Util quando o usuario quer ver classificacoes atualizadas.
    """
    try:
        return _service.refresh()
    except Exception as e:
        logger.error(f"Erro ao refreshar smart-emails: {e}")
        return {
            "emails": [],
            "urgent_count": 0,
            "pending_analysis": 0,
            "last_updated": None,
            "cache_fresh": False,
            "gmail_connected": False,
            "error": str(e),
        }
