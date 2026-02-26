from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from datetime import date
import os
import re
import time

from .login_helper import carregar_cookies
from .linkedin_jobs import (
    extrair_nivel,
    extrair_tipo_contrato,
    extrair_modalidade,
    extrair_carga_horaria,
    extrair_salario,
)

# Importa termos do linkedin_jobs para manter consistência
from .linkedin_jobs import TERMOS_PRODUTO, TERMOS_EXCLUIR


def eh_vaga_produto(titulo: str) -> bool:
    """Verifica se o título é uma vaga de produto."""
    titulo_lower = titulo.lower()

    for termo in TERMOS_EXCLUIR:
        if termo in titulo_lower:
            return False

    for termo in TERMOS_PRODUTO:
        if termo in titulo_lower:
            return True

    return False


def classificar_tipo_vaga(titulo: str) -> str:
    """Classifica o tipo da vaga baseado no título."""
    titulo_lower = titulo.lower()

    if "product manager" in titulo_lower or "product owner" in titulo_lower:
        return "Product Manager"
    elif "head" in titulo_lower and "produto" in titulo_lower:
        return "Head de Produto"
    elif "service designer" in titulo_lower:
        return "Service Designer"
    elif "ui/ux" in titulo_lower or "ux/ui" in titulo_lower:
        return "UX/UI Designer"
    elif "ui designer" in titulo_lower:
        return "UI Designer"
    elif "ux designer" in titulo_lower or "ux" in titulo_lower:
        return "UX Designer"
    elif "product designer" in titulo_lower or "designer de produto" in titulo_lower:
        return "Product Designer"

    return "Product Designer"


def criar_driver():
    """Cria driver do Chrome com opções otimizadas."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=pt-BR")
    options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=options)
    return driver


def extrair_detalhes_indeed(driver, card, titulo: str) -> dict:
    """
    Clica no card e extrai dados do painel de detalhes do Indeed.

    Args:
        driver: WebDriver do Selenium
        card: Elemento do card da vaga
        titulo: Título da vaga

    Returns:
        Dict com campos extraídos
    """
    detalhes = {}

    try:
        # Clica no card para abrir o painel de detalhes
        driver.execute_script("arguments[0].click();", card)
        time.sleep(1.5)  # Aumentado de 0.7s para 1.5s - mais tempo para painel carregar

        # Tenta extrair descrição do painel lateral
        try:
            desc_elem = driver.find_element(By.CSS_SELECTOR, "#jobDescriptionText, .jobsearch-JobComponent-description")
            descricao = desc_elem.text

            # Verifica se a descrição é válida (não está vazia)
            if not descricao or len(descricao) < 50:
                # Painel pode não ter carregado, usa apenas título
                detalhes['nivel'] = extrair_nivel(titulo)
                detalhes['tipo_contrato'] = extrair_tipo_contrato(titulo)
                detalhes['modalidade'] = extrair_modalidade(titulo)
                return detalhes

            detalhes['descricao_completa'] = descricao[:3000]

            # Combina título + descrição para parse
            texto_completo = titulo + "\n" + descricao

            detalhes['nivel'] = extrair_nivel(texto_completo)
            detalhes['tipo_contrato'] = extrair_tipo_contrato(texto_completo)
            detalhes['modalidade'] = extrair_modalidade(texto_completo)
            detalhes['carga_horaria'] = extrair_carga_horaria(texto_completo)

            salario_min, salario_max = extrair_salario(texto_completo)
            detalhes['salario_min'] = salario_min
            detalhes['salario_max'] = salario_max

        except Exception as e:
            # Se não conseguir pegar descrição, usa apenas o título
            detalhes['nivel'] = extrair_nivel(titulo)
            detalhes['tipo_contrato'] = extrair_tipo_contrato(titulo)
            detalhes['modalidade'] = extrair_modalidade(titulo)

        # Tenta extrair salário do card de salário (se existir)
        try:
            salary_elem = driver.find_element(By.CSS_SELECTOR, "[data-testid='attribute_snippet_testid'], .salary-snippet-container")
            salary_text = salary_elem.text
            
            if "estimado" in salary_text.lower() or "estimated" in salary_text.lower():
                detalhes['salario_estimado_indeed'] = True
                
            if salary_text and not detalhes.get('salario_min'):
                s_min, s_max = extrair_salario(salary_text)
                detalhes['salario_min'] = s_min
                detalhes['salario_max'] = s_max
        except:
            pass

        # NOVO: Tenta extrair badge Urgent Hire
        try:
            urgent = driver.find_elements(By.CSS_SELECTOR, ".urgentlyHiring, [data-testid='urgentlyHiring']")
            if len(urgent) > 0:
                detalhes['contratacao_urgente'] = True
        except:
            pass

    except Exception as e:
        # Fallback: usa apenas o título
        detalhes['nivel'] = extrair_nivel(titulo)

    return detalhes


def coletar_vagas_indeed(extrair_detalhes: bool = True, progress_callback=None, max_paginas: int = 5) -> list[dict]:
    """
    Coleta vagas do Indeed Brasil usando Selenium COM PAGINAÇÃO.

    Args:
        extrair_detalhes: Se True, clica em cada card para extrair detalhes (~0.5s extra por vaga)
        progress_callback: Função opcional para reportar progresso em tempo real
        max_paginas: Número máximo de páginas para coletar (default: 5, ~15 vagas por página)

    Returns:
        Lista de vagas de produto
    """
    # Filtros: UX Designer OR Product Designer, Brasil, Últimas 24h
    base_url = "https://br.indeed.com/empregos?q=UX+Designer+OR+Product+Designer&l=Brasil&fromage=1"

    vagas = []
    links_vistos = set()  # Para deduplicação entre páginas
    driver = None
    tempo_inicio = time.time()

    try:
        driver = criar_driver()

        for pagina in range(max_paginas):
            # URL com offset de paginação (Indeed usa start=0, 10, 20, etc)
            offset = pagina * 10
            url = f"{base_url}&start={offset}" if pagina > 0 else base_url

            print(f"\n=== Página {pagina + 1}/{max_paginas} (offset={offset}) ===")

            # Notifica progresso de página
            if progress_callback:
                progress_callback({
                    "tipo": "pagina",
                    "pagina_atual": pagina + 1,
                    "total_paginas": max_paginas,
                    "total_vagas": len(vagas),
                    "progresso": int(((pagina + 1) / max_paginas) * 100)
                })

            # Acessa a URL de busca
            driver.get(url)

            # Aguardar carregamento
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.job_seen_beacon, td.resultContent"))
                )
            except:
                print(f"  Nenhum card encontrado na página {pagina + 1}, finalizando")
                break

            time.sleep(2)  # Extra wait para JS carregar

            # Encontrar cards de vagas
            job_cards = driver.find_elements(By.CSS_SELECTOR, "div.job_seen_beacon, td.resultContent")
            total_cards = len(job_cards)

            if total_cards == 0:
                print(f"  Página {pagina + 1} vazia, finalizando")
                break

            print(f"  Encontrados {total_cards} cards (extrair_detalhes={extrair_detalhes})")

            vagas_na_pagina = 0
            for idx, card in enumerate(job_cards):
                try:
                    # Título e link
                    title_elem = card.find_element(By.CSS_SELECTOR, "h2.jobTitle a, a.jcs-JobTitle, h2 a")
                    titulo = title_elem.text.strip()

                    if not titulo or not eh_vaga_produto(titulo):
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
                    try:
                        company_elem = card.find_element(By.CSS_SELECTOR, "[data-testid='company-name'], .companyName")
                        empresa = company_elem.text.strip()
                    except:
                        empresa = None

                    # Localização
                    try:
                        location_elem = card.find_element(By.CSS_SELECTOR, "[data-testid='text-location'], .companyLocation")
                        localizacao = location_elem.text.strip()
                    except:
                        localizacao = None

                    # Extrai detalhes do painel (se habilitado)
                    detalhes = {}
                    if extrair_detalhes:
                        detalhes = extrair_detalhes_indeed(driver, card, titulo)

                    vaga = {
                        "titulo": titulo,
                        "empresa": empresa,
                        "tipo_vaga": classificar_tipo_vaga(titulo),
                        "fonte": "indeed",
                        "link_vaga": link_vaga,
                        "localizacao": localizacao,
                        "modalidade": detalhes.get("modalidade", "remoto"),
                        "requisito_ingles": "nao_especificado",
                        "forma_contato": "indeed",
                        "data_coleta": date.today().isoformat(),
                        # Novos campos extraídos
                        "descricao_completa": detalhes.get("descricao_completa"),
                        "nivel": detalhes.get("nivel", "nao_especificado"),
                        "tipo_contrato": detalhes.get("tipo_contrato", "nao_especificado"),
                        "carga_horaria": detalhes.get("carga_horaria", "nao_especificado"),
                        "salario_min": detalhes.get("salario_min"),
                        "salario_max": detalhes.get("salario_max"),
                        # Adicionando hidden gems do Indeed
                        "contratacao_urgente": detalhes.get("contratacao_urgente", False),
                        "salario_estimado_indeed": detalhes.get("salario_estimado_indeed", False),
                    }

                    vagas.append(vaga)
                    vagas_na_pagina += 1
                    nivel_str = detalhes.get("nivel", "?")
                    modal_str = detalhes.get("modalidade", "?")
                    print(f"    + {titulo} @ {empresa} ({nivel_str}, {modal_str})")

                    # Notifica progresso em tempo real
                    if progress_callback:
                        progress_callback({
                            "tipo": "vaga",
                            "processados": idx + 1,
                            "total": total_cards,
                            "total_vagas": len(vagas),
                            "pagina_atual": pagina + 1,
                            "total_paginas": max_paginas,
                            "progresso": int(((pagina * 10 + idx + 1) / (max_paginas * 10)) * 100),
                            "ultima_vaga": {
                                "titulo": titulo[:40] if titulo else "?",
                                "empresa": empresa[:30] if empresa else "?"
                            }
                        })

                except Exception as e:
                    continue

            print(f"  -> {vagas_na_pagina} novas vagas nesta página (total: {len(vagas)})")

            # Se não encontrou vagas nesta página, para de buscar
            if vagas_na_pagina == 0 and pagina > 0:
                print("  Nenhuma vaga nova nesta página, finalizando")
                break

            # Pequena pausa entre páginas
            if pagina < max_paginas - 1:
                time.sleep(1)

        tempo_total = time.time() - tempo_inicio
        tempo_por_vaga = tempo_total / len(vagas) if vagas else 0
        print(f"\nTotal: {len(vagas)} vagas em {tempo_total:.1f}s ({tempo_por_vaga:.2f}s por vaga)")

    except Exception as e:
        print(f"Erro: {e}")

    finally:
        if driver:
            driver.quit()

    return vagas


if __name__ == "__main__":
    import sys

    extrair = "--sem-detalhes" not in sys.argv

    print(f"Coletando vagas do Indeed (extrair_detalhes={extrair})...")
    vagas = coletar_vagas_indeed(extrair_detalhes=extrair)

    print(f"\nTotal: {len(vagas)} vagas de produto")
    for v in vagas[:5]:
        print(f"\n- {v['titulo']} @ {v['empresa']}")
        print(f"  Nível: {v.get('nivel')} | Contrato: {v.get('tipo_contrato')} | Modalidade: {v.get('modalidade')}")
        if v.get('salario_min'):
            print(f"  Salário: R$ {v.get('salario_min')} - R$ {v.get('salario_max')}")
