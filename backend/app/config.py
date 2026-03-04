"""
Configuracoes da aplicacao.
Carrega variaveis de ambiente e define settings globais.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache
from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env", override=True)


class Settings(BaseSettings):
    """Configuracoes do sistema."""

    # API Keys
    ANTHROPIC_API_KEY: str = ""

    # Modelo Claude preferido
    CLAUDE_MODEL: str = "claude-3-haiku-20240307"  # Custo-beneficio
    CLAUDE_MODEL_PREMIUM: str = "claude-sonnet-4-20250514"  # Qualidade

    # Limites de processamento
    MAX_TOKENS_EXTRACTION: int = 2000
    BATCH_SIZE: int = 20

    # Custos (para monitoramento - valores em USD por 1K tokens)
    COST_PER_1K_INPUT_HAIKU: float = 0.00025
    COST_PER_1K_OUTPUT_HAIKU: float = 0.00125
    COST_PER_1K_INPUT_SONNET: float = 0.003
    COST_PER_1K_OUTPUT_SONNET: float = 0.015

    # Threshold para destaque
    SCORE_DESTAQUE_THRESHOLD: float = 0.75

    # Database
    DATABASE_URL: str = "sqlite:///./data/vagas.db"

    class Config:
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Retorna instancia cached das settings."""
    return Settings()


# Instancia global
settings = get_settings()
