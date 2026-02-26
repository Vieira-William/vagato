from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from datetime import date
import re
import time

from .login_helper import criar_driver_com_perfil, garantir_login_linkedin

TERMOS_PRODUTO = [
    # Product Design
    "product designer", "product design", "designer de produto", "design de produto",
    # UX/UI
    "ux designer", "ui designer", "ux/ui", "ui/ux", "ux ui", "ui ux",
    "user experience", "user interface", "interaction designer",
    # Product Management
    "product manager", "product owner", "head de produto", "head of product",
    "product operations", "gerente de produto",
    # Service Design
    "service designer", "service design",
    # Research
    "ux researcher", "ux research", "user researcher",
]

TERMOS_EXCLUIR = [
    # Dev
    "developer", "desenvolvedor", "engineer", "engenheiro",
    "backend", "frontend", "fullstack", "full stack", "devops",
    # QA
    "qa", "tester", "quality",
    # Data (exceto UX research)
    "analista de dados", "data analyst", "data scientist", "cientista de dados",
    # Design não-produto
    "designer gráfico", "graphic designer", "motion designer",
    # Marketing (exceto product marketing)
    "growth", "social media", "content writer",
    # Outros
    "architect", "arquiteto", "security", "cto", "ceo",
]


def eh_vaga_produto(titulo: str) -> bool:
    titulo_lower = titulo.lower()
    for termo in TERMOS_EXCLUIR:
        if termo in titulo_lower:
            return False
    for termo in TERMOS_PRODUTO:
        if termo in titulo_lower:
            return True
    return False


def classificar_tipo_vaga(titulo: str) -> str:
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


def extrair_total_vagas_pagina(driver) -> int:
    """
    Extrai o número total de vagas mostrado pelo LinkedIn no topo da página.
    Ex: "234 resultados" ou "1.234 results"

    Returns:
        Total de vagas ou 0 se não encontrar
    """
    seletores = [
        ".jobs-search-results-list__subtitle",
        ".jobs-search-results__count span",
        ".jobs-search-results-list__title-heading small",
        ".results-context-header__job-count",
    ]

    for seletor in seletores:
        try:
            elem = driver.find_element(By.CSS_SELECTOR, seletor)
            texto = elem.text
            # Extrai número: "234 resultados" ou "1.234 results" → 234 ou 1234
            match = re.search(r"[\d.,]+", texto)
            if match:
                numero = match.group().replace(".", "").replace(",", "")
                return int(numero)
        except:
            continue

    # Fallback: conta os cards visíveis
    try:
        cards = driver.find_elements(By.CSS_SELECTOR, "li.scaffold-layout__list-item[data-occludable-job-id]")
        return len(cards) * 5  # Estima 5x os cards visíveis
    except:
        return 0


# =====================
# FUNÇÕES DE PARSE (REGEX)
# =====================

def extrair_tipo_contrato(texto: str) -> str:
    """Extrai CLT, PJ, Freelancer, Estágio do texto.

    Prioriza o título (primeira linha) para detectar estágio.
    Para CLT/PJ, busca nas primeiras 300 chars.
    """
    if not texto:
        return 'nao_especificado'

    # Título (primeira linha) - mais confiável para estágio
    primeira_linha = texto.split('\n')[0].lower()

    # Estágio/Internship - APENAS no título (evita falsos positivos)
    if re.search(r'\best[áa]gio\b|\binternship\b|\bintern\b', primeira_linha):
        return 'estagio'

    # Primeiras 300 chars - para CLT/PJ/Freelancer
    texto_curto = texto[:300].lower()

    # CLT
    if re.search(r'\bclt\b', texto_curto):
        return 'clt'

    # PJ / Pessoa Jurídica
    if re.search(r'\bpj\b|\bpessoa\s*jur[íi]dica\b', texto_curto):
        return 'pj'

    # Freelancer/Freelance
    if re.search(r'\bfreelancer\b|\bfreelance\b', texto_curto):
        return 'freelancer'

    return 'nao_especificado'


def extrair_nivel(texto: str) -> str:
    """Extrai Junior, Pleno, Sênior, Lead, Head do texto.

    Busca no título da vaga (primeira linha) e nas primeiras linhas da descrição.
    """
    if not texto:
        return 'nao_especificado'

    # Usa a primeira linha (título)
    primeira_linha = texto.split('\n')[0].lower()

    # Também verifica nas primeiras 300 chars
    texto_curto = texto[:300].lower()

    # Head - muito específico para produto/design
    if re.search(r'\bhead\s+(de\s+)?(?:produto|design|ux|product)\b', primeira_linha):
        return 'head'

    # Lead - apenas se for "lead designer", "design lead", etc
    if re.search(r'\b(?:lead\s+(?:designer|design|ux|ui|product)|(?:designer|design|ux|ui|product)\s+lead)\b', primeira_linha):
        return 'lead'

    # Senior - vários padrões (mais flexível)
    # "Senior Designer", "SR UX", "Sênior", etc
    if re.search(r'\bsenior\b|\bs[êe]nior\b|\bsr\s|\bsr\.\s?|\bsr$', primeira_linha):
        return 'senior'
    # Também busca no texto curto (início da descrição)
    if re.search(r'\bsenior\b|\bs[êe]nior\b', texto_curto):
        return 'senior'

    # Pleno / Mid-level
    if re.search(r'\bpleno\b|\bmid[\s-]?level\b', primeira_linha):
        return 'pleno'
    if re.search(r'\bpleno\b|\bmid-level\b', texto_curto):
        return 'pleno'

    # Junior / Jr / Entry-level
    if re.search(r'\bjunior\b|\bjr\s|\bjr\.\s?|\bj[úu]nior\b|\bentry[\s-]?level\b', primeira_linha):
        return 'junior'
    if re.search(r'\bjunior\b|\bjr\b|\bj[úu]nior\b', texto_curto):
        return 'junior'

    return 'nao_especificado'


def extrair_salario(texto: str) -> tuple:
    """Extrai faixa salarial do texto. Retorna (min, max)."""
    if not texto:
        return None, None

    def parse_valor(s):
        """Converte string de valor para float."""
        # Remove pontos de milhar e converte vírgula em ponto
        s = s.replace('.', '').replace(',', '.')
        try:
            return float(s)
        except:
            return None

    # Padrão: R$ 5.000 - R$ 10.000 ou R$ 5000 a R$ 10000
    match = re.search(r'R\$\s*([\d.,]+)\s*[-–aA]\s*R\$\s*([\d.,]+)', texto)
    if match:
        return parse_valor(match.group(1)), parse_valor(match.group(2))

    # Padrão: 5.000 - 10.000 (sem R$)
    match = re.search(r'(\d{1,3}(?:[.,]\d{3})*)\s*[-–aA]\s*(\d{1,3}(?:[.,]\d{3})*)', texto)
    if match:
        v1, v2 = parse_valor(match.group(1)), parse_valor(match.group(2))
        if v1 and v2 and v1 >= 1000 and v2 >= 1000:  # Provavelmente salário
            return v1, v2

    # Padrão único: R$ 8.000
    match = re.search(r'R\$\s*([\d.,]+)', texto)
    if match:
        valor = parse_valor(match.group(1))
        if valor and valor >= 1000:
            return valor, valor

    return None, None


def extrair_modalidade(texto: str) -> str:
    """Extrai modalidade de trabalho."""
    if not texto:
        return 'nao_especificado'
    texto_lower = texto.lower()
    if re.search(r'\bremoto\b|\bremote\b|\bhome\s*office\b|\btrabalho\s*remoto\b', texto_lower):
        return 'remoto'
    if re.search(r'\bh[íi]brido\b|\bhybrid\b', texto_lower):
        return 'hibrido'
    if re.search(r'\bpresencial\b|\bon-?site\b|\bno\s*escrit[óo]rio\b', texto_lower):
        return 'presencial'
    return 'nao_especificado'


def extrair_carga_horaria(texto: str) -> str:
    """Extrai carga horária do texto."""
    if not texto:
        return 'nao_especificado'
    texto_lower = texto.lower()
    if re.search(r'\bintegral\b|\bfull[\s-]?time\b|\b40\s*h\b', texto_lower):
        return 'integral'
    if re.search(r'\bmeio\s*per[íi]odo\b|\bpart[\s-]?time\b|\b20\s*h\b', texto_lower):
        return 'meio_periodo'
    if re.search(r'\bflex[íi]vel\b|\bflexible\b', texto_lower):
        return 'flexivel'
    return 'nao_especificado'


# =====================
# EXTRAÇÃO DO PAINEL LATERAL
# =====================

def extrair_detalhes_painel(driver, card, titulo_card: str = None) -> dict:
    """
    Clica no card e extrai dados do painel lateral.

    Args:
        driver: WebDriver do Selenium
        card: Elemento do card da vaga
        titulo_card: Título da vaga (já extraído do card)

    Tempo estimado: ~0.8s
    """
    detalhes = {}

    try:
        # Primeiro, scrolla o card para o centro da tela para garantir visibilidade
        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center', behavior: 'instant'});",
            card
        )
        time.sleep(0.2)

        # Clica no card para abrir o painel
        # Tenta clicar no link dentro do card (mais confiável)
        try:
            link_elem = card.find_element(By.CSS_SELECTOR, "a.job-card-container__link, a[data-control-name]")
            driver.execute_script("arguments[0].click();", link_elem)
        except:
            # Fallback: clica no card inteiro
            driver.execute_script("arguments[0].click();", card)

        time.sleep(0.6)  # Espera o painel carregar

        # Verifica se o título do painel corresponde ao card clicado
        try:
            titulo_painel = driver.find_element(By.CSS_SELECTOR,
                ".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24").text.strip()

            # Se temos o título do card, verifica se o painel atualizou
            if titulo_card and titulo_painel:
                # Compara as primeiras palavras para verificar se é a mesma vaga
                palavras_card = titulo_card.lower().split()[:3]
                palavras_painel = titulo_painel.lower().split()[:3]
                if palavras_card != palavras_painel:
                    # Painel não atualizou, tenta clicar novamente
                    time.sleep(0.3)
                    driver.execute_script("arguments[0].click();", card)
                    time.sleep(0.5)
        except:
            pass

        # Extrai descrição completa
        try:
            # Tenta clicar em "Ver mais" se existir
            try:
                show_more = driver.find_element(By.CSS_SELECTOR,
                    "button.jobs-description__footer-button, button.inline-show-more-text__button")
                driver.execute_script("arguments[0].click();", show_more)
                time.sleep(0.2)
            except:
                pass

            desc_elem = driver.find_element(By.CSS_SELECTOR, "div#job-details, div.jobs-description__content")
            descricao = desc_elem.text
            detalhes['descricao_completa'] = descricao[:3000]  # Limita tamanho

            # Usa o título do card (que já tem o nível) + descrição
            texto_completo = (titulo_card or "") + "\n" + descricao

            detalhes['tipo_contrato'] = extrair_tipo_contrato(texto_completo)
            detalhes['nivel'] = extrair_nivel(texto_completo)
            detalhes['modalidade'] = extrair_modalidade(texto_completo)
            detalhes['carga_horaria'] = extrair_carga_horaria(texto_completo)

            salario_min, salario_max = extrair_salario(texto_completo)
            detalhes['salario_min'] = salario_min
            detalhes['salario_max'] = salario_max

        except Exception as e:
            print(f"    Erro ao extrair descrição: {e}")

        # Tenta extrair salário do card dedicado (se existir)
        try:
            salary_elem = driver.find_element(By.CSS_SELECTOR, "div#SALARY, .jobs-details__salary-main-rail-card")
            salary_text = salary_elem.text
            if salary_text and not detalhes.get('salario_min'):
                s_min, s_max = extrair_salario(salary_text)
                detalhes['salario_min'] = s_min
                detalhes['salario_max'] = s_max
        except:
            pass

        # NOVO: Tenta extrair número de candidaturas
        try:
            counts = driver.find_elements(By.CSS_SELECTOR, ".jobs-unified-top-card__applicant-count, .tvm__text, .jobs-unified-top-card__bullet")
            for c in counts:
                text = c.text.lower()
                if "candidat" in text or "applicant" in text or "aplic" in text:
                    detalhes['candidaturas_count'] = c.text.strip()
                    break
        except:
            pass

        # NOVO: Tenta extrair perfil do Recrutador (Hiring Manager)
        try:
            hm_elem = driver.find_element(By.CSS_SELECTOR, ".hirer-profile__hirer-information, .jobs-poster, .jobs-unified-top-card__hirer-profile")
            if hm_elem:
                name_elem = hm_elem.find_element(By.CSS_SELECTOR, "a strong, a.app-aware-link")
                detalhes['contato_nome'] = name_elem.text.strip()
                detalhes['contato_linkedin'] = name_elem.get_attribute("href")
                try:
                    title_elem = hm_elem.find_element(By.CSS_SELECTOR, ".hirer-profile__hirer-title, .job-details-jobs-unified-top-card__hirer-job-title")
                    detalhes['contato_cargo'] = title_elem.text.strip()
                except:
                    pass
        except:
            pass

    except Exception as e:
        print(f"  Erro ao extrair detalhes do painel: {e}")

    return detalhes


# =====================
# SCROLL E EXTRAÇÃO PRINCIPAL
# =====================

def scroll_e_extrair_vagas(driver, max_scrolls=100, extrair_detalhes=True, progress_callback=None, total_vagas_pagina=0, links_ja_vistos=None, vagas_ja_coletadas=0):
    """
    Faz scroll lento na lista para carregar e extrair todas as vagas de UMA página.
    Usa detecção inteligente de fim de lista ao invés de limite fixo.

    Args:
        driver: WebDriver do Selenium
        max_scrolls: Limite de segurança (default alto: 100)
        extrair_detalhes: Se True, clica em cada card para extrair detalhes do painel
        progress_callback: Função opcional para reportar progresso em tempo real
        total_vagas_pagina: Total de vagas na busca (para cálculo de progresso)
        links_ja_vistos: Set compartilhado de links já processados (entre páginas)
        vagas_ja_coletadas: Número de vagas já coletadas (para cálculo de progresso correto)

    Returns:
        Lista de vagas com dados extraídos
    """
    vagas = []
    # Usa set compartilhado ou cria novo se não fornecido
    links_vistos = links_ja_vistos if links_ja_vistos is not None else set()
    scrolls_sem_novos = 0
    ultimo_total = 0
    ultima_scroll_pos = 0

    try:
        lista = driver.find_element(By.CSS_SELECTOR, "div.scaffold-layout__list")

        for i in range(max_scrolls):
            # Pega todos os cards com job_id
            cards = driver.find_elements(By.CSS_SELECTOR, "li.scaffold-layout__list-item[data-occludable-job-id]")

            # Extrai vagas dos cards que têm conteúdo carregado
            for card in cards:
                try:
                    job_id = card.get_attribute("data-occludable-job-id")
                    if not job_id:
                        continue

                    link_vaga = f"https://www.linkedin.com/jobs/view/{job_id}"
                    if link_vaga in links_vistos:
                        continue

                    # Tenta extrair título
                    titulo = None
                    try:
                        titulo = card.find_element(By.CSS_SELECTOR, "a strong").text.strip()
                    except:
                        try:
                            titulo = card.find_element(By.CSS_SELECTOR, "strong").text.strip()
                        except:
                            pass

                    if not titulo:
                        continue

                    links_vistos.add(link_vaga)

                    # Extrai empresa e localização do card
                    empresa = None
                    localizacao = None
                    try:
                        empresa = card.find_element(By.CSS_SELECTOR, ".artdeco-entity-lockup__subtitle").text.strip()
                    except:
                        pass
                    try:
                        localizacao = card.find_element(By.CSS_SELECTOR, ".job-card-container__metadata-wrapper li").text.strip()
                    except:
                        try:
                            localizacao = card.find_element(By.CSS_SELECTOR, ".artdeco-entity-lockup__caption").text.strip()
                        except:
                            pass

                    # Extrai detalhes do painel lateral (se habilitado)
                    detalhes = {}
                    if extrair_detalhes:
                        detalhes = extrair_detalhes_painel(driver, card, titulo_card=titulo)

                    # Monta objeto da vaga
                    vaga = {
                        "titulo": titulo,
                        "empresa": empresa,
                        "link_vaga": link_vaga,
                        "localizacao": localizacao,
                        # Campos do painel
                        "descricao_completa": detalhes.get('descricao_completa'),
                        "tipo_contrato": detalhes.get('tipo_contrato', 'nao_especificado'),
                        "nivel": detalhes.get('nivel', 'nao_especificado'),
                        "modalidade": detalhes.get('modalidade', 'nao_especificado'),
                        "carga_horaria": detalhes.get('carga_horaria', 'nao_especificado'),
                        "salario_min": detalhes.get('salario_min'),
                        "salario_max": detalhes.get('salario_max'),
                        # Novos campos Hidden Gems
                        "candidaturas_count": detalhes.get('candidaturas_count'),
                        "contato_nome": detalhes.get('contato_nome'),
                        "contato_cargo": detalhes.get('contato_cargo'),
                        "contato_linkedin": detalhes.get('contato_linkedin'),
                    }

                    vagas.append(vaga)
                    print(f"  + {titulo[:40]}... ({detalhes.get('nivel', '?')}, {detalhes.get('modalidade', '?')})")

                    # Notifica progresso em tempo real
                    if progress_callback:
                        # Calcula progresso baseado em vagas TOTAIS (já coletadas + novas desta página)
                        total_atual = vagas_ja_coletadas + len(vagas)
                        if total_vagas_pagina > 0:
                            progresso = min(95, int((total_atual / total_vagas_pagina) * 100))
                        else:
                            progresso = min(95, int((i / max_scrolls) * 100))

                        progress_callback({
                            "tipo": "vaga",
                            "total_vagas": total_atual,
                            "total_esperado": total_vagas_pagina,
                            "progresso": progresso,
                            "ultima_vaga": {
                                "titulo": titulo[:40] if titulo else "?",
                                "empresa": empresa[:30] if empresa else "?",
                            }
                        })

                except Exception as e:
                    continue

            # Scroll para baixo na lista
            driver.execute_script("arguments[0].scrollTop += 300", lista)
            time.sleep(0.2)

            # Pega posição atual do scroll
            scroll_pos = driver.execute_script("return arguments[0].scrollTop", lista)
            scroll_height = driver.execute_script("return arguments[0].scrollHeight", lista)
            client_height = driver.execute_script("return arguments[0].clientHeight", lista)

            # === DETECÇÃO INTELIGENTE DE FIM ===
            # Verifica se scroll mudou E se encontrou novas vagas
            scroll_mudou = scroll_pos != ultima_scroll_pos
            vagas_mudou = len(vagas) != ultimo_total

            if not scroll_mudou and not vagas_mudou:
                scrolls_sem_novos += 1
                if scrolls_sem_novos >= 8:
                    print(f"    Fim da lista - {scrolls_sem_novos} scrolls sem mudança")
                    break
            else:
                scrolls_sem_novos = 0

            ultima_scroll_pos = scroll_pos
            ultimo_total = len(vagas)

            # Verifica se chegou ao fim físico da lista
            if scroll_pos + client_height >= scroll_height - 50:
                # Chegou ao fim, espera um pouco por mais conteúdo
                time.sleep(0.5)
                new_height = driver.execute_script("return arguments[0].scrollHeight", lista)
                if new_height == scroll_height:
                    print(f"    Fim do scroll - chegou ao final da lista")
                    break

        return vagas
    except Exception as e:
        print(f"Erro no scroll: {e}")
        return vagas


def ir_para_proxima_pagina(driver) -> bool:
    """
    Navega para a próxima página de resultados do LinkedIn Jobs.

    Returns:
        True se conseguiu ir para próxima página, False se é a última
    """
    try:
        # Seletores do botão "próxima página" do LinkedIn
        seletores = [
            "button[aria-label='View next page']",
            "button[aria-label='Ver próxima página']",
            "button[aria-label='Avançar']",
            "button[aria-label='Page forward']",
            ".artdeco-pagination__button--next",
        ]

        next_btn = None
        for selector in seletores:
            try:
                btns = driver.find_elements(By.CSS_SELECTOR, selector)
                for btn in btns:
                    disabled = btn.get_attribute("disabled")
                    aria_disabled = btn.get_attribute("aria-disabled")
                    if not disabled and aria_disabled != "true":
                        if btn.is_displayed() and btn.is_enabled():
                            next_btn = btn
                            break
                if next_btn:
                    break
            except:
                continue

        if not next_btn:
            print("  [PAGINAÇÃO] Botão próximo não encontrado - última página")
            return False

        # Guarda URL antes do clique
        url_antes = driver.current_url

        # Scroll até o botão para garantir visibilidade
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_btn)
        time.sleep(0.5)

        # Clica no botão
        driver.execute_script("arguments[0].click();", next_btn)
        print("  [PAGINAÇÃO] Clicou no botão próximo, aguardando...")
        time.sleep(4)  # Aguarda carregamento

        # Verifica se a URL mudou (confirma que navegou)
        url_depois = driver.current_url
        if url_depois == url_antes:
            print("  [PAGINAÇÃO] URL não mudou após clique")
            # Tenta aguardar mais um pouco
            time.sleep(2)
            url_depois = driver.current_url
            if url_depois == url_antes:
                return False

        print(f"  [PAGINAÇÃO] Navegou para: {url_depois[:80]}...")

        # Espera a lista carregar e reseta scroll
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.scaffold-layout__list"))
            )
            lista = driver.find_element(By.CSS_SELECTOR, "div.scaffold-layout__list")
            driver.execute_script("arguments[0].scrollTop = 0", lista)
            time.sleep(1)
        except Exception as e:
            print(f"  [PAGINAÇÃO] Aviso ao resetar scroll: {e}")

        return True

    except Exception as e:
        print(f"  [PAGINAÇÃO] Erro ao navegar: {e}")
        return False


def coletar_vagas_linkedin(max_paginas: int = 20, headless: bool = True, extrair_detalhes: bool = True, progress_callback=None) -> list[dict]:
    """
    Coleta vagas do LinkedIn com scroll e paginação via URL.

    Args:
        max_paginas: Número máximo de páginas para navegar
        headless: Se True, roda sem interface gráfica
        extrair_detalhes: Se True, clica em cada card para extrair detalhes (~0.5s extra por vaga)
        progress_callback: Função opcional para reportar progresso em tempo real

    Returns:
        Lista de vagas de produto com dados estruturados
    """
    # Busca por "Product Designer" - remoto - últimas 24h
    # f_TPR=r86400 = últimas 24h, f_WT=2 = remoto
    # LinkedIn usa &start=0, &start=25, &start=50 para paginação (25 vagas por página)
    base_url = "https://www.linkedin.com/jobs/search/?f_TPR=r86400&f_WT=2&keywords=Product%20Designer&sortBy=R"
    todas_vagas = []
    links_vistos = set()
    driver = None
    tempo_inicio = time.time()
    VAGAS_POR_PAGINA = 25  # LinkedIn mostra ~25 vagas por página

    try:
        print(f"[DEBUG] Criando driver (headless={headless})...")
        driver = criar_driver_com_perfil(headless=headless)
        print(f"[DEBUG] Driver criado. Verificando login...")

        # Garante que está logado (usa credenciais salvas se necessário)
        if not garantir_login_linkedin(driver):
            print("AVISO: Não foi possível fazer login no LinkedIn.")
            print("Configure suas credenciais em Configurações > LinkedIn")
            driver.quit()
            return []

        print(f"[DEBUG] Login OK. Navegando para busca...")
        print(f"[DEBUG] URL: {base_url}")

        # Navega para a busca
        driver.get(base_url)
        time.sleep(3)

        # Debug: verifica se chegou na página correta
        current_url = driver.current_url
        print(f"[DEBUG] URL atual após navegação: {current_url}")

        # Verifica se foi redirecionado para login
        if "login" in current_url.lower() or "authwall" in current_url.lower():
            print("[ERROR] Redirecionado para página de login! Sessão inválida.")
            driver.quit()
            return []

        # Verifica se a lista de vagas está presente
        try:
            lista = driver.find_element(By.CSS_SELECTOR, "div.scaffold-layout__list")
            print(f"[DEBUG] Lista de vagas encontrada!")
        except Exception as e:
            print(f"[ERROR] Lista de vagas não encontrada! Page source: {driver.page_source[:500]}")
            driver.quit()
            return []

        print(f"Login OK. Coletando vagas (extrair_detalhes={extrair_detalhes})...")

        # Captura total de vagas disponível na busca
        total_vagas_busca = extrair_total_vagas_pagina(driver)
        print(f"  Total de vagas na busca: {total_vagas_busca}")

        paginas_sem_novas = 0  # Contador de páginas consecutivas sem vagas novas

        for pagina in range(1, max_paginas + 1):
            print(f"Página {pagina}...")

            # Notifica início da página
            if progress_callback:
                progress_callback({
                    "tipo": "pagina",
                    "pagina_atual": pagina,
                    "total_paginas": max_paginas,
                    "total_vagas": len(todas_vagas),
                    "total_esperado": total_vagas_busca,
                    "progresso": min(95, int((len(todas_vagas) / max(total_vagas_busca, 1)) * 100))
                })

            # Scroll e extração na página atual
            vagas_pagina = scroll_e_extrair_vagas(
                driver,
                extrair_detalhes=extrair_detalhes,
                progress_callback=progress_callback,
                total_vagas_pagina=total_vagas_busca,
                links_ja_vistos=links_vistos,  # Compartilha set entre páginas
                vagas_ja_coletadas=len(todas_vagas)  # Para cálculo correto do progresso
            )

            if not vagas_pagina:
                # Verifica se a página tinha cards mas todos eram duplicados
                # (diferente de página realmente vazia)
                try:
                    cards = driver.find_elements(By.CSS_SELECTOR, "li.scaffold-layout__list-item[data-occludable-job-id]")
                    cards_visiveis = len(cards)
                except:
                    cards_visiveis = 0

                if cards_visiveis > 0:
                    # Tinha cards mas todos duplicados - continua para próxima página
                    print(f"  Página {pagina}: {cards_visiveis} cards visíveis, todos duplicados - continuando")
                    # Não incrementa paginas_sem_novas se tinha cards (só eram duplicados)
                else:
                    # Página realmente vazia
                    print(f"  Nenhuma vaga encontrada na página {pagina}")
                    paginas_sem_novas += 1
            else:
                # vagas_pagina já contém apenas vagas novas (filtradas pelo set compartilhado em scroll_e_extrair_vagas)
                # Não verificar novamente pois os links já foram adicionados ao set
                todas_vagas.extend(vagas_pagina)
                print(f"  -> {len(vagas_pagina)} novas (total: {len(todas_vagas)})")
                paginas_sem_novas = 0

            # Para se 5 páginas consecutivas sem vagas novas (aumentado de 3)
            if paginas_sem_novas >= 5:
                print("  5 páginas sem vagas novas, finalizando")
                break

            # Verifica se já coletou todas as vagas disponíveis
            if total_vagas_busca > 0 and len(todas_vagas) >= total_vagas_busca:
                print(f"  Coletou todas as {total_vagas_busca} vagas disponíveis")
                break

            # Última página? Tenta ir para próxima via botão
            if pagina < max_paginas:
                proxima_ok = ir_para_proxima_pagina(driver)
                if not proxima_ok:
                    print("  Última página - não há próxima")
                    break

        tempo_total = time.time() - tempo_inicio
        print(f"\nTotal coletado: {len(todas_vagas)} vagas em {tempo_total:.1f}s")

        # Filtra apenas vagas de produto
        vagas_produto = []
        for v in todas_vagas:
            if eh_vaga_produto(v["titulo"]):
                # Usa nível do título se não encontrou na descrição
                nivel = v.get("nivel", "nao_especificado")
                if nivel == "nao_especificado":
                    nivel = extrair_nivel(v["titulo"])

                vagas_produto.append({
                    "titulo": v["titulo"],
                    "empresa": v["empresa"],
                    "tipo_vaga": classificar_tipo_vaga(v["titulo"]),
                    "fonte": "linkedin_jobs",
                    "link_vaga": v["link_vaga"],
                    "localizacao": v["localizacao"],
                    "modalidade": v.get("modalidade", "nao_especificado"),
                    "requisito_ingles": "nao_especificado",
                    "forma_contato": "link",
                    "data_coleta": date.today().isoformat(),
                    # Novos campos extraídos do painel
                    "descricao_completa": v.get("descricao_completa"),
                    "nivel": nivel,
                    "tipo_contrato": v.get("tipo_contrato", "nao_especificado"),
                    "carga_horaria": v.get("carga_horaria", "nao_especificado"),
                    "salario_min": v.get("salario_min"),
                    "salario_max": v.get("salario_max"),
                    # Propagando Hidden Gems
                    "candidaturas_count": v.get("candidaturas_count"),
                    "contato_nome": v.get("contato_nome"),
                    "contato_cargo": v.get("contato_cargo"),
                    "contato_linkedin": v.get("contato_linkedin"),
                })

        tempo_por_vaga = tempo_total / len(todas_vagas) if todas_vagas else 0
        print(f"Vagas de produto: {len(vagas_produto)} ({tempo_por_vaga:.2f}s por vaga)")
        return vagas_produto

    except Exception as e:
        print(f"Erro: {e}")
        return []

    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    import sys

    # Permite testar com ou sem extração de detalhes
    extrair = "--sem-detalhes" not in sys.argv

    print(f"Coletando vagas (extrair_detalhes={extrair})...")
    vagas = coletar_vagas_linkedin(max_paginas=2, extrair_detalhes=extrair)

    print(f"\nTotal: {len(vagas)}")
    for v in vagas[:5]:
        print(f"\n- {v['titulo']} @ {v['empresa']}")
        print(f"  Nível: {v.get('nivel')} | Contrato: {v.get('tipo_contrato')} | Modalidade: {v.get('modalidade')}")
        print(f"  Salário: {v.get('salario_min')} - {v.get('salario_max')}")
