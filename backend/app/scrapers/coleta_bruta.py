#!/usr/bin/env python3
"""
Coleta bruta de posts e vagas SEM filtro.
Salva tudo em arquivos JSON para análise posterior.

Arquitetura de 2 etapas:
1. ETAPA 1 (este arquivo): Coleta bruta → JSON
2. ETAPA 2 (analisar_brutos.py): JSON → Análise com IA → Banco de dados
"""

import json
import os
import re
from datetime import datetime
try:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
except ImportError:
    By = None
    Keys = None
import time

from .login_helper import criar_driver_com_perfil, garantir_login_linkedin

# Diretório para salvar arquivos brutos
BRUTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "brutos")
os.makedirs(BRUTOS_DIR, exist_ok=True)


def gerar_nome_arquivo(fonte: str) -> str:
    """Gera nome de arquivo com timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    return os.path.join(BRUTOS_DIR, f"{fonte}_{timestamp}.json")


def salvar_bruto(dados: dict, fonte: str) -> str:
    """Salva dados brutos em JSON e retorna caminho do arquivo."""
    arquivo = gerar_nome_arquivo(fonte)
    with open(arquivo, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    print(f"Arquivo bruto salvo: {arquivo}")
    return arquivo


def coletar_posts_brutos(max_scrolls: int = 200, headless: bool = True, progress_callback=None, custom_url: str = None) -> dict:
    """
    Coleta TODOS os posts do LinkedIn SEM filtrar por UX/Produto.

    Returns:
        Dict com metadados e lista de posts brutos
    """
    url = custom_url or "https://www.linkedin.com/search/results/content/?keywords=ux%20vaga&datePosted=%22past-24h%22&sortBy=%22date_posted%22"
    driver = None
    posts = []
    textos_vistos = set()
    scrolls_sem_mudanca = 0
    ultima_altura = 0

    resultado = {
        "fonte": "linkedin_posts",
        "url_busca": url,
        "data_coleta": datetime.now().isoformat(),
        "total_posts": 0,
        "scrolls_realizados": 0,
        "posts": []
    }

    try:
        driver = criar_driver_com_perfil(headless=headless)
        
        if not garantir_login_linkedin(driver):
            print("ERRO: Não foi possível fazer login no LinkedIn (Posts)")
            resultado["erro"] = "Login falhou"
            return resultado
            
        driver.get(url)
        time.sleep(5)

        url_atual = driver.current_url
        print(f"URL: {url_atual}")
        print("Coletando TODOS os posts (sem filtro)...")
        resultado["url_final"] = url_atual

        # Clica no body para focar
        try:
            body = driver.find_element(By.TAG_NAME, "body")
            body.click()
        except Exception:
            pass  # Foco no body é opcional

        for i in range(max_scrolls):
            # Scroll
            try:
                body = driver.find_element(By.TAG_NAME, "body")
                for _ in range(5):
                    body.send_keys(Keys.PAGE_DOWN)
                    time.sleep(0.3)
            except Exception:
                driver.execute_script("window.scrollBy(0, 1000);")
            time.sleep(2.5)

            # Coleta texto da página e divide por posts
            body_text = driver.find_element(By.TAG_NAME, "body").text
            partes = body_text.split("Publicação no feed")

            # Coleta todos os links da página
            all_links = driver.find_elements(By.TAG_NAME, "a")
            links_pagina = []
            for link in all_links:
                try:
                    href = link.get_attribute("href") or ""
                    if href:
                        links_pagina.append(href)
                except Exception:
                    pass  # Elemento stale ou sem href é normal

            # Processa cada post
            for idx, parte in enumerate(partes[1:]):
                texto = parte.split("Gostar")[0].strip()
                if len(texto) < 30:
                    continue

                texto_hash = hash(texto[:300])
                if texto_hash in textos_vistos:
                    continue
                textos_vistos.add(texto_hash)

                # Extrai autor das primeiras linhas (evita timestamps como "3 h", "41 min")
                nome_autor = None
                linhas = texto.split('\n')
                for linha in linhas[:5]:
                    if '•' in linha:
                        candidato = linha.split('•')[0].strip()
                        # Ignora timestamps capturados como nome (ex: "3 h", "41 min", "2 d")
                        if candidato and not re.match(r'^\d+\s*(min|h|d|sem|mês|meses|s)$', candidato):
                            nome_autor = candidato
                            break

                # Busca links associados (aproximação por posição)
                start_idx = max(0, idx * 10)
                end_idx = min(len(links_pagina), (idx + 1) * 15)
                links_post = []
                perfil_autor = None

                for href in links_pagina[start_idx:end_idx]:
                    if "/in/" in href and not perfil_autor:
                        perfil_autor = href.split("?")[0]
                    elif "lnkd.in" in href or "/jobs/view/" in href:
                        links_post.append(href.split("?")[0])
                    elif href.startswith("http") and "linkedin.com" not in href:
                        links_post.append(href.split("?")[0])

                # Também extrai links do texto
                links_no_texto = re.findall(r'https?://[^\s<>"{}|\\^`\[\])(\'\)]+', texto)
                for link in links_no_texto:
                    link_limpo = link.rstrip('.,;:!?')
                    if link_limpo not in links_post:
                        links_post.append(link_limpo)

                posts.append({
                    "id": len(posts) + 1,
                    "texto_completo": texto[:2000],  # Limita tamanho
                    "nome_autor": nome_autor,
                    "perfil_autor": perfil_autor,
                    "links_encontrados": list(set(links_post))[:10],  # Max 10 links
                    "scroll_numero": i + 1
                })

            # Progresso
            if i % 5 == 0:
                print(f"  Scroll {i+1}: {len(posts)} posts coletados")

            if progress_callback:
                progress_callback({
                    "tipo": "coleta_bruta",
                    "scroll_atual": i + 1,
                    "total_posts": len(posts),
                    "progresso": min(90, 30 + int((scrolls_sem_mudanca / 5) * 60)) if len(posts) > 0 else min(30, i * 3)
                })

            # Detecção de fim
            altura_atual = driver.execute_script("return document.body.scrollHeight")

            # Verifica mensagem de fim
            mensagens_fim = ["Você viu todas as publicações", "You've seen all posts"]
            if any(msg.lower() in body_text.lower() for msg in mensagens_fim):
                print(f"  Fim do feed detectado (mensagem) após {i+1} scrolls")
                break

            if altura_atual == ultima_altura and len(posts) == len(textos_vistos):
                scrolls_sem_mudanca += 1
                if scrolls_sem_mudanca >= 5 and len(posts) > 0:
                    print(f"  Fim do feed - {scrolls_sem_mudanca} scrolls sem novos posts")
                    break
            else:
                scrolls_sem_mudanca = 0

            ultima_altura = altura_atual

        resultado["posts"] = posts
        resultado["total_posts"] = len(posts)
        resultado["scrolls_realizados"] = i + 1

        print(f"\nTotal: {len(posts)} posts brutos coletados em {i+1} scrolls")
        return resultado

    except Exception as e:
        print(f"Erro na coleta: {e}")
        resultado["erro"] = str(e)
        resultado["posts"] = posts
        resultado["total_posts"] = len(posts)
        return resultado

    finally:
        if driver:
            driver.quit()


def coletar_jobs_brutos(max_paginas: int = 20, headless: bool = True, progress_callback=None, custom_url: str = None) -> dict:
    """
    Coleta TODAS as vagas do LinkedIn Jobs SEM filtrar por UX/Produto.

    Returns:
        Dict com metadados e lista de vagas brutas
    """
    base_url = custom_url or "https://www.linkedin.com/jobs/search/?f_TPR=r86400&f_WT=2&keywords=Product%20Designer&sortBy=R"
    driver = None
    vagas = []
    links_vistos = set()

    resultado = {
        "fonte": "linkedin_jobs",
        "url_busca": base_url,
        "data_coleta": datetime.now().isoformat(),
        "total_vagas": 0,
        "paginas_coletadas": 0,
        "vagas": []
    }

    try:
        driver = criar_driver_com_perfil(headless=headless)

        if not garantir_login_linkedin(driver):
            print("ERRO: Não foi possível fazer login no LinkedIn")
            resultado["erro"] = "Login falhou"
            return resultado

        driver.get(base_url)
        time.sleep(3)

        url_atual = driver.current_url
        print(f"URL: {url_atual}")
        resultado["url_final"] = url_atual

        # Loop de páginas
        for pagina in range(1, max_paginas + 1):
            print(f"Página {pagina}...")

            try:
                lista = driver.find_element(By.CSS_SELECTOR, "div.scaffold-layout__list")
            except Exception:
                print("  Lista de vagas não encontrada")
                break

            # Scroll na lista para carregar todos os cards
            ultima_scroll_pos = 0
            scrolls_sem_mudanca = 0

            for scroll in range(100):
                cards = driver.find_elements(By.CSS_SELECTOR, "li.scaffold-layout__list-item[data-occludable-job-id]")

                for card in cards:
                    try:
                        job_id = card.get_attribute("data-occludable-job-id")
                        if not job_id:
                            continue

                        link_vaga = f"https://www.linkedin.com/jobs/view/{job_id}"
                        if link_vaga in links_vistos:
                            continue
                        links_vistos.add(link_vaga)

                        # Extrai dados básicos
                        titulo = None
                        empresa = None
                        localizacao = None

                        try:
                            titulo = card.find_element(By.CSS_SELECTOR, "a strong").text.strip()
                        except Exception:
                            try:
                                titulo = card.find_element(By.CSS_SELECTOR, "strong").text.strip()
                            except Exception:
                                pass  # Card sem título será ignorado pelo check abaixo

                        if not titulo:
                            continue

                        try:
                            empresa = card.find_element(By.CSS_SELECTOR, ".artdeco-entity-lockup__subtitle").text.strip()
                        except Exception:
                            pass  # Empresa nem sempre está presente

                        try:
                            localizacao = card.find_element(By.CSS_SELECTOR, ".artdeco-entity-lockup__caption").text.strip()
                        except Exception:
                            pass  # Localização nem sempre está presente

                        vagas.append({
                            "id": len(vagas) + 1,
                            "job_id": job_id,
                            "titulo": titulo,
                            "empresa": empresa,
                            "localizacao": localizacao,
                            "link_vaga": link_vaga,
                            "pagina": pagina
                        })

                    except Exception:
                        continue  # Card malformado, pula

                # Scroll
                driver.execute_script("arguments[0].scrollTop += 300", lista)
                time.sleep(0.2)

                scroll_pos = driver.execute_script("return arguments[0].scrollTop", lista)
                scroll_height = driver.execute_script("return arguments[0].scrollHeight", lista)
                client_height = driver.execute_script("return arguments[0].clientHeight", lista)

                if scroll_pos == ultima_scroll_pos:
                    scrolls_sem_mudanca += 1
                    if scrolls_sem_mudanca >= 8:
                        break
                else:
                    scrolls_sem_mudanca = 0
                ultima_scroll_pos = scroll_pos

                if scroll_pos + client_height >= scroll_height - 50:
                    time.sleep(0.5)
                    new_height = driver.execute_script("return arguments[0].scrollHeight", lista)
                    if new_height == scroll_height:
                        break

            print(f"  {len(vagas)} vagas coletadas (total)")

            if progress_callback:
                progress_callback({
                    "tipo": "coleta_bruta",
                    "pagina_atual": pagina,
                    "total_vagas": len(vagas),
                    "progresso": min(95, int((pagina / max_paginas) * 100))
                })

            # Próxima página
            if pagina < max_paginas:
                try:
                    seletores = [
                        "button[aria-label='View next page']",
                        "button[aria-label='Ver próxima página']",
                        ".artdeco-pagination__button--next",
                    ]
                    next_btn = None
                    for selector in seletores:
                        try:
                            btns = driver.find_elements(By.CSS_SELECTOR, selector)
                            for btn in btns:
                                if not btn.get_attribute("disabled") and btn.is_displayed():
                                    next_btn = btn
                                    break
                            if next_btn:
                                break
                        except Exception:
                            continue  # Selector não encontrado, tenta o próximo

                    if next_btn:
                        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_btn)
                        time.sleep(0.5)
                        driver.execute_script("arguments[0].click();", next_btn)
                        time.sleep(4)
                    else:
                        print("  Última página")
                        break
                except Exception as e:
                    print(f"  Erro na paginação: {e}")
                    break

        resultado["vagas"] = vagas
        resultado["total_vagas"] = len(vagas)
        resultado["paginas_coletadas"] = pagina

        print(f"\nTotal: {len(vagas)} vagas brutas coletadas de {pagina} páginas")
        return resultado

    except Exception as e:
        print(f"Erro na coleta: {e}")
        resultado["erro"] = str(e)
        resultado["vagas"] = vagas
        resultado["total_vagas"] = len(vagas)
        return resultado

    finally:
        if driver:
            driver.quit()


def coletar_indeed_brutos(max_paginas: int = 5, headless: bool = True, progress_callback=None, custom_url: str = None) -> dict:
    """
    Coleta TODAS as vagas do Indeed SEM filtrar por UX/Produto.

    Returns:
        Dict com metadados e lista de vagas brutas
    """
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    import re

    base_url = custom_url or "https://br.indeed.com/empregos?q=UX+Designer+OR+Product+Designer&l=Brasil&fromage=1"
    driver = None
    vagas = []
    links_vistos = set()

    resultado = {
        "fonte": "indeed",
        "url_busca": base_url,
        "data_coleta": datetime.now().isoformat(),
        "total_vagas": 0,
        "paginas_coletadas": 0,
        "vagas": []
    }

    try:
        # Cria driver headless para Indeed (não precisa de login)
        options = ChromeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--lang=pt-BR")
        options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

        from selenium import webdriver
        driver = webdriver.Chrome(options=options)

        for pagina in range(max_paginas):
            offset = pagina * 10
            url = f"{base_url}&start={offset}" if pagina > 0 else base_url

            print(f"  Página {pagina + 1}/{max_paginas} (offset={offset})...")
            driver.get(url)

            # Aguardar carregamento
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.job_seen_beacon, td.resultContent"))
                )
            except Exception:
                print(f"    Nenhum card encontrado na página {pagina + 1}, finalizando")
                break

            time.sleep(2)

            # Encontrar cards de vagas
            job_cards = driver.find_elements(By.CSS_SELECTOR, "div.job_seen_beacon, td.resultContent")
            total_cards = len(job_cards)

            if total_cards == 0:
                print(f"    Página {pagina + 1} vazia, finalizando")
                break

            print(f"    Encontrados {total_cards} cards")

            vagas_na_pagina = 0
            ultima_descricao = None  # Para detectar descrições repetidas (cache do DOM)
            for idx, card in enumerate(job_cards):
                try:
                    # Título e link (SEM filtro - coleta TUDO)
                    title_elem = card.find_element(By.CSS_SELECTOR, "h2.jobTitle a, a.jcs-JobTitle, h2 a")
                    titulo = title_elem.text.strip()

                    if not titulo:
                        continue

                    href = title_elem.get_attribute("href") or ""

                    # Extrair vjk do link
                    vjk_match = re.search(r"vjk=([^&]+)", href)
                    if vjk_match:
                        link_vaga = f"https://br.indeed.com/viewjob?vjk={vjk_match.group(1)}"
                    else:
                        link_vaga = href

                    # Evitar duplicatas entre páginas
                    if link_vaga in links_vistos:
                        continue
                    links_vistos.add(link_vaga)

                    # Empresa
                    empresa = None
                    try:
                        company_elem = card.find_element(By.CSS_SELECTOR, "[data-testid='company-name'], .companyName")
                        empresa = company_elem.text.strip()
                    except Exception:
                        pass  # Card sem empresa é normal no Indeed

                    # Localização
                    localizacao = None
                    try:
                        location_elem = card.find_element(By.CSS_SELECTOR, "[data-testid='text-location'], .companyLocation")
                        localizacao = location_elem.text.strip()
                    except Exception:
                        pass  # Card sem localização é aceitável

                    # Descrição do card (clica para abrir painel lateral)
                    descricao = None
                    try:
                        driver.execute_script("arguments[0].click();", card)
                        time.sleep(1.5)  # Mais tempo para o painel atualizar
                        desc_elem = driver.find_element(By.CSS_SELECTOR, "#jobDescriptionText, .jobsearch-JobComponent-description")
                        texto_desc = desc_elem.text[:3000] if desc_elem.text else None
                        # Evita repetir a descrição do card anterior (cache do DOM)
                        if texto_desc and texto_desc != ultima_descricao:
                            descricao = texto_desc
                            ultima_descricao = texto_desc
                        elif texto_desc:
                            print(f"    ⚠ Descrição repetida para '{titulo}' (cache do DOM)")
                    except Exception as e:
                        print(f"    Falha ao extrair descrição de '{titulo}': {type(e).__name__}")

                    vagas.append({
                        "id": len(vagas) + 1,
                        "titulo": titulo,
                        "empresa": empresa,
                        "localizacao": localizacao,
                        "link_vaga": link_vaga,
                        "descricao_completa": descricao,
                        "pagina": pagina + 1
                    })
                    vagas_na_pagina += 1

                except Exception as e:
                    print(f"    Falha ao processar card {idx}: {type(e).__name__}")
                    continue

            print(f"    {vagas_na_pagina} vagas coletadas (total: {len(vagas)})")

            if progress_callback:
                progress_callback({
                    "tipo": "coleta_bruta",
                    "pagina_atual": pagina + 1,
                    "total_vagas": len(vagas),
                    "progresso": min(95, int(((pagina + 1) / max_paginas) * 100))
                })

            # Se não encontrou vagas nesta página, para
            if vagas_na_pagina == 0 and pagina > 0:
                break

            if pagina < max_paginas - 1:
                time.sleep(1)

        resultado["vagas"] = vagas
        resultado["total_vagas"] = len(vagas)
        resultado["paginas_coletadas"] = pagina + 1

        print(f"\nTotal: {len(vagas)} vagas brutas do Indeed em {pagina + 1} páginas")
        return resultado

    except Exception as e:
        print(f"Erro na coleta Indeed: {e}")
        resultado["erro"] = str(e)
        resultado["vagas"] = vagas
        resultado["total_vagas"] = len(vagas)
        return resultado

    finally:
        if driver:
            driver.quit()


def coletar_e_salvar_posts(headless: bool = True, progress_callback=None, custom_url: str = None) -> tuple:
    """
    Coleta posts brutos e salva em arquivo.

    Returns:
        (dados_brutos, caminho_arquivo)
    """
    dados = coletar_posts_brutos(headless=headless, progress_callback=progress_callback, custom_url=custom_url)
    arquivo = salvar_bruto(dados, "posts")
    return dados, arquivo


def coletar_e_salvar_jobs(headless: bool = True, progress_callback=None, custom_url: str = None) -> tuple:
    """
    Coleta jobs brutos e salva em arquivo.

    Returns:
        (dados_brutos, caminho_arquivo)
    """
    dados = coletar_jobs_brutos(headless=headless, progress_callback=progress_callback, custom_url=custom_url)
    arquivo = salvar_bruto(dados, "jobs")
    return dados, arquivo


def coletar_e_salvar_indeed(headless: bool = True, progress_callback=None, custom_url: str = None) -> tuple:
    """
    Coleta vagas do Indeed brutas e salva em arquivo.

    Returns:
        (dados_brutos, caminho_arquivo)
    """
    dados = coletar_indeed_brutos(headless=headless, progress_callback=progress_callback, custom_url=custom_url)
    arquivo = salvar_bruto(dados, "indeed")
    return dados, arquivo


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--posts":
        dados, arquivo = coletar_e_salvar_posts(headless=False)
        print(f"\n{dados['total_posts']} posts salvos em {arquivo}")
    elif len(sys.argv) > 1 and sys.argv[1] == "--jobs":
        dados, arquivo = coletar_e_salvar_jobs(headless=False)
        print(f"\n{dados['total_vagas']} vagas salvas em {arquivo}")
    elif len(sys.argv) > 1 and sys.argv[1] == "--indeed":
        dados, arquivo = coletar_e_salvar_indeed(headless=False)
        print(f"\n{dados['total_vagas']} vagas do Indeed salvas em {arquivo}")
    else:
        print("Uso:")
        print("  python -m app.scrapers.coleta_bruta --posts")
        print("  python -m app.scrapers.coleta_bruta --jobs")
        print("  python -m app.scrapers.coleta_bruta --indeed")
