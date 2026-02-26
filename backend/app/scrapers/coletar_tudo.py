#!/usr/bin/env python3
"""
Script principal de coleta automática.
Usa arquitetura de 2 etapas (coleta bruta → análise com filtros).

IMPORTANTE: Este script usa o MESMO pipeline que o frontend (stream/v3),
garantindo que todas as correções (filtro UX por título, limpeza de empresa,
detecção de duplicatas cross-source, etc.) são aplicadas.

Etapas:
1. Coleta bruta (coleta_bruta.py) → JSON sem filtro
2. Análise (analisar_brutos.py) → Filtro UX, limpeza, validação
3. Inserção (crud.py) → check_duplicate com 4 níveis
"""
import sys
import os

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from datetime import datetime
from app.database import SessionLocal, engine, Base
from app import crud, schemas
from app.scrapers.coleta_bruta import (
    coletar_e_salvar_indeed,
    coletar_e_salvar_posts,
    coletar_e_salvar_jobs,
)
from app.scrapers.analisar_brutos import (
    analisar_arquivo_indeed,
    analisar_arquivo_posts,
    analisar_arquivo_jobs,
    resetar_links_usados,
)


def salvar_vagas_filtradas(db, vagas: list[dict], fonte: str) -> tuple[int, int]:
    """
    Salva vagas JÁ FILTRADAS no banco com detecção de duplicatas.

    Usa crud.check_duplicate() com 4 níveis:
    1. Por link
    2. Por título + empresa (exato e normalizado)
    3. Por título + perfil_autor
    4. Por título genérico

    Returns:
        (novas, duplicatas)
    """
    novas, dups = 0, 0
    for vaga_dict in vagas:
        try:
            if crud.check_duplicate(
                db,
                vaga_dict.get("titulo", ""),
                vaga_dict.get("empresa"),
                vaga_dict.get("link_vaga"),
                vaga_dict.get("perfil_autor"),
            ):
                dups += 1
            else:
                vaga = schemas.VagaCreate(**vaga_dict)
                crud.create_vaga(db, vaga)
                novas += 1
        except Exception as e:
            print(f"  Erro ao salvar: {e}")
    return novas, dups


def coletar_tudo(mostrar_janela: bool = True):
    """
    Executa coleta de todas as fontes usando pipeline de 2 etapas.

    Args:
        mostrar_janela: Se True, mostra o navegador (usa sessões do usuário).
                       Se False, roda headless (pode não ter login).
    """
    print("=" * 60)
    print(f"COLETA DE VAGAS - {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print("(Pipeline 2 etapas: coleta bruta → análise com filtros)")
    print("=" * 60)

    # Garante que as tabelas existem
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Reset de links usados para evitar falsos duplicados
    resetar_links_usados()

    resultados = {
        "indeed": {"bruto": 0, "ux": 0, "novas": 0, "dups": 0, "erro": None},
        "linkedin_posts": {"bruto": 0, "ux": 0, "novas": 0, "dups": 0, "erro": None},
        "linkedin_jobs": {"bruto": 0, "ux": 0, "novas": 0, "dups": 0, "erro": None},
    }

    headless = not mostrar_janela

    try:
        # ===== 1. INDEED =====
        print("\n📋 INDEED (2 etapas)")
        print("-" * 40)
        try:
            # Etapa 1: Coleta bruta
            print("  Etapa 1: Coletando vagas brutas...")
            dados, arquivo = coletar_e_salvar_indeed(headless=headless)
            total_bruto = dados.get("total_vagas", 0)
            print(f"  → {total_bruto} vagas brutas coletadas")

            # Etapa 2: Análise com filtros
            print("  Etapa 2: Filtrando UX/Produto...")
            res = analisar_arquivo_indeed(arquivo)
            vagas = res.get("vagas", [])
            print(f"  → {len(vagas)} vagas UX/Produto ({res.get('taxa_conversao', '?')})")

            # Etapa 3: Inserção com dedup
            novas, dups = salvar_vagas_filtradas(db, vagas, "indeed")
            resultados["indeed"] = {"bruto": total_bruto, "ux": len(vagas), "novas": novas, "dups": dups}
            print(f"  ✓ {novas} novas, {dups} duplicatas")
        except Exception as e:
            resultados["indeed"]["erro"] = str(e)
            print(f"  ✗ Erro: {e}")

        # ===== 2. LINKEDIN POSTS =====
        print("\n📝 LINKEDIN POSTS (2 etapas)")
        print("-" * 40)
        try:
            print("  Etapa 1: Coletando posts brutos...")
            dados, arquivo = coletar_e_salvar_posts(headless=headless)
            total_bruto = dados.get("total_posts", 0)
            print(f"  → {total_bruto} posts brutos coletados")

            print("  Etapa 2: Filtrando UX/Produto...")
            res = analisar_arquivo_posts(arquivo)
            vagas = res.get("vagas", [])
            print(f"  → {len(vagas)} vagas UX/Produto ({res.get('taxa_conversao', '?')})")

            novas, dups = salvar_vagas_filtradas(db, vagas, "linkedin_posts")
            resultados["linkedin_posts"] = {"bruto": total_bruto, "ux": len(vagas), "novas": novas, "dups": dups}
            print(f"  ✓ {novas} novas, {dups} duplicatas")
        except Exception as e:
            resultados["linkedin_posts"]["erro"] = str(e)
            print(f"  ✗ Erro: {e}")

        # ===== 3. LINKEDIN JOBS =====
        print("\n💼 LINKEDIN JOBS (2 etapas)")
        print("-" * 40)
        try:
            print("  Etapa 1: Coletando vagas brutas...")
            dados, arquivo = coletar_e_salvar_jobs(headless=headless)
            total_bruto = dados.get("total_vagas", 0)
            print(f"  → {total_bruto} vagas brutas coletadas")

            print("  Etapa 2: Filtrando UX/Produto...")
            res = analisar_arquivo_jobs(arquivo)
            vagas = res.get("vagas", [])
            print(f"  → {len(vagas)} vagas UX/Produto ({res.get('taxa_conversao', '?')})")

            novas, dups = salvar_vagas_filtradas(db, vagas, "linkedin_jobs")
            resultados["linkedin_jobs"] = {"bruto": total_bruto, "ux": len(vagas), "novas": novas, "dups": dups}
            print(f"  ✓ {novas} novas, {dups} duplicatas")
        except Exception as e:
            resultados["linkedin_jobs"]["erro"] = str(e)
            print(f"  ✗ Erro: {e}")

        # ===== RESUMO =====
        total_novas = sum(r.get("novas", 0) for r in resultados.values())
        total_bruto = sum(r.get("bruto", 0) for r in resultados.values())
        total_ux = sum(r.get("ux", 0) for r in resultados.values())
        total_dups = sum(r.get("dups", 0) for r in resultados.values())

        print("\n" + "=" * 60)
        print("RESUMO")
        print("=" * 60)
        print(f"Total bruto coletado: {total_bruto}")
        print(f"Vagas UX/Produto: {total_ux}")
        print(f"Novas salvas: {total_novas}")
        print(f"Duplicatas: {total_dups}")

        # Estatísticas do banco
        stats = crud.get_stats(db)
        print(f"\nNo banco de dados:")
        print(f"  Total de vagas: {stats['total_vagas']}")
        print(f"  Últimas 24h: {stats['ultimas_24h']}")

        if total_novas > 0:
            print(f"\n🎉 {total_novas} NOVAS VAGAS ENCONTRADAS!")
        else:
            print("\nNenhuma vaga nova encontrada.")

        return resultados

    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Coleta vagas de todas as fontes (pipeline 2 etapas)")
    parser.add_argument("--headless", action="store_true", help="Rodar sem mostrar navegador")
    parser.add_argument("--visible", action="store_true", help="Forçar mostrar navegador")
    args = parser.parse_args()

    # Detecta se está rodando via scheduler/cron (sem terminal interativo)
    rodando_via_scheduler = not sys.stdin.isatty()

    if args.visible:
        mostrar_janela = True
    elif args.headless or rodando_via_scheduler:
        mostrar_janela = False
    else:
        mostrar_janela = False

    if rodando_via_scheduler:
        print("[SCHEDULER] Executando em modo headless automaticamente")

    coletar_tudo(mostrar_janela=mostrar_janela)
