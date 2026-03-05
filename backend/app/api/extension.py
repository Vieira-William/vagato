"""
API endpoints para a Chrome Extension Vagato.

Todos os endpoints (exceto /auth) requerem JWT via verify_extension_token.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import logging

from ..database import get_db
from .. import models
from ..middleware.extension_auth import (
    create_extension_token,
    verify_extension_token,
    should_refresh_token,
)

router = APIRouter(prefix="/extension", tags=["extension"])
logger = logging.getLogger(__name__)


# ── Schemas ──────────────────────────────────────────────────────────

class ExtensionLoginRequest(BaseModel):
    """Credenciais de login para a extension."""
    email: str = Field(..., description="Email da conta Vagato")
    # Sem senha por enquanto — validamos pelo email existente no perfil.
    # Quando Supabase Admin SDK for integrado server-side, adicionamos senha.


class ExtensionLoginResponse(BaseModel):
    """Resposta do login da extension."""
    token: str
    expires_at: str
    profile_id: int
    email: str


class ExtensionProfileResponse(BaseModel):
    """Perfil otimizado para a extension (campos mapeáveis para formulários)."""
    id: int
    nome: str
    primeiro_nome: Optional[str] = None
    nome_meio: Optional[str] = None
    ultimo_nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    github_url: Optional[str] = None
    profissao: Optional[str] = None

    # Profissional
    profissoes_interesse: List[dict] = []
    experiencia_anos: Optional[int] = None
    skills: List[str] = []
    skills_prioritarias: List[str] = []
    formacoes: List[dict] = []
    idiomas: List[dict] = []
    nivel_ingles: Optional[str] = None

    # Preferências
    modelos_trabalho: List[str] = []
    tipos_contrato: List[str] = []
    salario_minimo: Optional[float] = None
    salario_maximo: Optional[float] = None
    salario_moeda: Optional[str] = "BRL"

    # Localização
    pais: Optional[str] = None
    estado: Optional[str] = None
    cidade: Optional[str] = None
    cep: Optional[str] = None

    # CVs
    arquivos_curriculo: List[dict] = []

    # Metadados
    onboarding_completed: bool = False

    @field_validator(
        'profissoes_interesse', 'skills', 'skills_prioritarias',
        'formacoes', 'idiomas', 'modelos_trabalho', 'tipos_contrato',
        'arquivos_curriculo',
        mode='before'
    )
    @classmethod
    def coerce_none_to_list(cls, v):
        return v if v is not None else []

    class Config:
        from_attributes = True


class ExtensionLogRequest(BaseModel):
    """Evento de uso da extension para analytics."""
    event: str = Field(..., description="Tipo de evento (form_detected, form_filled, ai_generated)")
    site: Optional[str] = Field(None, description="Domínio do site (gupy.io, linkedin.com)")
    fields_filled: Optional[int] = Field(0, description="Quantidade de campos preenchidos")
    ai_calls: Optional[int] = Field(0, description="Quantidade de chamadas AI")
    metadata: Optional[dict] = Field(None, description="Dados adicionais do evento")


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/auth", response_model=ExtensionLoginResponse)
async def extension_login(
    credentials: ExtensionLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login da extension. Valida email e retorna JWT.

    Por enquanto, validamos pela existência do perfil ativo no banco.
    TODO: Integrar Supabase Admin SDK para validar senha server-side.
    """
    # Buscar perfil ativo pelo email
    profile = (
        db.query(models.UserProfile)
        .filter(
            models.UserProfile.email == credentials.email,
            models.UserProfile.is_active == True,
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email não encontrado ou perfil inativo",
        )

    # Gerar JWT
    token_data = create_extension_token(
        email=profile.email,
        profile_id=profile.id,
    )

    logger.info(f"[Extension] Login: {profile.email} (profile_id={profile.id})")
    return token_data


@router.post("/auth/refresh", response_model=ExtensionLoginResponse)
async def extension_refresh_token(
    auth: dict = Depends(verify_extension_token),
    db: Session = Depends(get_db),
):
    """Renova JWT se faltam menos de 7 dias para expirar."""
    if not should_refresh_token(auth):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token ainda não precisa de renovação (> 7 dias restantes)",
        )

    # Verificar se perfil ainda existe e está ativo
    profile = (
        db.query(models.UserProfile)
        .filter(
            models.UserProfile.id == auth["profile_id"],
            models.UserProfile.is_active == True,
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Perfil não encontrado ou desativado",
        )

    token_data = create_extension_token(
        email=profile.email,
        profile_id=profile.id,
    )

    logger.info(f"[Extension] Token renovado: {profile.email}")
    return token_data


@router.get("/profile", response_model=ExtensionProfileResponse)
async def extension_get_profile(
    auth: dict = Depends(verify_extension_token),
    db: Session = Depends(get_db),
):
    """
    Retorna perfil completo para cache local na extension (TTL 1h).

    Inclui todos os campos mapeáveis para formulários de candidatura.
    """
    profile = (
        db.query(models.UserProfile)
        .filter(
            models.UserProfile.id == auth["profile_id"],
            models.UserProfile.is_active == True,
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado",
        )

    return profile


@router.post("/log", status_code=status.HTTP_201_CREATED)
async def extension_log_event(
    event: ExtensionLogRequest,
    auth: dict = Depends(verify_extension_token),
    db: Session = Depends(get_db),
):
    """Registra evento de uso da extension para analytics."""
    log_entry = models.ExtensionLog(
        user_email=auth["sub"],
        event=event.event,
        site=event.site,
        fields_filled=event.fields_filled or 0,
        ai_calls=event.ai_calls or 0,
    )
    db.add(log_entry)
    db.commit()

    logger.info(f"[Extension Log] {auth['sub']}: {event.event} em {event.site}")
    return {"status": "logged"}
