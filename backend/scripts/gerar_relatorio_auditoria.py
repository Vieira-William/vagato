#!/usr/bin/env python3
"""
Gerador de Relatórios de Auditoria.

Gera relatórios detalhados sobre o sistema de auditoria,
incluindo estatísticas de processamento, validação e qualidade.

Uso:
    python -m scripts.gerar_relatorio_auditoria
    python -m scripts.gerar_relatorio_auditoria --dias 30 -o relatorio.json
    python -m scripts.gerar_relatorio_auditoria --formato texto
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Adiciona o diretório backend ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import func

from app.database import SessionLocal
from app import models


def gerar_relatorio(
    dias: int = 7,
    formato: str = 'json',
    output: str = None,
) -> dict:
    """
    Gera relatório de auditoria.

    Args:
        dias: Período em dias para análise
        formato: 'json' ou 'texto'
        output: Caminho para arquivo de saída

    Returns:
        Relatório como dicionário
    """
    db = SessionLocal()

    data_inicio = datetime.now() - timedelta(days=dias)

    # Estatísticas gerais
    stats = {
        'periodo': f'ultimos_{dias}_dias',
        'gerado_em': datetime.now().isoformat(),
        'data_inicio': data_inicio.isoformat(),
    }

    # =========================================================================
    # REGISTROS BRUTOS
    # =========================================================================
    total_brutos = db.query(models.RegistroBruto).count()
    brutos_periodo = db.query(models.RegistroBruto).filter(
        models.RegistroBruto.created_at >= data_inicio
    ).count()

    # Por fonte
    brutos_por_fonte = dict(
        db.query(
            models.RegistroBruto.fonte,
            func.count(models.RegistroBruto.id)
        ).group_by(models.RegistroBruto.fonte).all()
    )

    stats['registros_brutos'] = {
        'total': total_brutos,
        'periodo': brutos_periodo,
        'por_fonte': brutos_por_fonte,
    }

    # =========================================================================
    # PROCESSAMENTO
    # =========================================================================
    processamentos = db.query(models.ProcessamentoAuditoria).filter(
        models.ProcessamentoAuditoria.timestamp_processamento >= data_inicio
    )

    total_proc = processamentos.count()

    # Por status
    por_status = dict(
        processamentos.with_entities(
            models.ProcessamentoAuditoria.status,
            func.count(models.ProcessamentoAuditoria.id)
        ).group_by(models.ProcessamentoAuditoria.status).all()
    )

    # Por motivo de descarte
    por_motivo = dict(
        processamentos.filter(
            models.ProcessamentoAuditoria.status == 'descartado',
            models.ProcessamentoAuditoria.motivo_descarte.isnot(None)
        ).with_entities(
            models.ProcessamentoAuditoria.motivo_descarte,
            func.count(models.ProcessamentoAuditoria.id)
        ).group_by(models.ProcessamentoAuditoria.motivo_descarte).all()
    )

    stats['processamento'] = {
        'total_periodo': total_proc,
        'por_status': por_status,
        'por_motivo_descarte': por_motivo,
    }

    # =========================================================================
    # VALIDAÇÕES IA
    # =========================================================================
    validacoes = db.query(models.ValidacaoAuditoria).filter(
        models.ValidacaoAuditoria.created_at >= data_inicio
    )

    total_valid = validacoes.count()

    # Por resultado
    por_resultado = dict(
        validacoes.with_entities(
            models.ValidacaoAuditoria.resultado,
            func.count(models.ValidacaoAuditoria.id)
        ).group_by(models.ValidacaoAuditoria.resultado).all()
    )

    # Score médio
    score_medio = db.query(
        func.avg(models.ValidacaoAuditoria.score_confianca)
    ).filter(
        models.ValidacaoAuditoria.created_at >= data_inicio,
        models.ValidacaoAuditoria.score_confianca.isnot(None)
    ).scalar() or 0

    stats['validacao_ia'] = {
        'total_validacoes': total_valid,
        'por_resultado': por_resultado,
        'score_medio': round(float(score_medio), 4) if score_medio else 0,
    }

    # =========================================================================
    # VAGAS
    # =========================================================================
    total_vagas = db.query(models.Vaga).count()
    vagas_periodo = db.query(models.Vaga).filter(
        models.Vaga.created_at >= data_inicio
    ).count()

    vagas_rastreiaveis = db.query(models.Vaga).filter(
        models.Vaga.registro_bruto_uuid.isnot(None)
    ).count()

    stats['vagas'] = {
        'total': total_vagas,
        'periodo': vagas_periodo,
        'com_rastreabilidade': vagas_rastreiaveis,
        'percentual_rastreavel': round(vagas_rastreiaveis / total_vagas * 100, 2)
                                  if total_vagas > 0 else 0,
    }

    # =========================================================================
    # TAXA DE CONVERSÃO
    # =========================================================================
    if stats['registros_brutos']['periodo'] > 0:
        vagas_criadas = por_status.get('processado', 0)
        stats['taxa_conversao'] = round(
            vagas_criadas / stats['registros_brutos']['periodo'] * 100, 2
        )
    else:
        stats['taxa_conversao'] = 0

    db.close()

    # Output
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            if formato == 'json':
                json.dump(stats, f, indent=2, ensure_ascii=False, default=str)
            else:
                f.write(_formatar_texto(stats))
        print(f"Relatório salvo em: {output}")

    return stats


def _formatar_texto(stats: dict) -> str:
    """Formata relatório em texto legível."""
    linhas = [
        "=" * 60,
        f"RELATÓRIO DE AUDITORIA - {stats['periodo']}",
        f"Gerado em: {stats['gerado_em']}",
        "=" * 60,
        "",
        "REGISTROS BRUTOS:",
        f"  Total no sistema: {stats['registros_brutos']['total']}",
        f"  No período: {stats['registros_brutos']['periodo']}",
    ]

    if stats['registros_brutos']['por_fonte']:
        linhas.append("  Por fonte:")
        for fonte, count in stats['registros_brutos']['por_fonte'].items():
            linhas.append(f"    - {fonte}: {count}")

    linhas.extend([
        "",
        "PROCESSAMENTO:",
        f"  Total no período: {stats['processamento']['total_periodo']}",
    ])

    if stats['processamento']['por_status']:
        linhas.append("  Por status:")
        for status, count in stats['processamento']['por_status'].items():
            linhas.append(f"    - {status}: {count}")

    if stats['processamento']['por_motivo_descarte']:
        linhas.append("  Motivos de descarte:")
        for motivo, count in sorted(
            stats['processamento']['por_motivo_descarte'].items(),
            key=lambda x: -x[1]
        ):
            linhas.append(f"    - {motivo}: {count}")

    linhas.extend([
        "",
        "VALIDAÇÃO COM IA:",
        f"  Validações realizadas: {stats['validacao_ia']['total_validacoes']}",
        f"  Score médio: {stats['validacao_ia']['score_medio']:.2%}",
    ])

    if stats['validacao_ia']['por_resultado']:
        linhas.append("  Por resultado:")
        for resultado, count in stats['validacao_ia']['por_resultado'].items():
            linhas.append(f"    - {resultado}: {count}")

    linhas.extend([
        "",
        "VAGAS:",
        f"  Total: {stats['vagas']['total']}",
        f"  No período: {stats['vagas']['periodo']}",
        f"  Com rastreabilidade: {stats['vagas']['com_rastreabilidade']} "
        f"({stats['vagas']['percentual_rastreavel']}%)",
        "",
        f"TAXA DE CONVERSÃO: {stats['taxa_conversao']:.1f}%",
        "=" * 60,
    ])

    return "\n".join(linhas)


def comparar_vaga(vaga_id: int) -> dict:
    """
    Compara uma vaga específica com seu registro bruto.

    Args:
        vaga_id: ID da vaga

    Returns:
        Comparação detalhada
    """
    db = SessionLocal()

    vaga = db.query(models.Vaga).filter(models.Vaga.id == vaga_id).first()
    if not vaga:
        db.close()
        return {'erro': f'Vaga {vaga_id} não encontrada'}

    comparacao = {
        'vaga_id': vaga.id,
        'titulo': vaga.titulo,
        'empresa': vaga.empresa,
        'fonte': vaga.fonte,
        'registro_bruto_uuid': vaga.registro_bruto_uuid,
    }

    if not vaga.registro_bruto_uuid:
        comparacao['rastreabilidade'] = False
        comparacao['aviso'] = 'Vaga sem rastreabilidade (criada antes do sistema de auditoria)'
        db.close()
        return comparacao

    # Busca registro bruto
    registro = db.query(models.RegistroBruto).filter(
        models.RegistroBruto.uuid == vaga.registro_bruto_uuid
    ).first()

    if not registro:
        comparacao['erro'] = 'Registro bruto não encontrado'
        db.close()
        return comparacao

    comparacao['rastreabilidade'] = True
    comparacao['registro_bruto'] = {
        'id': registro.id,
        'arquivo_origem': registro.arquivo_origem,
        'timestamp_coleta': registro.timestamp_coleta.isoformat(),
        'checksum': registro.checksum_sha256[:16] + '...',
    }

    # Dados brutos
    dados_brutos = json.loads(registro.dados_brutos)
    comparacao['dados_brutos'] = {
        'texto': dados_brutos.get('texto_completo', dados_brutos.get('titulo', ''))[:500],
        'links': dados_brutos.get('links_encontrados', []),
    }

    # Busca auditoria de processamento
    auditoria = db.query(models.ProcessamentoAuditoria).filter(
        models.ProcessamentoAuditoria.registro_bruto_id == registro.id
    ).first()

    if auditoria:
        comparacao['auditoria'] = {
            'status': auditoria.status,
            'motivo_descarte': auditoria.motivo_descarte,
            'timestamp': auditoria.timestamp_processamento.isoformat(),
            'transformacoes': auditoria.transformacoes,
        }

    # Busca validações
    validacoes = db.query(models.ValidacaoAuditoria).filter(
        models.ValidacaoAuditoria.vaga_id == vaga.id
    ).order_by(models.ValidacaoAuditoria.created_at.desc()).limit(5).all()

    if validacoes:
        comparacao['validacoes'] = [
            {
                'data': v.created_at.isoformat(),
                'resultado': v.resultado,
                'score': v.score_confianca,
                'discrepancias': v.discrepancias,
            }
            for v in validacoes
        ]

    db.close()
    return comparacao


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Gera relatórios de auditoria'
    )
    parser.add_argument(
        '--dias',
        type=int,
        default=7,
        help='Período em dias (default: 7)'
    )
    parser.add_argument(
        '--formato',
        choices=['json', 'texto'],
        default='json',
        help='Formato de saída (default: json)'
    )
    parser.add_argument(
        '-o', '--output',
        help='Arquivo de saída'
    )
    parser.add_argument(
        '--comparar-vaga',
        type=int,
        help='Comparar vaga específica com registro bruto'
    )

    args = parser.parse_args()

    if args.comparar_vaga:
        resultado = comparar_vaga(args.comparar_vaga)
        print(json.dumps(resultado, indent=2, ensure_ascii=False, default=str))
    else:
        resultado = gerar_relatorio(
            dias=args.dias,
            formato=args.formato,
            output=args.output,
        )

        if not args.output:
            if args.formato == 'json':
                print(json.dumps(resultado, indent=2, ensure_ascii=False, default=str))
            else:
                print(_formatar_texto(resultado))
