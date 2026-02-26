"""
Servicos da aplicacao.
Contem logica de negocio para extracao com IA e matching de vagas.
"""
from .ai_extractor import AIExtractor
from .job_matcher import JobMatcher
from .default_profile import WILLIAM_PROFILE

__all__ = ["AIExtractor", "JobMatcher", "WILLIAM_PROFILE"]
