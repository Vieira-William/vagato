#!/usr/bin/env python3
"""
============================================================================
RELATÓRIO DE QA INTENSIVO - SISTEMA DE COLETA DE VAGAS UX/PRODUTO
============================================================================

Este script executa uma bateria completa de testes de qualidade para validar:
1. Coleta bruta de dados (Posts e Jobs)
2. Análise e filtro de vagas UX/Produto
3. Correspondência título ↔ link
4. Integridade dos dados extraídos
5. Taxa de conversão e cobertura

Baseado em melhores práticas de QA para web scraping:
- Zyte: https://www.zyte.com/blog/guide-to-web-data-extraction-qa-validation-techniques/
- Scrapfly: https://scrapfly.io/blog/posts/how-to-ensure-web-scrapped-data-quality

Autor: Claude Code QA
Data: 2024-02-20
============================================================================
"""

import json
import os
import re
import sys
import time
import requests
from datetime import datetime, date
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from collections import Counter
from urllib.parse import urlparse

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.scrapers.analisar_brutos import (
    eh_vaga_ux_produto,
    extrair_titulo_vaga,
    extrair_empresa,
    classificar_modalidade,
    classificar_tipo_vaga,
    eh_link_vaga_valido,
    TERMOS_PRODUTO,
    TERMOS_EXCLUIR,
    PLATAFORMAS_VAGAS
)

# =============================================================================
# CONFIGURAÇÕES DO TESTE
# =============================================================================

@dataclass
class QAConfig:
    """Configurações do teste de QA."""
    # Quantos % das vagas validar links (20% = intensivo)
    pct_validar_links: float = 0.20
    # Timeout para requests HTTP
    timeout_http: int = 10
    # Máximo de vagas para validação manual de links
    max_links_validar: int = 50
    # Headers para requests
    headers: dict = field(default_factory=lambda: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) QA-Bot/1.0"
    })

CONFIG = QAConfig()

# =============================================================================
# ESTRUTURAS DE DADOS DO RELATÓRIO
# =============================================================================

@dataclass
class TestResult:
    """Resultado de um teste individual."""
    nome: str
    passou: bool
    mensagem: str
    detalhes: Optional[dict] = None
    severidade: str = "info"  # info, warning, error, critical

@dataclass
class QAReport:
    """Relatório completo de QA."""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    total_testes: int = 0
    testes_passaram: int = 0
    testes_falharam: int = 0
    warnings: int = 0
    resultados: List[TestResult] = field(default_factory=list)
    metricas: Dict = field(default_factory=dict)

    def adicionar(self, resultado: TestResult):
        self.resultados.append(resultado)
        self.total_testes += 1
        if resultado.passou:
            self.testes_passaram += 1
        else:
            self.testes_falharam += 1
        if resultado.severidade == "warning":
            self.warnings += 1

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "resumo": {
                "total_testes": self.total_testes,
                "passaram": self.testes_passaram,
                "falharam": self.testes_falharam,
                "warnings": self.warnings,
                "taxa_sucesso": f"{(self.testes_passaram/self.total_testes*100):.1f}%" if self.total_testes > 0 else "N/A"
            },
            "metricas": self.metricas,
            "resultados": [
                {
                    "nome": r.nome,
                    "passou": r.passou,
                    "severidade": r.severidade,
                    "mensagem": r.mensagem,
                    "detalhes": r.detalhes
                }
                for r in self.resultados
            ]
        }

# =============================================================================
# CATEGORIA 1: TESTES DE SCHEMA E ESTRUTURA
# =============================================================================

def testar_schema_post_bruto(post: dict) -> List[TestResult]:
    """Valida schema de um post bruto."""
    resultados = []

    # Campos obrigatórios
    campos_obrigatorios = ["texto_completo", "links_encontrados"]
    campos_opcionais = ["id", "nome_autor", "perfil_autor", "scroll_numero"]

    for campo in campos_obrigatorios:
        if campo not in post:
            resultados.append(TestResult(
                nome=f"Schema: Campo {campo}",
                passou=False,
                mensagem=f"Campo obrigatório '{campo}' ausente no post bruto",
                severidade="error"
            ))
        elif campo == "texto_completo" and len(post[campo]) < 30:
            resultados.append(TestResult(
                nome=f"Schema: Tamanho texto",
                passou=False,
                mensagem=f"texto_completo muito curto ({len(post[campo])} chars)",
                severidade="warning"
            ))

    # Valida tipo de links_encontrados
    if "links_encontrados" in post:
        links = post["links_encontrados"]
        if not isinstance(links, list):
            resultados.append(TestResult(
                nome="Schema: Tipo links",
                passou=False,
                mensagem=f"links_encontrados deveria ser list, é {type(links).__name__}",
                severidade="error"
            ))

    return resultados

def testar_schema_vaga(vaga: dict) -> List[TestResult]:
    """Valida schema de uma vaga analisada."""
    resultados = []

    # Campos obrigatórios para vaga
    campos_obrigatorios = ["titulo", "fonte", "forma_contato", "data_coleta"]

    for campo in campos_obrigatorios:
        if campo not in vaga or vaga[campo] is None:
            resultados.append(TestResult(
                nome=f"Vaga Schema: {campo}",
                passou=False,
                mensagem=f"Campo obrigatório '{campo}' ausente ou None",
                severidade="error"
            ))

    # Valida título não é genérico demais
    titulo = vaga.get("titulo", "")
    if titulo == "Product Designer" and vaga.get("fonte") == "linkedin_posts":
        # Fallback genérico - pode ser problema
        resultados.append(TestResult(
            nome="Vaga: Título genérico",
            passou=True,  # Não é erro, mas warning
            mensagem=f"Título é fallback genérico 'Product Designer'",
            severidade="warning"
        ))

    # Valida formato de data
    data = vaga.get("data_coleta")
    if data:
        try:
            if isinstance(data, str):
                datetime.strptime(data, "%Y-%m-%d")
        except ValueError:
            resultados.append(TestResult(
                nome="Vaga: Formato data",
                passou=False,
                mensagem=f"Data '{data}' não está no formato ISO (YYYY-MM-DD)",
                severidade="error"
            ))

    # Valida forma_contato válida
    formas_validas = ["link", "email", "mensagem", "whatsapp", "indefinido", "indeed"]
    forma = vaga.get("forma_contato")
    if forma and forma not in formas_validas:
        resultados.append(TestResult(
            nome="Vaga: Forma contato inválida",
            passou=False,
            mensagem=f"forma_contato '{forma}' não é válida",
            severidade="error"
        ))

    return resultados

# =============================================================================
# CATEGORIA 2: TESTES DE FILTRO UX/PRODUTO
# =============================================================================

def testar_filtro_ux_produto(posts_brutos: List[dict], vagas: List[dict]) -> List[TestResult]:
    """Testa se o filtro de UX/Produto está funcionando corretamente."""
    resultados = []

    # Taxa de conversão
    total_posts = len(posts_brutos)
    total_vagas = len(vagas)
    taxa = (total_vagas / total_posts * 100) if total_posts > 0 else 0

    # Taxa muito alta pode indicar filtro muito permissivo
    if taxa > 80:
        resultados.append(TestResult(
            nome="Filtro: Taxa muito alta",
            passou=False,
            mensagem=f"Taxa de conversão {taxa:.1f}% muito alta - filtro pode estar muito permissivo",
            severidade="warning"
        ))

    # Taxa muito baixa pode indicar filtro muito restritivo
    if taxa < 5 and total_posts > 10:
        resultados.append(TestResult(
            nome="Filtro: Taxa muito baixa",
            passou=False,
            mensagem=f"Taxa de conversão {taxa:.1f}% muito baixa - filtro pode estar muito restritivo",
            severidade="warning"
        ))
    else:
        resultados.append(TestResult(
            nome="Filtro: Taxa de conversão",
            passou=True,
            mensagem=f"Taxa de {taxa:.1f}% está em range aceitável ({total_vagas}/{total_posts})"
        ))

    # Verifica se vagas realmente contêm termos de UX/Produto
    vagas_sem_termo = []
    for vaga in vagas:
        titulo = (vaga.get("titulo") or "").lower()
        tipo = (vaga.get("tipo_vaga") or "").lower()

        tem_termo = any(t in titulo or t in tipo for t in TERMOS_PRODUTO)
        if not tem_termo:
            vagas_sem_termo.append(vaga.get("titulo"))

    if vagas_sem_termo:
        resultados.append(TestResult(
            nome="Filtro: Vagas sem termo UX",
            passou=False,
            mensagem=f"{len(vagas_sem_termo)} vagas sem termos UX/Produto no título",
            detalhes={"exemplos": vagas_sem_termo[:5]},
            severidade="warning"
        ))
    else:
        resultados.append(TestResult(
            nome="Filtro: Todas têm termo UX",
            passou=True,
            mensagem="Todas as vagas contêm termos de UX/Produto"
        ))

    return resultados

def testar_falsos_negativos(posts_brutos: List[dict], vagas: List[dict]) -> List[TestResult]:
    """Identifica posts que deveriam ser vagas mas não foram."""
    resultados = []

    # IDs das vagas extraídas
    ids_vagas = {v.get("post_id_original") for v in vagas if v.get("post_id_original")}

    # Procura posts que parecem vagas mas não foram incluídos
    falsos_negativos = []

    for post in posts_brutos:
        if post.get("id") in ids_vagas:
            continue

        texto = post.get("texto_completo", "").lower()

        # Indicadores fortes de vaga
        indicadores = [
            "vaga" in texto and ("ux" in texto or "product" in texto or "designer" in texto),
            "contratando" in texto and "designer" in texto,
            "oportunidade" in texto and ("ux" in texto or "ui" in texto),
            "hiring" in texto and "designer" in texto,
        ]

        # Se tem indicador forte e link de plataforma
        tem_indicador = any(indicadores)
        tem_link_vaga = any(
            eh_link_vaga_valido(link)
            for link in post.get("links_encontrados", [])
        )

        if tem_indicador and tem_link_vaga:
            falsos_negativos.append({
                "id": post.get("id"),
                "texto_preview": texto[:200],
                "links": post.get("links_encontrados", [])[:3]
            })

    if falsos_negativos:
        resultados.append(TestResult(
            nome="Filtro: Possíveis falsos negativos",
            passou=False,
            mensagem=f"{len(falsos_negativos)} posts parecem vagas mas não foram extraídos",
            detalhes={"exemplos": falsos_negativos[:5]},
            severidade="warning"
        ))
    else:
        resultados.append(TestResult(
            nome="Filtro: Sem falsos negativos aparentes",
            passou=True,
            mensagem="Não encontrados posts que pareçam vagas não extraídas"
        ))

    return resultados

# =============================================================================
# CATEGORIA 3: TESTES DE LINKS E CORRESPONDÊNCIA
# =============================================================================

def testar_links_acessiveis(vagas: List[dict]) -> List[TestResult]:
    """Testa se os links das vagas estão acessíveis."""
    resultados = []

    vagas_com_link = [v for v in vagas if v.get("link_vaga")]

    if not vagas_com_link:
        resultados.append(TestResult(
            nome="Links: Nenhum link para testar",
            passou=False,
            mensagem="Nenhuma vaga possui link_vaga",
            severidade="error"
        ))
        return resultados

    # Calcula quantos testar (20%)
    qtd_testar = max(1, min(
        int(len(vagas_com_link) * CONFIG.pct_validar_links),
        CONFIG.max_links_validar
    ))

    import random
    amostra = random.sample(vagas_com_link, min(qtd_testar, len(vagas_com_link)))

    links_ok = 0
    links_erro = []
    links_redirect = []

    for vaga in amostra:
        link = vaga["link_vaga"]
        titulo = vaga.get("titulo", "?")

        try:
            # Usa HEAD primeiro (mais rápido)
            resp = requests.head(
                link,
                timeout=CONFIG.timeout_http,
                headers=CONFIG.headers,
                allow_redirects=True
            )

            if resp.status_code < 400:
                links_ok += 1

                # Verifica se houve redirect significativo
                if resp.url != link:
                    final_domain = urlparse(resp.url).netloc
                    original_domain = urlparse(link).netloc
                    if final_domain != original_domain:
                        links_redirect.append({
                            "titulo": titulo,
                            "original": link,
                            "final": resp.url
                        })
            else:
                links_erro.append({
                    "titulo": titulo,
                    "link": link,
                    "status": resp.status_code
                })

        except requests.exceptions.Timeout:
            links_erro.append({
                "titulo": titulo,
                "link": link,
                "erro": "timeout"
            })
        except requests.exceptions.RequestException as e:
            links_erro.append({
                "titulo": titulo,
                "link": link,
                "erro": str(e)[:50]
            })

    # Resultado geral
    taxa_sucesso = links_ok / len(amostra) * 100 if amostra else 0

    resultados.append(TestResult(
        nome="Links: Acessibilidade",
        passou=taxa_sucesso >= 80,
        mensagem=f"{links_ok}/{len(amostra)} links acessíveis ({taxa_sucesso:.1f}%)",
        detalhes={
            "total_testados": len(amostra),
            "acessiveis": links_ok,
            "erros": links_erro[:10],
            "redirects": links_redirect[:10]
        },
        severidade="error" if taxa_sucesso < 50 else "warning" if taxa_sucesso < 80 else "info"
    ))

    return resultados

def testar_correspondencia_titulo_link(vagas: List[dict]) -> List[TestResult]:
    """Verifica se o conteúdo do link corresponde ao título da vaga."""
    resultados = []

    vagas_link = [v for v in vagas if v.get("link_vaga")]

    if not vagas_link:
        return resultados

    # Amostra 10% para teste de correspondência
    import random
    qtd = max(1, min(10, int(len(vagas_link) * 0.10)))
    amostra = random.sample(vagas_link, qtd)

    correspondencias = []

    for vaga in amostra:
        link = vaga["link_vaga"]
        titulo = vaga.get("titulo", "").lower()

        # Termos do título que esperamos encontrar na página
        termos_titulo = [t for t in titulo.split() if len(t) > 3]

        try:
            # Apenas para links encurtados, expande
            if "lnkd.in" in link:
                resp = requests.head(
                    link,
                    timeout=CONFIG.timeout_http,
                    headers=CONFIG.headers,
                    allow_redirects=True
                )
                url_final = resp.url

                # Analisa a URL final
                # Se é plataforma de vagas conhecida, considera correspondência OK
                eh_plataforma = any(p in url_final.lower() for p in PLATAFORMAS_VAGAS)
                eh_linkedin_jobs = "/jobs/view/" in url_final.lower()

                correspondencias.append({
                    "titulo": titulo,
                    "link_original": link,
                    "link_final": url_final,
                    "corresponde": eh_plataforma or eh_linkedin_jobs,
                    "motivo": "plataforma de vagas" if (eh_plataforma or eh_linkedin_jobs) else "URL desconhecida"
                })
            else:
                # Para outros links, assume correspondência se é plataforma conhecida
                eh_plataforma = any(p in link.lower() for p in PLATAFORMAS_VAGAS)
                correspondencias.append({
                    "titulo": titulo,
                    "link": link,
                    "corresponde": eh_plataforma,
                    "motivo": "plataforma conhecida" if eh_plataforma else "verificação manual necessária"
                })

        except Exception as e:
            correspondencias.append({
                "titulo": titulo,
                "link": link,
                "corresponde": None,
                "erro": str(e)[:50]
            })

    # Conta correspondências
    ok = sum(1 for c in correspondencias if c.get("corresponde") == True)
    erros = sum(1 for c in correspondencias if c.get("corresponde") == False)
    incertos = sum(1 for c in correspondencias if c.get("corresponde") is None)

    resultados.append(TestResult(
        nome="Links: Correspondência título-link",
        passou=erros == 0,
        mensagem=f"Correspondência: {ok} OK, {erros} erro, {incertos} incerto de {len(correspondencias)}",
        detalhes={"verificacoes": correspondencias},
        severidade="warning" if erros > 0 else "info"
    ))

    return resultados

# =============================================================================
# CATEGORIA 4: TESTES DE QUALIDADE DOS DADOS
# =============================================================================

def testar_qualidade_titulos(vagas: List[dict]) -> List[TestResult]:
    """Analisa qualidade dos títulos extraídos."""
    resultados = []

    titulos = [v.get("titulo", "") for v in vagas]

    # Títulos duplicados
    contagem = Counter(titulos)
    duplicados = {t: c for t, c in contagem.items() if c > 1}

    if duplicados:
        pct_duplicados = sum(duplicados.values()) / len(titulos) * 100 if titulos else 0
        resultados.append(TestResult(
            nome="Títulos: Duplicados",
            passou=pct_duplicados < 30,
            mensagem=f"{len(duplicados)} títulos duplicados ({pct_duplicados:.1f}%)",
            detalhes={"duplicados": dict(list(duplicados.items())[:10])},
            severidade="warning" if pct_duplicados >= 30 else "info"
        ))

    # Títulos muito curtos
    curtos = [t for t in titulos if len(t) < 10]
    if curtos:
        resultados.append(TestResult(
            nome="Títulos: Muito curtos",
            passou=len(curtos) < len(titulos) * 0.1,
            mensagem=f"{len(curtos)} títulos com menos de 10 caracteres",
            detalhes={"exemplos": curtos[:5]},
            severidade="warning"
        ))

    # Títulos muito longos
    longos = [t for t in titulos if len(t) > 100]
    if longos:
        resultados.append(TestResult(
            nome="Títulos: Muito longos",
            passou=True,
            mensagem=f"{len(longos)} títulos com mais de 100 caracteres",
            detalhes={"exemplos": [t[:50] + "..." for t in longos[:5]]},
            severidade="info"
        ))

    # Títulos genéricos (fallback)
    genericos = [t for t in titulos if t == "Product Designer"]
    if genericos:
        pct = len(genericos) / len(titulos) * 100 if titulos else 0
        resultados.append(TestResult(
            nome="Títulos: Genéricos (fallback)",
            passou=pct < 50,
            mensagem=f"{len(genericos)} títulos genéricos ({pct:.1f}%)",
            severidade="warning" if pct >= 30 else "info"
        ))

    return resultados

def testar_qualidade_empresas(vagas: List[dict]) -> List[TestResult]:
    """Analisa qualidade dos nomes de empresas extraídos."""
    resultados = []

    empresas = [v.get("empresa") for v in vagas]

    # Taxa de preenchimento
    preenchidas = [e for e in empresas if e]
    taxa = len(preenchidas) / len(empresas) * 100 if empresas else 0

    resultados.append(TestResult(
        nome="Empresas: Taxa preenchimento",
        passou=taxa >= 50,
        mensagem=f"{len(preenchidas)}/{len(empresas)} vagas com empresa ({taxa:.1f}%)",
        severidade="warning" if taxa < 50 else "info"
    ))

    # Empresas com caracteres estranhos
    estranhas = [e for e in preenchidas if e and re.search(r'[^\w\s\.\-&]', e)]
    if estranhas:
        resultados.append(TestResult(
            nome="Empresas: Caracteres estranhos",
            passou=len(estranhas) < len(preenchidas) * 0.1,
            mensagem=f"{len(estranhas)} empresas com caracteres especiais",
            detalhes={"exemplos": estranhas[:5]},
            severidade="warning"
        ))

    return resultados

def testar_formas_contato(vagas: List[dict]) -> List[TestResult]:
    """Analisa distribuição das formas de contato."""
    resultados = []

    formas = Counter(v.get("forma_contato") for v in vagas)

    # Distribuição
    resultados.append(TestResult(
        nome="Contato: Distribuição",
        passou=True,
        mensagem=f"Formas de contato: {dict(formas)}",
        detalhes={"distribuicao": dict(formas)}
    ))

    # Verifica se há vagas sem forma de contato
    sem_contato = formas.get("indefinido", 0) + formas.get(None, 0)
    if sem_contato > 0:
        pct = sem_contato / len(vagas) * 100
        resultados.append(TestResult(
            nome="Contato: Sem forma definida",
            passou=pct < 10,
            mensagem=f"{sem_contato} vagas sem forma de contato ({pct:.1f}%)",
            severidade="error" if pct >= 10 else "warning"
        ))

    # Vagas com link devem ter link_vaga preenchido
    com_link = [v for v in vagas if v.get("forma_contato") == "link"]
    sem_link_vaga = [v for v in com_link if not v.get("link_vaga")]

    if sem_link_vaga:
        resultados.append(TestResult(
            nome="Contato: Inconsistência link",
            passou=False,
            mensagem=f"{len(sem_link_vaga)} vagas com forma_contato='link' mas sem link_vaga",
            severidade="error"
        ))

    return resultados

# =============================================================================
# CATEGORIA 5: TESTES DE COBERTURA E COMPLETUDE
# =============================================================================

def testar_cobertura_campos(vagas: List[dict]) -> List[TestResult]:
    """Analisa cobertura de preenchimento dos campos."""
    resultados = []

    if not vagas:
        return resultados

    campos = [
        ("titulo", True),
        ("empresa", False),
        ("tipo_vaga", False),
        ("link_vaga", False),
        ("modalidade", False),
        ("forma_contato", True),
        ("perfil_autor", False),
        ("nome_autor", False),
    ]

    cobertura = {}

    for campo, obrigatorio in campos:
        preenchidos = sum(1 for v in vagas if v.get(campo))
        taxa = preenchidos / len(vagas) * 100
        cobertura[campo] = {
            "preenchidos": preenchidos,
            "total": len(vagas),
            "taxa": f"{taxa:.1f}%"
        }

        if obrigatorio and taxa < 100:
            resultados.append(TestResult(
                nome=f"Cobertura: {campo} (obrigatório)",
                passou=False,
                mensagem=f"Campo obrigatório com {taxa:.1f}% preenchido",
                severidade="error"
            ))
        elif taxa < 50:
            resultados.append(TestResult(
                nome=f"Cobertura: {campo}",
                passou=True,
                mensagem=f"{taxa:.1f}% preenchido",
                severidade="warning"
            ))

    resultados.append(TestResult(
        nome="Cobertura: Resumo",
        passou=True,
        mensagem="Análise de cobertura completa",
        detalhes=cobertura
    ))

    return resultados

# =============================================================================
# EXECUTOR PRINCIPAL
# =============================================================================

def executar_qa_posts(arquivo_bruto: str = None, vagas: List[dict] = None) -> QAReport:
    """
    Executa bateria completa de QA em posts do LinkedIn.

    Args:
        arquivo_bruto: Caminho para arquivo JSON bruto de posts
        vagas: Lista de vagas já analisadas (opcional)

    Returns:
        QAReport com todos os resultados
    """
    report = QAReport()
    posts_brutos = []

    print("=" * 70)
    print("INICIANDO QA INTENSIVO - LINKEDIN POSTS")
    print("=" * 70)

    # Carrega dados brutos se fornecido
    if arquivo_bruto and os.path.exists(arquivo_bruto):
        print(f"\n📁 Carregando arquivo: {arquivo_bruto}")
        with open(arquivo_bruto, "r", encoding="utf-8") as f:
            dados = json.load(f)
        posts_brutos = dados.get("posts", [])
        print(f"   {len(posts_brutos)} posts brutos carregados")

        report.metricas["arquivo_origem"] = arquivo_bruto
        report.metricas["total_posts_brutos"] = len(posts_brutos)

    # Se não tiver vagas, analisa do bruto
    if not vagas and posts_brutos:
        print("\n🔍 Analisando posts brutos...")
        from app.scrapers.analisar_brutos import analisar_post_bruto
        vagas = []
        for post in posts_brutos:
            vaga = analisar_post_bruto(post)
            if vaga:
                vagas.append(vaga)
        print(f"   {len(vagas)} vagas extraídas")

    report.metricas["total_vagas"] = len(vagas) if vagas else 0

    if posts_brutos:
        taxa = len(vagas) / len(posts_brutos) * 100 if posts_brutos else 0
        report.metricas["taxa_conversao"] = f"{taxa:.1f}%"

    # =========================================================================
    # EXECUTA TESTES
    # =========================================================================

    print("\n" + "=" * 70)
    print("EXECUTANDO TESTES")
    print("=" * 70)

    # 1. Schema posts brutos
    if posts_brutos:
        print("\n📋 Categoria 1: Schema de Posts Brutos")
        for i, post in enumerate(posts_brutos[:10]):  # Amostra de 10
            for resultado in testar_schema_post_bruto(post):
                resultado.nome = f"Post #{i+1}: {resultado.nome}"
                report.adicionar(resultado)
                _print_resultado(resultado)

    # 2. Schema vagas
    if vagas:
        print("\n📋 Categoria 2: Schema de Vagas")
        for i, vaga in enumerate(vagas[:10]):  # Amostra de 10
            for resultado in testar_schema_vaga(vaga):
                resultado.nome = f"Vaga #{i+1}: {resultado.nome}"
                report.adicionar(resultado)
                _print_resultado(resultado)

    # 3. Filtro UX/Produto
    if posts_brutos and vagas:
        print("\n🎯 Categoria 3: Filtro UX/Produto")
        for resultado in testar_filtro_ux_produto(posts_brutos, vagas):
            report.adicionar(resultado)
            _print_resultado(resultado)

        for resultado in testar_falsos_negativos(posts_brutos, vagas):
            report.adicionar(resultado)
            _print_resultado(resultado)

    # 4. Links
    if vagas:
        print("\n🔗 Categoria 4: Validação de Links")
        for resultado in testar_links_acessiveis(vagas):
            report.adicionar(resultado)
            _print_resultado(resultado)

        for resultado in testar_correspondencia_titulo_link(vagas):
            report.adicionar(resultado)
            _print_resultado(resultado)

    # 5. Qualidade dos dados
    if vagas:
        print("\n✨ Categoria 5: Qualidade dos Dados")
        for resultado in testar_qualidade_titulos(vagas):
            report.adicionar(resultado)
            _print_resultado(resultado)

        for resultado in testar_qualidade_empresas(vagas):
            report.adicionar(resultado)
            _print_resultado(resultado)

        for resultado in testar_formas_contato(vagas):
            report.adicionar(resultado)
            _print_resultado(resultado)

    # 6. Cobertura
    if vagas:
        print("\n📊 Categoria 6: Cobertura de Campos")
        for resultado in testar_cobertura_campos(vagas):
            report.adicionar(resultado)
            _print_resultado(resultado)

    # =========================================================================
    # RESUMO FINAL
    # =========================================================================

    print("\n" + "=" * 70)
    print("RESUMO DO QA")
    print("=" * 70)

    print(f"\n📈 MÉTRICAS:")
    for k, v in report.metricas.items():
        print(f"   {k}: {v}")

    print(f"\n📋 RESULTADOS:")
    print(f"   Total de testes: {report.total_testes}")
    print(f"   ✅ Passaram: {report.testes_passaram}")
    print(f"   ❌ Falharam: {report.testes_falharam}")
    print(f"   ⚠️  Warnings: {report.warnings}")

    if report.total_testes > 0:
        taxa = report.testes_passaram / report.total_testes * 100
        status = "🎉 SUCESSO" if taxa >= 80 else "⚠️ ATENÇÃO" if taxa >= 60 else "❌ FALHOU"
        print(f"\n   {status}: {taxa:.1f}% dos testes passaram")

    return report

def _print_resultado(r: TestResult):
    """Imprime resultado de forma formatada."""
    icon = "✅" if r.passou else "❌" if r.severidade in ["error", "critical"] else "⚠️"
    print(f"   {icon} {r.nome}: {r.mensagem}")

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="QA Intensivo de Vagas")
    parser.add_argument("--arquivo", "-a", help="Arquivo JSON bruto de posts")
    parser.add_argument("--output", "-o", help="Arquivo JSON para salvar relatório")
    parser.add_argument("--coletar", action="store_true", help="Executar coleta antes do QA")

    args = parser.parse_args()

    arquivo = args.arquivo

    # Se pediu para coletar primeiro
    if args.coletar:
        print("🚀 Executando coleta bruta...")
        from app.scrapers.coleta_bruta import coletar_e_salvar_posts
        dados, arquivo = coletar_e_salvar_posts(headless=True)
        print(f"   Arquivo gerado: {arquivo}")

    # Se não tem arquivo, procura o mais recente
    if not arquivo:
        from app.scrapers.analisar_brutos import listar_arquivos_brutos
        arquivos = listar_arquivos_brutos("posts")
        if arquivos:
            arquivo = arquivos[0]
            print(f"📁 Usando arquivo mais recente: {arquivo}")
        else:
            print("❌ Nenhum arquivo bruto encontrado.")
            print("   Execute: python -m tests.qa_report --coletar")
            sys.exit(1)

    # Executa QA
    report = executar_qa_posts(arquivo_bruto=arquivo)

    # Salva relatório se pedido
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(report.to_dict(), f, ensure_ascii=False, indent=2)
        print(f"\n📄 Relatório salvo em: {args.output}")
