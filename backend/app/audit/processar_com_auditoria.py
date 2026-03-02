#!/usr/bin/env python3
"""
Processamento com Auditoria - Sistema de Rastreabilidade Completa.

Processa registros brutos com log de cada transformação para
auditoria completa do pipeline de dados.

Uso:
    python -m app.audit.processar_com_auditoria
    python -m app.audit.processar_com_auditoria --desde "2026-02-01"
    python -m app.audit.processar_com_auditoria --fonte linkedin_posts
"""

import argparse
import json
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from ..database import SessionLocal
from .. import models
from ..scrapers.analisar_brutos import (
    eh_post_agregador,
    eh_vaga_ux_produto,
    extrair_titulo_vaga,
    extrair_empresa,
    classificar_modalidade,
    classificar_tipo_vaga,
    extrair_emails,
    eh_link_generico,
    eh_link_vaga_valido,
    eh_link_vaga_especifica,
    resetar_links_usados,
    link_ja_usado,
    registrar_link_usado,
)


def processar_registro_com_auditoria(
    db: Session,
    registro_bruto: models.RegistroBruto,
) -> Optional[models.Vaga]:
    """
    Processa um registro bruto com auditoria completa.

    Registra cada etapa de transformação para rastreabilidade.

    Args:
        db: Sessão do banco de dados
        registro_bruto: Registro bruto a processar

    Returns:
        Vaga criada ou None se descartado
    """
    transformacoes = []
    dados = json.loads(registro_bruto.dados_brutos)

    # Determina texto e metadados conforme a fonte
    if registro_bruto.fonte == 'linkedin_posts':
        texto = dados.get('texto_completo', '')
        links = dados.get('links_encontrados', [])
        nome_autor = dados.get('nome_autor')
        perfil_autor = dados.get('perfil_autor')
    else:
        texto = dados.get('titulo', '')
        links = [dados.get('link_vaga')] if dados.get('link_vaga') else []
        nome_autor = None
        perfil_autor = None

    # =========================================================================
    # ETAPA 1: Filtro de agregador (apenas para posts)
    # =========================================================================
    if registro_bruto.fonte == 'linkedin_posts':
        is_agregador = eh_post_agregador(texto)
        transformacoes.append({
            'etapa': 'filtro_agregador',
            'timestamp': datetime.now().isoformat(),
            'resultado': 'descartado' if is_agregador else 'passou',
        })

        if is_agregador:
            _criar_auditoria(
                db, registro_bruto, 'descartado', 'agregador', transformacoes
            )
            return None

    # =========================================================================
    # ETAPA 2: Extração de título (ANTES do filtro UX)
    # Para posts: extrai do texto
    # Para jobs/indeed: usa título original
    # =========================================================================
    if registro_bruto.fonte == 'linkedin_posts':
        titulo = extrair_titulo_vaga(texto)
    else:
        titulo = dados.get('titulo', '')

    transformacoes.append({
        'etapa': 'extracao_titulo',
        'timestamp': datetime.now().isoformat(),
        'resultado': titulo if titulo else 'sem_titulo',
    })

    if not titulo:
        _criar_auditoria(
            db, registro_bruto, 'descartado', 'sem_titulo', transformacoes
        )
        return None

    # =========================================================================
    # ETAPA 3: Filtro UX/Produto (usa TÍTULO, não texto completo)
    # O título é a melhor indicação se a vaga é de UX/Produto
    # =========================================================================
    is_ux = eh_vaga_ux_produto(titulo)
    transformacoes.append({
        'etapa': 'filtro_ux_produto',
        'timestamp': datetime.now().isoformat(),
        'resultado': 'passou' if is_ux else 'descartado',
        'titulo_analisado': titulo,
    })

    if not is_ux:
        _criar_auditoria(
            db, registro_bruto, 'descartado', 'nao_ux', transformacoes
        )
        return None

    # =========================================================================
    # ETAPA 4: Extração de dados adicionais
    # =========================================================================
    empresa = extrair_empresa(texto) or dados.get('empresa')
    modalidade = classificar_modalidade(texto)
    tipo_vaga = classificar_tipo_vaga(texto)
    emails = extrair_emails(texto)

    transformacoes.append({
        'etapa': 'extracao_dados',
        'timestamp': datetime.now().isoformat(),
        'resultado': {
            'empresa': empresa,
            'modalidade': modalidade,
            'tipo_vaga': tipo_vaga,
            'emails': len(emails),
        },
    })

    # =========================================================================
    # ETAPA 5: Validação de link
    # =========================================================================
    link_vaga = None
    link_status = []

    for link in links:
        if not link:
            continue

        # Verifica se é genérico
        if eh_link_generico(link):
            link_status.append({'link': link[:50], 'status': 'generico'})
            continue

        # Verifica se já foi usado
        if link_ja_usado(link):
            link_status.append({'link': link[:50], 'status': 'ja_usado'})
            continue

        # Valida link
        if not eh_link_vaga_valido(link):
            link_status.append({'link': link[:50], 'status': 'invalido'})
            continue

        # Para links encurtados, valida destino
        if "lnkd.in" in link.lower():
            if not eh_link_vaga_especifica(link):
                link_status.append({'link': link[:50], 'status': 'destino_generico'})
                continue

        # Link válido!
        link_vaga = link
        registrar_link_usado(link)
        link_status.append({'link': link[:50], 'status': 'aceito'})
        break

    transformacoes.append({
        'etapa': 'validacao_link',
        'timestamp': datetime.now().isoformat(),
        'resultado': 'link_encontrado' if link_vaga else 'sem_link_valido',
        'detalhes': link_status,
    })

    # =========================================================================
    # ETAPA 6: Determina forma de contato
    # =========================================================================
    if link_vaga:
        forma_contato = 'link'
    elif emails:
        forma_contato = 'email'
    elif perfil_autor:
        forma_contato = 'mensagem'
    else:
        forma_contato = 'indefinido'

    transformacoes.append({
        'etapa': 'forma_contato',
        'timestamp': datetime.now().isoformat(),
        'resultado': forma_contato,
    })

    if forma_contato == 'indefinido':
        _criar_auditoria(
            db, registro_bruto, 'descartado', 'sem_contato', transformacoes
        )
        return None

    # =========================================================================
    # ETAPA 7: Verificar duplicata no banco
    # =========================================================================
    duplicata = _verificar_duplicata(db, titulo, empresa, link_vaga, perfil_autor)
    transformacoes.append({
        'etapa': 'verificacao_duplicata',
        'timestamp': datetime.now().isoformat(),
        'resultado': 'duplicata' if duplicata else 'nova',
    })

    if duplicata:
        _criar_auditoria(
            db, registro_bruto, 'descartado', 'duplicata', transformacoes,
            vaga_id=duplicata.id
        )
        return None

    # =========================================================================
    # ETAPA 8: Criar vaga com rastreabilidade
    # =========================================================================
    vaga = models.Vaga(
        titulo=titulo,
        empresa=empresa,
        tipo_vaga=tipo_vaga,
        fonte=registro_bruto.fonte,
        link_vaga=link_vaga,
        localizacao=dados.get('localizacao'),
        modalidade=modalidade,
        requisito_ingles='nao_especificado',
        forma_contato=forma_contato,
        email_contato=emails[0] if emails else None,
        perfil_autor=perfil_autor,
        nome_autor=nome_autor,
        data_coleta=registro_bruto.timestamp_coleta.date(),
        registro_bruto_uuid=registro_bruto.uuid,  # RASTREABILIDADE
    )

    db.add(vaga)
    db.flush()
    db.refresh(vaga)

    transformacoes.append({
        'etapa': 'criacao_vaga',
        'timestamp': datetime.now().isoformat(),
        'resultado': 'sucesso',
        'vaga_id': vaga.id,
    })

    # Registrar auditoria de sucesso
    _criar_auditoria(
        db, registro_bruto, 'processado', None, transformacoes,
        vaga_id=vaga.id
    )

    return vaga


def _criar_auditoria(
    db: Session,
    registro_bruto: models.RegistroBruto,
    status: str,
    motivo_descarte: Optional[str],
    transformacoes: List[Dict],
    vaga_id: int = None,
):
    """Cria registro de auditoria."""
    # Verifica se já existe auditoria para este registro
    existente = db.query(models.ProcessamentoAuditoria).filter(
        models.ProcessamentoAuditoria.registro_bruto_id == registro_bruto.id
    ).first()

    if existente:
        # Atualiza
        existente.status = status
        existente.motivo_descarte = motivo_descarte
        existente.transformacoes = transformacoes
        existente.vaga_id = vaga_id
        existente.timestamp_processamento = datetime.now()
    else:
        # Cria novo
        auditoria = models.ProcessamentoAuditoria(
            registro_bruto_id=registro_bruto.id,
            vaga_id=vaga_id,
            status=status,
            motivo_descarte=motivo_descarte,
            transformacoes=transformacoes,
        )
        db.add(auditoria)

    db.flush()


def _verificar_duplicata(
    db: Session,
    titulo: str,
    empresa: Optional[str],
    link_vaga: Optional[str],
    perfil_autor: Optional[str] = None,
) -> Optional[models.Vaga]:
    """Verifica se já existe vaga duplicada."""
    # Primeiro por link
    if link_vaga:
        existente = db.query(models.Vaga).filter(
            models.Vaga.link_vaga == link_vaga
        ).first()
        if existente:
            return existente

    # Depois por título + empresa
    if titulo and empresa:
        existente = db.query(models.Vaga).filter(
            models.Vaga.titulo == titulo,
            models.Vaga.empresa == empresa
        ).first()
        if existente:
            return existente

    # Para posts sem empresa: título + perfil_autor
    # Evita duplicatas como 7x "Product Designer" sem empresa
    if titulo and perfil_autor and not empresa:
        existente = db.query(models.Vaga).filter(
            models.Vaga.titulo == titulo,
            models.Vaga.perfil_autor == perfil_autor
        ).first()
        if existente:
            return existente

    # Título genérico sem empresa e sem link = provável duplicata
    # Se já existe a mesma vaga com título igual, sem empresa e sem link
    if titulo and not empresa and not link_vaga:
        existente = db.query(models.Vaga).filter(
            models.Vaga.titulo == titulo,
            models.Vaga.empresa.is_(None),
            models.Vaga.link_vaga.is_(None)
        ).first()
        if existente:
            return existente

    return None


def processar_todos(
    fonte: Optional[str] = None,
    desde: Optional[str] = None,
    limite: int = None,
    progress_callback=None,
) -> dict:
    """
    Processa todos os registros brutos pendentes.

    Args:
        fonte: Filtrar por fonte (linkedin_posts, linkedin_jobs, indeed)
        desde: Data mínima de coleta (ISO format)
        limite: Limite de registros a processar
        progress_callback: Função de callback para reportar progresso

    Returns:
        Estatísticas do processamento
    """
    db = SessionLocal()

    print("="*60)
    print("PROCESSAMENTO COM AUDITORIA")
    print("="*60)

    # Reseta rastreamento de links
    resetar_links_usados()

    # Query base
    query = db.query(models.RegistroBruto)

    # Filtros
    if fonte:
        query = query.filter(models.RegistroBruto.fonte == fonte)
        print(f"Fonte: {fonte}")

    if desde:
        data_desde = datetime.fromisoformat(desde)
        query = query.filter(models.RegistroBruto.timestamp_coleta >= data_desde)
        print(f"Desde: {desde}")

    # Ordena por timestamp
    query = query.order_by(models.RegistroBruto.timestamp_coleta)

    # Limite
    if limite:
        query = query.limit(limite)
        print(f"Limite: {limite}")

    registros = query.all()
    total = len(registros)

    print(f"\nProcessando {total} registros...")

    # Estatísticas
    stats = {
        'total': total,
        'processado': 0,
        'descartado': 0,
        'motivos_descarte': {},
    }

    # Se for 0 envia progress e sai
    if total == 0:
        if progress_callback:
            progress_callback({
                "progresso": 100,
                "processados": 0,
                "total": 0,
                "message": "Nenhum registro a processar"
            })
        return stats

    # Frequencia do log baseada no total de registros
    freq = 50 if total > 500 else 10 if total > 50 else 5

    for i, registro in enumerate(registros, 1):
        vaga = processar_registro_com_auditoria(db, registro)

        if vaga:
            stats['processado'] += 1
            print(f"  [{i}/{total}] ✓ {vaga.titulo[:40]}...")
        else:
            stats['descartado'] += 1

        # Progresso e Batch Commit
        if i % freq == 0 or i == total:
            db.commit()
            
            progresso_pct = int((i/total)*100)
            print(f"  Progresso: {i}/{total} ({progresso_pct}%)")
            if progress_callback:
                progress_callback({
                    "total": total,
                    "processados": i,
                    "vagas_criadas": stats['processado'],
                    "descartados": stats['descartado'],
                    "progresso": progresso_pct,
                    "message": f"Auditando registros brutos... {i}/{total} ({progresso_pct}%)"
                })

    # Conta motivos de descarte
    motivos = db.query(
        models.ProcessamentoAuditoria.motivo_descarte,
    ).filter(
        models.ProcessamentoAuditoria.status == 'descartado',
        models.ProcessamentoAuditoria.motivo_descarte.isnot(None)
    ).all()

    for (motivo,) in motivos:
        stats['motivos_descarte'][motivo] = \
            stats['motivos_descarte'].get(motivo, 0) + 1

    db.close()

    # Resumo
    print(f"\n{'='*60}")
    print("RESULTADO:")
    print(f"  Total processados: {stats['total']}")
    print(f"  Vagas criadas: {stats['processado']}")
    print(f"  Descartados: {stats['descartado']}")
    if stats['motivos_descarte']:
        print("  Motivos de descarte:")
        for motivo, count in sorted(stats['motivos_descarte'].items(),
                                     key=lambda x: -x[1]):
            print(f"    - {motivo}: {count}")
    print(f"  Taxa de conversão: {stats['processado']/stats['total']*100:.1f}%"
          if stats['total'] > 0 else "  Taxa de conversão: N/A")
    print("="*60)

    return stats


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Processa registros brutos com auditoria completa'
    )
    parser.add_argument(
        '--fonte',
        choices=['linkedin_posts', 'linkedin_jobs', 'indeed'],
        help='Filtrar por fonte'
    )
    parser.add_argument(
        '--desde',
        help='Data mínima de coleta (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--limite',
        type=int,
        help='Limite de registros a processar'
    )

    args = parser.parse_args()

    resultado = processar_todos(
        fonte=args.fonte,
        desde=args.desde,
        limite=args.limite,
    )
