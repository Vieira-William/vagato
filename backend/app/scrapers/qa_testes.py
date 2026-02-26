#!/usr/bin/env python3
"""
Testes de QA para validar a coleta de vagas.
Execute após implementar correções para verificar se tudo funciona.

Uso:
    python -m app.scrapers.qa_testes
    python -m app.scrapers.qa_testes --posts-only
    python -m app.scrapers.qa_testes --jobs-only
"""

import sys
import os
import requests
from datetime import date

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.scrapers.coleta_bruta import coletar_e_salvar_posts, coletar_e_salvar_jobs
from app.scrapers.analisar_brutos import analisar_arquivo_posts, analisar_arquivo_jobs


# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(texto):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{texto}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")


def print_ok(texto):
    print(f"{Colors.GREEN}✓ {texto}{Colors.RESET}")


def print_erro(texto):
    print(f"{Colors.RED}✗ {texto}{Colors.RESET}")


def print_warn(texto):
    print(f"{Colors.YELLOW}⚠ {texto}{Colors.RESET}")


def testar_vagas_posts(vagas: list) -> list:
    """
    Valida vagas coletadas de posts.
    Retorna lista de erros.
    """
    erros = []

    if not vagas:
        erros.append("Nenhuma vaga coletada de posts")
        return erros

    # Deve ter pelo menos 5 vagas
    if len(vagas) < 5:
        erros.append(f"Poucas vagas coletadas: {len(vagas)} (esperado: 5+)")

    for i, vaga in enumerate(vagas[:10]):
        # 1. Título deve existir e ter sentido
        titulo = vaga.get("titulo")
        if not titulo or len(titulo) < 5:
            erros.append(f"Vaga {i+1}: Título inválido ou ausente")
            continue

        # 2. Título deve conter termos de UX/Produto
        termos_validos = ["ux", "ui", "product", "designer", "design", "produto", "manager", "owner", "research"]
        titulo_lower = titulo.lower()
        if not any(t in titulo_lower for t in termos_validos):
            erros.append(f"Vaga {i+1}: Título '{titulo}' não parece ser UX/Produto")

        # 3. Forma de contato deve existir e ser válida
        forma_contato = vaga.get("forma_contato")
        formas_validas = ["link", "email", "mensagem", "whatsapp"]
        if not forma_contato or forma_contato not in formas_validas:
            erros.append(f"Vaga {i+1}: Forma de contato inválida: {forma_contato}")

        # 4. Se forma_contato é link, deve ter link_vaga
        if forma_contato == "link":
            link = vaga.get("link_vaga")
            if not link:
                erros.append(f"Vaga {i+1}: Forma de contato é 'link' mas link_vaga está vazio")
            elif not link.startswith("http"):
                erros.append(f"Vaga {i+1}: Link inválido: {link}")

        # 5. Se forma_contato é email, deve ter email_contato
        if forma_contato == "email":
            email = vaga.get("email_contato")
            if not email or "@" not in email:
                erros.append(f"Vaga {i+1}: Forma de contato é 'email' mas email_contato inválido")

    return erros


def testar_links_acessiveis(vagas: list, max_testes: int = 5) -> list:
    """
    Para as primeiras vagas com link, faz HTTP HEAD para verificar se link existe.
    """
    erros = []
    testados = 0

    for vaga in vagas:
        if testados >= max_testes:
            break

        link = vaga.get("link_vaga")
        if link and link.startswith("http"):
            try:
                # Usa HEAD para ser mais rápido
                resp = requests.head(
                    link,
                    timeout=10,
                    allow_redirects=True,
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                if resp.status_code >= 400:
                    erros.append(f"Link quebrado ({resp.status_code}): {link[:50]}...")
                testados += 1
            except requests.exceptions.Timeout:
                erros.append(f"Link timeout: {link[:50]}...")
                testados += 1
            except requests.exceptions.RequestException as e:
                erros.append(f"Link inacessível ({str(e)[:30]}): {link[:50]}...")
                testados += 1

    return erros


def testar_correspondencia_titulo_link(vagas: list, max_testes: int = 5) -> list:
    """
    Para vagas com link lnkd.in, expande o link e verifica se faz sentido.
    """
    erros = []
    testados = 0

    plataformas_validas = ["gupy", "lever", "greenhouse", "workable", "jobs",
                          "vagas", "linkedin", "99jobs", "catho", "trampos"]

    for vaga in vagas:
        if testados >= max_testes:
            break

        link = vaga.get("link_vaga")
        titulo = vaga.get("titulo", "")

        if link and "lnkd.in" in link:
            try:
                resp = requests.head(link, allow_redirects=True, timeout=10,
                                   headers={"User-Agent": "Mozilla/5.0"})
                url_final = resp.url

                # Verifica se URL final é plataforma de vagas conhecida
                url_lower = url_final.lower()
                if not any(p in url_lower for p in plataformas_validas):
                    # Não é plataforma conhecida - pode ainda ser válido mas merece atenção
                    print_warn(f"  Link '{link[:30]}' redireciona para: {url_final[:50]}...")

                testados += 1
            except:
                pass

    return erros


def testar_linkedin_jobs(vagas: list) -> list:
    """
    Valida vagas coletadas do LinkedIn Jobs.
    """
    erros = []

    if not vagas:
        erros.append("Nenhuma vaga coletada do LinkedIn Jobs")
        return erros

    # 1. Deve ter mais que 20 vagas (LinkedIn tem muitas)
    if len(vagas) < 20:
        erros.append(f"Poucas vagas coletadas: {len(vagas)} (esperado: 20+)")

    # 2. Verificar se veio de múltiplas páginas (links diferentes)
    links = [v.get("link_vaga") for v in vagas if v.get("link_vaga")]
    job_ids = set()
    for link in links:
        if "/jobs/view/" in link:
            try:
                job_id = link.split("/jobs/view/")[1].split("/")[0].split("?")[0]
                job_ids.add(job_id)
            except:
                pass

    if len(job_ids) < len(vagas) * 0.9:
        erros.append(f"Muitos links duplicados: {len(job_ids)} únicos de {len(vagas)} vagas")

    # 3. Títulos devem ser UX/Produto
    titulos_invalidos = 0
    for vaga in vagas[:20]:
        titulo = (vaga.get("titulo") or "").lower()
        termos = ["ux", "ui", "product", "designer", "design", "produto", "manager", "owner"]
        if not any(t in titulo for t in termos):
            titulos_invalidos += 1

    if titulos_invalidos > 5:
        erros.append(f"{titulos_invalidos} vagas com títulos não relacionados a UX/Produto")

    # 4. Todos devem ter link_vaga
    sem_link = sum(1 for v in vagas if not v.get("link_vaga"))
    if sem_link > 0:
        erros.append(f"{sem_link} vagas sem link_vaga")

    # 5. Verificar se extraiu detalhes (nível, modalidade)
    sem_nivel = sum(1 for v in vagas if v.get("nivel") == "nao_especificado")
    sem_modalidade = sum(1 for v in vagas if v.get("modalidade") == "nao_especificado")

    if sem_nivel > len(vagas) * 0.8:
        print_warn(f"  {sem_nivel}/{len(vagas)} vagas sem nível extraído")
    if sem_modalidade > len(vagas) * 0.8:
        print_warn(f"  {sem_modalidade}/{len(vagas)} vagas sem modalidade extraída")

    return erros


def executar_testes_posts():
    """Executa testes para coleta de posts (pipeline 2 etapas)."""
    print_header("TESTE: LinkedIn Posts")

    print("\nEtapa 1: Coletando posts brutos...")
    dados, arquivo = coletar_e_salvar_posts(headless=True)
    print(f"  Coletados: {dados.get('total_posts', 0)} posts brutos")

    print("Etapa 2: Analisando e filtrando vagas UX...")
    resultado = analisar_arquivo_posts(arquivo)
    vagas_posts = resultado.get("vagas", [])
    print(f"\nTotal filtrado: {len(vagas_posts)} vagas UX (taxa: {resultado.get('taxa_conversao', 'N/A')})")

    # Teste 1: Validação básica
    print("\n[1] Validação básica de posts:")
    erros = testar_vagas_posts(vagas_posts)
    for e in erros:
        print_erro(f"  {e}")
    if not erros:
        print_ok("  Todas as validações passaram")

    # Teste 2: Links acessíveis
    print("\n[2] Testando acessibilidade de links:")
    erros_links = testar_links_acessiveis(vagas_posts)
    for e in erros_links:
        print_erro(f"  {e}")
    if not erros_links:
        print_ok("  Todos os links testados estão acessíveis")

    # Teste 3: Correspondência título-link
    print("\n[3] Verificando correspondência título-link:")
    erros_corresp = testar_correspondencia_titulo_link(vagas_posts)
    for e in erros_corresp:
        print_erro(f"  {e}")
    if not erros_corresp:
        print_ok("  Verificação concluída")

    # Mostra amostra das vagas
    print("\n[Amostra] Primeiras 5 vagas coletadas:")
    for i, v in enumerate(vagas_posts[:5]):
        print(f"  {i+1}. {v.get('titulo', 'SEM TÍTULO')[:50]}")
        print(f"     Contato: {v.get('forma_contato')} | Link: {(v.get('link_vaga') or 'N/A')[:40]}")

    return len(erros) + len(erros_links), vagas_posts


def executar_testes_jobs():
    """Executa testes para coleta de LinkedIn Jobs (pipeline 2 etapas)."""
    print_header("TESTE: LinkedIn Jobs")

    print("\nEtapa 1: Coletando vagas brutas do LinkedIn Jobs...")
    dados, arquivo = coletar_e_salvar_jobs(headless=True)
    print(f"  Coletadas: {dados.get('total_vagas', 0)} vagas brutas")

    print("Etapa 2: Analisando e filtrando vagas UX...")
    resultado = analisar_arquivo_jobs(arquivo)
    vagas_jobs = resultado.get("vagas", [])
    print(f"\nTotal filtrado: {len(vagas_jobs)} vagas UX (taxa: {resultado.get('taxa_conversao', 'N/A')})")

    # Teste 1: Validação de jobs
    print("\n[1] Validação de LinkedIn Jobs:")
    erros = testar_linkedin_jobs(vagas_jobs)
    for e in erros:
        print_erro(f"  {e}")
    if not erros:
        print_ok("  Todas as validações passaram")

    # Teste 2: Links acessíveis
    print("\n[2] Testando acessibilidade de links:")
    erros_links = testar_links_acessiveis(vagas_jobs)
    for e in erros_links:
        print_erro(f"  {e}")
    if not erros_links:
        print_ok("  Todos os links testados estão acessíveis")

    # Mostra amostra das vagas
    print("\n[Amostra] Primeiras 5 vagas coletadas:")
    for i, v in enumerate(vagas_jobs[:5]):
        print(f"  {i+1}. {v.get('titulo', 'SEM TÍTULO')[:50]} @ {v.get('empresa', '?')[:20]}")
        print(f"     Nível: {v.get('nivel')} | Modalidade: {v.get('modalidade')}")

    return len(erros) + len(erros_links), vagas_jobs


def main():
    """Executa todos os testes de QA."""
    print_header("TESTES DE QA - SCRAPERS")
    print(f"Data: {date.today().isoformat()}")

    # Parse argumentos
    posts_only = "--posts-only" in sys.argv
    jobs_only = "--jobs-only" in sys.argv

    total_erros = 0

    if not jobs_only:
        erros_posts, vagas_posts = executar_testes_posts()
        total_erros += erros_posts

    if not posts_only:
        erros_jobs, vagas_jobs = executar_testes_jobs()
        total_erros += erros_jobs

    # Resumo final
    print_header("RESULTADO FINAL")

    if total_erros == 0:
        print_ok(f"TODOS OS TESTES PASSARAM!")
    else:
        print_erro(f"{total_erros} ERROS ENCONTRADOS")

    if not posts_only and not jobs_only:
        total_vagas = len(vagas_posts) + len(vagas_jobs)
        print(f"\nTotal de vagas coletadas: {total_vagas}")
        print(f"  - Posts: {len(vagas_posts)}")
        print(f"  - Jobs: {len(vagas_jobs)}")

    return 0 if total_erros == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
