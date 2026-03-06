"""
API de cursos recomendados baseados no perfil do usuário.
Integra com Coursera Catalog API + fallback curado.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import logging

from ..database import get_db
from .. import models
from ..services.coursera_client import CourseraService

router = APIRouter(prefix="/courses", tags=["courses"])
logger = logging.getLogger(__name__)

# Instância singleton do service (mantém cache entre requests)
_coursera_service = CourseraService()


def _get_active_profile(db: Session) -> models.UserProfile:
    """Retorna o perfil ativo ou None."""
    return db.query(models.UserProfile).filter(
        models.UserProfile.is_active == True
    ).first()


@router.get("/recommended")
def get_recommended_courses(db: Session = Depends(get_db)):
    """
    Retorna cursos recomendados baseados nas skills e nível do perfil ativo.
    Se o perfil não tiver skills, retorna lista vazia.
    Se a API Coursera falhar, retorna cursos curados como fallback.
    """
    profile = _get_active_profile(db)

    if not profile or not profile.skills:
        return {
            "courses": [],
            "source": "none",
            "profile_skills_used": [],
            "total": 0,
            "cached_until": None,
            "message": "Perfil sem skills configuradas",
        }

    skills = profile.skills if isinstance(profile.skills, list) else []
    nivel = profile.nivel_minimo or "senior"

    courses = _coursera_service.get_recommended(
        skills=skills,
        nivel=nivel,
        limit=8,
    )

    return {
        "courses": courses,
        "source": _coursera_service.last_source,
        "profile_skills_used": skills[:5],
        "total": len(courses),
        "cached_until": _coursera_service.cache_expires_at,
    }
