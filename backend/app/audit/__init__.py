"""
Sistema de Auditoria Completa para Vagas UX Platform.

Este módulo fornece:
1. Consolidador de Gabarito - Unifica dados brutos de todas as fontes
2. Processamento com Auditoria - Rastreia cada transformação
3. Validação com IA - Amostragem periódica para verificar qualidade
4. Relatórios - Visibilidade completa do pipeline

Uso:
    python -m app.audit.consolidador_gabarito --format both
    python -m app.audit.processar_com_auditoria
    python -m app.audit.validar_amostra --percentual 0.10
    python -m scripts.gerar_relatorio_auditoria --dias 7
"""

from .consolidador_gabarito import (
    consolidar_gabarito,
    calcular_hash_registro,
    gerar_uuid_deterministico,
)
from .processar_com_auditoria import (
    processar_registro_com_auditoria,
    processar_todos,
)
from .validar_amostra import (
    validar_amostra,
    validar_vaga_especifica,
)

__all__ = [
    # Consolidador
    'consolidar_gabarito',
    'calcular_hash_registro',
    'gerar_uuid_deterministico',
    # Processamento
    'processar_registro_com_auditoria',
    'processar_todos',
    # Validação
    'validar_amostra',
    'validar_vaga_especifica',
]
