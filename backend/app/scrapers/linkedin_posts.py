from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from datetime import date
import re
import time

from .login_helper import criar_driver_com_perfil

TERMOS_PRODUTO = [
    "product designer", "product design", "product manager", "ux designer", "ui designer",
    "ux/ui", "ui/ux", "service designer", "head de produto", "product owner",
    "product operations", "design de produto", "designer de produto", "vaga de ux",
    "vaga ux", "vaga product", "vaga designer", "oportunidade ux", "oportunidade product",
    "ux research", "ux researcher", "design ops", "designops",
]

TERMOS_EXCLUIR = [
    "developer", "desenvolvedor", "engineer", "engenheiro", "qa", "tester",
    "analista de dados", "data analyst", "designer gráfico", "graphic designer",
    "marketing", "growth", "devops", "backend", "frontend", "fullstack",
]

PLATAFORMAS_VAGAS = [
    "gupy.io", "lever.co", "greenhouse.io", "workable.com", "nerdin.com.br",
    "99jobs.com", "vagas.com", "catho.com.br", "trampos.co", "jobs.lever.co",
    "boards.greenhouse.io", "apply.workable.com", "jobs.gupy.io",
]

# Domínios que NÃO são links de vagas (blacklist)
DOMINIOS_IRRELEVANTES = [
    "adobe.com", "discord.com", "discord.gg", "instagram.com", "twitter.com",
    "x.com", "facebook.com", "youtube.com", "tiktok.com", "spotify.com",
    "notion.so", "figma.com", "miro.com", "medium.com", "substack.com",
    "unkern.com", "designernews.co", "behance.net", "dribbble.com",
]

# Padrões que indicam repost/compartilhamento
PADROES_REPOST = [
    r"repassando",
    r"compartilhando\s+(?:essa?\s+)?(?:vaga|oportunidade)",
    r"passando\s+(?:essa?\s+)?(?:vaga|oportunidade)",
    r"divulgando\s+(?:essa?\s+)?vaga",
    r"vaga\s+(?:do|da)\s+@?\w+",
    r"não\s+temos?\s+(?:ligação|vínculo)\s+com\s+(?:a\s+)?vaga",
    r"estamos?\s+apenas\s+repassando",
    r"segue\s+(?:a\s+)?vaga",
]


def eh_post_produto(texto):
    texto_lower = texto.lower()
    for termo in TERMOS_EXCLUIR:
        if termo in texto_lower:
            if not any(t in texto_lower for t in TERMOS_PRODUTO):
                return False
    for termo in TERMOS_PRODUTO:
        if termo in texto_lower:
            return True
    return False


def extrair_emails(texto):
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    emails = re.findall(pattern, texto)
    return list(set([e for e in emails if 'example' not in e.lower()]))


def extrair_whatsapp(texto):
    """
    Extrai números de WhatsApp do texto.
    Suporta formatos: (11) 91234-5678, 11912345678, +55 11 91234-5678, 55 11 91234 5678
    """
    # Padrão flexível para capturar diversos formatos de telefone BR
    patterns = [
        # Formato: (11) 91234-5678 ou (11) 9123-4567
        r'\((\d{2})\)\s*(\d{4,5})[\-\s]?(\d{4})',
        # Formato: 11 91234-5678 ou 11912345678
        r'(?<!\d)(\d{2})\s*(\d{4,5})[\-\s]?(\d{4})(?!\d)',
        # Formato: +55 11 91234-5678 ou 55 11 91234 5678
        r'\+?55\s*\(?(\d{2})\)?\s*(\d{4,5})[\-\s]?(\d{4})',
    ]

    numeros = set()
    for pattern in patterns:
        matches = re.findall(pattern, texto)
        for m in matches:
            # Formata consistentemente: (XX) XXXXX-XXXX
            numero = f"({m[0]}) {m[1]}-{m[2]}"
            # Verifica se é celular (começa com 9) ou tem 9 dígitos
            if len(m[1]) == 5 or m[1].startswith('9'):
                numeros.add(numero)

    return list(numeros)


def eh_link_relevante(url):
    """
    Verifica se um link é potencialmente relevante para uma vaga.
    Retorna True se for link de vaga, False se for irrelevante.
    """
    url_lower = url.lower()

    # Blacklist: domínios irrelevantes
    for dominio in DOMINIOS_IRRELEVANTES:
        if dominio in url_lower:
            return False

    # Whitelist: plataformas de vagas (sempre relevante)
    for plataforma in PLATAFORMAS_VAGAS:
        if plataforma in url_lower:
            return True

    # Links encurtados do LinkedIn podem ser vagas
    if "lnkd.in" in url_lower:
        return True

    # Por padrão, considera relevante (pode ser link de vaga customizado)
    return True


def detectar_repost(texto):
    """
    Detecta se o post é um repost/compartilhamento de vaga de outra pessoa.
    Retorna (is_repost: bool, autor_original: str ou None)
    """
    texto_lower = texto.lower()

    for padrao in PADROES_REPOST:
        if re.search(padrao, texto_lower):
            # Tenta extrair o nome do autor original mencionado
            # Padrões: "vaga do @fulano", "vaga da Fulana"
            match_autor = re.search(r'vaga\s+(?:do|da)\s+@?([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)', texto, re.IGNORECASE)
            if match_autor:
                return True, match_autor.group(1).strip()
            return True, None

    return False, None


def eh_post_multi_vaga(texto, links):
    """
    Detecta se é um post com múltiplas vagas listadas.
    Retorna True se tiver padrão de lista de vagas.
    """
    # Indicadores de múltiplas vagas
    indicadores = [
        r'\d+\s*(?:vagas?|oportunidades?)\s*(?:abertas?|disponíveis?)',
        r'(?:veja|confira)\s+as\s+vagas',
        r'vagas?\s+(?:de|para).*vagas?\s+(?:de|para)',  # Múltiplas menções
    ]

    texto_lower = texto.lower()
    for indicador in indicadores:
        if re.search(indicador, texto_lower):
            return True

    # Se tem muitos links lnkd.in, provavelmente é multi-vaga
    links_lnkd = [l for l in links if 'lnkd.in' in l.lower()]
    if len(links_lnkd) > 2:
        return True

    return False


def extrair_link_vaga_ux(texto, links):
    """
    Em posts multi-vaga, tenta encontrar o link específico da vaga UX.
    Analisa o texto para associar links a vagas específicas.
    """
    # Se não tem múltiplos links, retorna o primeiro relevante
    links_relevantes = [l for l in links if eh_link_relevante(l)]
    if len(links_relevantes) <= 1:
        return links_relevantes[0] if links_relevantes else None

    # Tenta encontrar o link associado à vaga UX
    linhas = texto.split('\n')

    for i, linha in enumerate(linhas):
        linha_lower = linha.lower()
        # Verifica se a linha menciona UX/Product/Design
        if any(termo in linha_lower for termo in ['ux', 'product designer', 'ui designer', 'design']):
            # Procura um link nas próximas linhas ou na mesma linha
            for j in range(max(0, i-1), min(len(linhas), i+3)):
                for link in links_relevantes:
                    if link in linhas[j] or 'lnkd.in' in linhas[j]:
                        # Encontrou link próximo à menção UX
                        return link

    # Fallback: retorna o último link (geralmente é o mais relevante em listas)
    return links_relevantes[-1] if links_relevantes else None


def extrair_links_externos(texto):
    pattern = r'https?://[^\s<>"{}|\\^`\[\])(\']+'
    links = re.findall(pattern, texto)
    resultado = []
    for link in links:
        link = link.rstrip('.,;:!?')
        # Permite links externos E links de vagas do LinkedIn (/jobs/view/)
        if 'linkedin.com' not in link.lower() or '/jobs/view/' in link.lower():
            resultado.append(link)
    return list(set(resultado))


def limpar_titulo(titulo):
    """Limpa e valida um título extraído."""
    if not titulo:
        return None
    # Remove caracteres especiais do início e fim
    titulo = re.sub(r'^[:\s\-•→🔹📣🚀💼✨|]+', '', titulo)
    titulo = re.sub(r'[:\s\-•→🔹📣🚀💼✨|]+$', '', titulo)
    # Remove URLs
    if titulo.startswith('http') or 'lnkd.in' in titulo:
        return None
    # Remove se for muito curto ou só emojis/símbolos
    titulo_limpo = re.sub(r'[^\w\s]', '', titulo)
    if len(titulo_limpo.strip()) < 5:
        return None
    # Remove frases genéricas
    frases_ignorar = ['link do instagram', 'vale a pena', 'passando na sua', 'ajudaria muito']
    if any(f in titulo.lower() for f in frases_ignorar):
        return None
    return titulo.strip()[:100]


def extrair_titulo_vaga(texto):
    """Extrai título da vaga do texto do post."""

    # Padrões específicos para cargos
    padroes_cargo = [
        # Vagas explícitas
        r'(?:vaga|oportunidade|contratando|hiring)[:\s\-]+(?:de\s+)?([A-Za-z][A-Za-z\s/\-]+(?:jr|pleno|sênior|senior|remoto)?)',
        # Designer com qualificador
        r'\b((?:product |ux |ui |ux/ui |ui/ux |service )?designer(?:\s+(?:jr|pleno|sênior|senior|remoto))?)\b',
        # Manager/Owner
        r'\b(product (?:manager|owner)(?:\s+(?:jr|pleno|sênior|senior))?)\b',
        # Head de área
        r'\b(head (?:de |of )?(?:produto|product|design|ux))\b',
        # UX Research
        r'\b(ux research(?:er)?)\b',
    ]

    texto_lower = texto.lower()
    for padrao in padroes_cargo:
        match = re.search(padrao, texto_lower)
        if match:
            titulo = match.group(1).strip()
            titulo = limpar_titulo(titulo)
            if titulo and len(titulo) > 5:
                # Capitaliza corretamente
                return titulo.title()

    # Busca em linhas específicas
    linhas = texto.split('\n')
    for linha in linhas[:10]:
        linha = linha.strip()
        linha_lower = linha.lower()

        # Pula linhas que são claramente não-títulos
        if linha.startswith('http') or len(linha) < 8 or len(linha) > 100:
            continue
        if any(x in linha_lower for x in ['instagram', 'curtir', 'comentar', 'seguir']):
            continue

        # Verifica se contém termos de cargo específicos (não só "designer")
        termos_especificos = ['ux', 'ui', 'product', 'manager', 'head de', 'head of', 'sênior', 'senior', 'pleno', 'júnior', 'junior', 'jr']
        if any(t in linha_lower for t in termos_especificos) and 'designer' in linha_lower:
            titulo = limpar_titulo(linha)
            if titulo and len(titulo) > 8:
                return titulo

    # Fallback: usa o tipo de vaga detectado
    tipo = classificar_tipo_vaga(texto)
    modalidade = classificar_modalidade(texto)
    if modalidade != 'nao_especificado':
        return f"{tipo} ({modalidade.title()})"
    return tipo


def extrair_empresa(texto):
    # A extração rústica de regex para posts gera bugs severos na UX (Ex: 'North Star Metric.').
    # A partir da Fase A, retornamos None e deixamos a extração de empresa cargo exclusivo da Inteligência Artificial.
    return None


def classificar_modalidade(texto):
    texto_lower = texto.lower()
    if 'remoto' in texto_lower or 'remote' in texto_lower:
        return 'remoto'
    elif 'híbrido' in texto_lower or 'hibrido' in texto_lower:
        return 'hibrido'
    elif 'presencial' in texto_lower:
        return 'presencial'
    return 'nao_especificado'


def classificar_tipo_vaga(texto):
    texto_lower = texto.lower()
    if "product manager" in texto_lower or "product owner" in texto_lower:
        return "Product Manager"
    elif "ux/ui" in texto_lower or "ui/ux" in texto_lower:
        return "UX/UI Designer"
    elif "ux designer" in texto_lower:
        return "UX Designer"
    elif "ui designer" in texto_lower:
        return "UI Designer"
    elif "product designer" in texto_lower:
        return "Product Designer"
    return "Product Designer"


def determinar_forma_contato(emails, links, texto):
    if emails:
        return 'email'
    if links:
        return 'link'
    return 'mensagem'


def texto_menciona_link_comentario(texto):
    """Verifica se o texto menciona que o link está nos comentários."""
    texto_lower = texto.lower()
    padroes = [
        r'link\s+(?:no|nos|no\s+primeiro)?\s*coment[aá]rio',
        r'coment[aá]rio[s]?\s+(?:o\s+)?link',
        r'link\s+abaixo',
        r'link\s+nos\s+comments',
        r'confira\s+(?:o\s+)?link\s+(?:no|abaixo)',
        r'inscreva.*coment[aá]rio',
        r'aplique.*coment[aá]rio',
        r'primeiro\s+coment[aá]rio',
    ]
    return any(re.search(p, texto_lower) for p in padroes)


def extrair_dados_post_elemento(post_el):
    """Extrai dados de um elemento de post do LinkedIn."""
    try:
        texto = post_el.text
        if len(texto) < 50:
            return None

        if not eh_post_produto(texto):
            return None

        # Extrai todos os links do elemento HTML
        links_elementos = post_el.find_elements(By.TAG_NAME, "a")

        perfil_autor = None
        link_vaga = None
        links_externos = []
        nome_autor = None

        for link_el in links_elementos:
            href = link_el.get_attribute("href") or ""

            # Link do perfil do autor (primeiro link /in/ encontrado)
            if "/in/" in href and not perfil_autor:
                perfil_autor = href.split("?")[0]  # Remove query params
                # Pega o nome do autor do texto do link
                link_text = link_el.text.strip()
                if link_text and len(link_text) > 2 and len(link_text) < 50:
                    nome_autor = link_text

            # Links externos (não LinkedIn)
            elif href.startswith("http") and "linkedin.com" not in href:
                link_limpo = href.split("?")[0].rstrip('.,;:!?')
                links_externos.append(link_limpo)

        # Extrai emails do texto
        emails = extrair_emails(texto)

        # Define link da vaga (prioriza links externos)
        if links_externos:
            link_vaga = links_externos[0]

        # Extrai outros dados do texto
        titulo = extrair_titulo_vaga(texto)
        empresa = extrair_empresa(texto)
        modalidade = classificar_modalidade(texto)
        tipo_vaga = classificar_tipo_vaga(texto)

        # Determina forma de contato
        if link_vaga:
            forma_contato = 'link'
        elif emails:
            forma_contato = 'email'
        elif perfil_autor:
            forma_contato = 'mensagem'
        else:
            forma_contato = 'mensagem'

        # Fallback para nome do autor do texto
        if not nome_autor:
            linhas = texto.split('\n')
            for linha in linhas[:3]:
                if '•' in linha:
                    nome_autor = linha.split('•')[0].strip()
                    break

        return {
            "titulo": titulo,
            "empresa": empresa,
            "tipo_vaga": tipo_vaga,
            "fonte": "linkedin_posts",
            "link_vaga": link_vaga,
            "localizacao": None,
            "modalidade": modalidade,
            "requisito_ingles": "nao_especificado",
            "forma_contato": forma_contato,
            "email_contato": emails[0] if emails else None,
            "perfil_autor": perfil_autor,
            "nome_autor": nome_autor,
            "data_coleta": date.today().isoformat(),
        }
    except Exception as e:
        print(f"  Erro ao extrair post: {e}")
        return None


def texto_pede_contato(texto):
    """Verifica se o texto pede explicitamente para entrar em contato."""
    texto_lower = texto.lower()
    frases_contato = [
        "entre em contato", "entrar em contato", "mande mensagem", "envie mensagem",
        "fale com", "falar com", "dm", "inbox", "chama no", "me chama",
        "entre em contacto", "manda msg", "manda mensagem"
    ]
    return any(frase in texto_lower for frase in frases_contato)


def scroll_e_extrair_posts(driver, max_scrolls=200, progress_callback=None, base_url=None):
    """
    Faz scroll e extrai posts de vagas usando abordagem híbrida:
    1. Tenta seletores CSS modernos
    2. Fallback para divisão de texto por "Publicação no feed"

    Usa detecção inteligente de fim de conteúdo ao invés de limite fixo.

    Args:
        driver: WebDriver do Selenium
        max_scrolls: Limite de segurança (default alto: 200)
        progress_callback: Função opcional para reportar progresso em tempo real
        base_url: URL base da página de busca (para link_post_original)
    """
    posts_coletados = []
    textos_vistos = set()  # Hashes de textos já processados
    links_vistos = set()
    scrolls_sem_mudanca = 0  # Contador de scrolls sem mudança (altura ou posts)
    ultimo_total = 0
    ultima_altura = 0

    # Captura URL da página se não fornecida
    if base_url is None:
        try:
            base_url = driver.current_url
        except:
            base_url = None

    print("Fazendo scroll e coletando posts (detecção inteligente de fim)...")

    # Clica no body para focar
    try:
        body = driver.find_element(By.TAG_NAME, "body")
        body.click()
    except:
        pass

    for i in range(max_scrolls):
        # Usa Page Down para scroll
        try:
            body = driver.find_element(By.TAG_NAME, "body")
            for _ in range(5):
                body.send_keys(Keys.PAGE_DOWN)
                time.sleep(0.3)
        except:
            driver.execute_script("window.scrollBy(0, 1000);")
        time.sleep(2.5)

        # === ABORDAGEM HÍBRIDA: Tenta CSS primeiro, depois fallback para texto ===

        # Seletores CSS modernos (múltiplas tentativas)
        seletores_css = [
            "div[data-urn*='activity']",
            "div.feed-shared-update-v2",
            "div.occludable-update",
            "div[data-chameleon-result-urn]",
            "article[data-urn]",
            "div.update-components-actor",
        ]

        post_elements = []
        for seletor in seletores_css:
            try:
                elementos = driver.find_elements(By.CSS_SELECTOR, seletor)
                if elementos:
                    post_elements.extend(elementos)
            except:
                pass

        # Remove duplicatas (mesmo elemento pode ser encontrado por seletores diferentes)
        post_elements = list({el.id: el for el in post_elements if el.id}.values())

        # FALLBACK: Se não encontrou elementos CSS, usa divisão de texto
        if not post_elements or len(post_elements) < 3:
            # Usa a abordagem de dividir o body.text por "Publicação no feed"
            try:
                body_text = driver.find_element(By.TAG_NAME, "body").text
                partes = body_text.split("Publicação no feed")

                # Coleta todos os links da página para associar aos posts
                all_links = driver.find_elements(By.TAG_NAME, "a")
                links_pagina = []
                for link in all_links:
                    try:
                        href = link.get_attribute("href") or ""
                        if href:
                            links_pagina.append(href)
                    except:
                        pass

                if i % 5 == 0:
                    print(f"  Scroll {i+1}: {len(partes)-1} posts via texto, {len(posts_coletados)} vagas coletadas")

                # Processa cada parte como um post
                for idx, parte in enumerate(partes[1:]):  # Pula a primeira parte (antes do primeiro post)
                    # Extrai texto até "Gostar" (fim do post)
                    texto = parte.split("Gostar")[0].strip()
                    if len(texto) < 50:
                        continue

                    # Deduplicação por hash do texto
                    texto_hash = hash(texto[:300])  # Usa primeiros 300 chars para hash
                    if texto_hash in textos_vistos:
                        continue
                    textos_vistos.add(texto_hash)

                    # Verifica se é post de produto/UX
                    if not eh_post_produto(texto):
                        continue

                    # Extrai dados do texto
                    emails = extrair_emails(texto)
                    whatsapps = extrair_whatsapp(texto)
                    links_no_texto = extrair_links_externos(texto)
                    titulo = extrair_titulo_vaga(texto)
                    empresa = extrair_empresa(texto)
                    modalidade = classificar_modalidade(texto)
                    tipo_vaga = classificar_tipo_vaga(texto)

                    # Detecta repost
                    is_repost, autor_original = detectar_repost(texto)

                    # Extrai perfil do autor das primeiras linhas
                    nome_autor = None
                    perfil_autor = None
                    linhas = texto.split('\n')
                    for linha in linhas[:3]:
                        if '•' in linha:
                            nome_autor = linha.split('•')[0].strip()
                            break

                    # Busca links associados a este post (aproximação por posição)
                    link_lnkd = None
                    link_jobs = None
                    links_externos = []

                    # Busca nos links da página que estão próximos a este post
                    start_idx = max(0, idx * 10)
                    end_idx = min(len(links_pagina), (idx + 1) * 15)
                    for href in links_pagina[start_idx:end_idx]:
                        if "/jobs/view/" in href and not link_jobs:
                            link_jobs = href.split("?")[0]
                        elif "lnkd.in" in href and not link_lnkd:
                            link_lnkd = href
                        elif "/in/" in href and not perfil_autor:
                            perfil_autor = href.split("?")[0]
                        elif href.startswith("http") and "linkedin.com" not in href:
                            if eh_link_relevante(href):
                                links_externos.append(href.split("?")[0])

                    # Adiciona links encontrados no texto
                    for link in links_no_texto:
                        if "lnkd.in" in link and not link_lnkd:
                            link_lnkd = link
                        elif "/jobs/view/" in link and not link_jobs:
                            link_jobs = link.split("?")[0]
                        elif eh_link_relevante(link) and link not in links_externos:
                            links_externos.append(link)

                    # Determina link da vaga (ordem de prioridade)
                    link_vaga = None
                    if link_jobs:
                        link_vaga = link_jobs
                    elif links_externos:
                        link_vaga = links_externos[0]
                    elif link_lnkd:
                        link_vaga = link_lnkd

                    # Evita duplicatas por link
                    if link_vaga and link_vaga in links_vistos:
                        continue
                    if link_vaga:
                        links_vistos.add(link_vaga)

                    # Determina forma de contato
                    if whatsapps:
                        forma_contato = 'whatsapp'
                    elif link_vaga:
                        forma_contato = 'link'
                    elif emails:
                        forma_contato = 'email'
                    elif perfil_autor:
                        forma_contato = 'mensagem'
                    else:
                        forma_contato = 'indefinido'

                    # Só salva se tiver alguma forma de aplicar
                    if forma_contato == 'indefinido':
                        continue

                    # Fallback (sem elementos HTML não é possível pegar imgs facilmente aqui, mas os outros dados sim)
                    imagens_urls = []

                    posts_coletados.append({
                        "titulo": titulo,
                        "empresa": empresa,
                        "tipo_vaga": tipo_vaga,
                        "fonte": "linkedin_posts",
                        "link_vaga": link_vaga,
                        "localizacao": None,
                        "modalidade": modalidade,
                        "requisito_ingles": "nao_especificado",
                        "forma_contato": forma_contato,
                        "email_contato": emails[0] if emails else None,
                        "whatsapp_contato": whatsapps[0] if whatsapps else None,
                        "perfil_autor": perfil_autor,
                        "nome_autor": autor_original if is_repost else nome_autor,
                        "data_coleta": date.today().isoformat(),
                        "link_post_original": base_url,
                        "imagens_urls": imagens_urls,
                    })

                    print(f"  + {titulo[:40]}... ({forma_contato})")

            except Exception as e:
                print(f"  Erro no fallback de texto: {e}")

        else:
            # Processa elementos CSS encontrados
            if i % 5 == 0:
                print(f"  Scroll {i+1}: {len(post_elements)} posts via CSS, {len(posts_coletados)} vagas coletadas")

            for post_el in post_elements:
                try:
                    # Identifica post único pelo data-urn ou texto hash
                    post_id = post_el.get_attribute("data-urn") or ""
                    if not post_id:
                        texto_preview = post_el.text[:200] if post_el.text else ""
                        post_id = str(hash(texto_preview))

                    if post_id in textos_vistos:
                        continue
                    textos_vistos.add(post_id)

                    # Extrai texto do post
                    texto = post_el.text
                    if len(texto) < 50:
                        continue

                    # Verifica se é post de produto/UX ou tem palavras chave de contratação fortes + Imagem
                    tem_palavras_contratacao = any(p in texto.lower() for p in ["vaga", "oportunidade", "contratando", "hiring", "estamos buscando"])
                    
                    # Extrai imagens deste post (carrossel/post)
                    imagens_elementos = post_el.find_elements(By.TAG_NAME, "img")
                    imagens_urls = []
                    for img in imagens_elementos:
                        src = img.get_attribute("src") or ""
                        # Filtra ícones, emoticons e avatares
                        if src and "profile" not in src and "ghost" not in src and "emoji" not in src and "svg" not in src:
                            imagens_urls.append(src)

                    # Se não for de UX e não tiver palavras-chave fortes de Vaga COM imagem
                    if not eh_post_produto(texto):
                        if not (tem_palavras_contratacao and imagens_urls):
                            continue

                    # Extrai links deste post específico
                    links_do_post = post_el.find_elements(By.TAG_NAME, "a")

                    perfil_autor = None
                    nome_autor = None
                    link_lnkd = None
                    link_jobs = None
                    links_externos = []

                    for link_el in links_do_post:
                        try:
                            href = link_el.get_attribute("href") or ""
                            link_text = link_el.text.strip()

                            if "/in/" in href and not perfil_autor:
                                perfil_autor = href.split("?")[0]
                                if link_text and 2 < len(link_text) < 50:
                                    nome_autor = link_text
                            elif "/jobs/view/" in href and not link_jobs:
                                link_jobs = href.split("?")[0]
                            elif "lnkd.in" in href and not link_lnkd:
                                link_lnkd = href
                            elif href.startswith("http") and "linkedin.com" not in href:
                                link_limpo = href.split("?")[0].rstrip('.,;:!?')
                                if eh_link_relevante(link_limpo):
                                    links_externos.append(link_limpo)
                        except:
                            continue

                    # Extrai dados do texto
                    emails = extrair_emails(texto)
                    whatsapps = extrair_whatsapp(texto)
                    links_no_texto = extrair_links_externos(texto)
                    titulo = extrair_titulo_vaga(texto)
                    empresa = extrair_empresa(texto)
                    modalidade = classificar_modalidade(texto)
                    tipo_vaga = classificar_tipo_vaga(texto)

                    # Detecta repost
                    is_repost, autor_original = detectar_repost(texto)

                    # Fallback para nome do autor
                    if not nome_autor:
                        linhas = texto.split('\n')
                        for linha in linhas[:3]:
                            if '•' in linha:
                                nome_autor = linha.split('•')[0].strip()
                                break

                    # Combina links do elemento + links do texto
                    todos_links_externos = list(set(links_externos + [l for l in links_no_texto if eh_link_relevante(l)]))

                    # Determina link da vaga
                    link_vaga = None
                    if link_jobs:
                        link_vaga = link_jobs
                    elif todos_links_externos:
                        link_vaga = todos_links_externos[0]
                    elif link_lnkd:
                        link_vaga = link_lnkd

                    # Evita duplicatas por link
                    if link_vaga and link_vaga in links_vistos:
                        continue
                    if link_vaga:
                        links_vistos.add(link_vaga)

                    # Determina forma de contato
                    if whatsapps:
                        forma_contato = 'whatsapp'
                    elif link_vaga:
                        forma_contato = 'link'
                    elif emails:
                        forma_contato = 'email'
                    elif perfil_autor:
                        forma_contato = 'mensagem'
                    else:
                        forma_contato = 'indefinido'

                    if forma_contato == 'indefinido':
                        continue

                    posts_coletados.append({
                        "titulo": titulo,
                        "empresa": empresa,
                        "tipo_vaga": tipo_vaga,
                        "fonte": "linkedin_posts",
                        "link_vaga": link_vaga,
                        "localizacao": None,
                        "modalidade": modalidade,
                        "requisito_ingles": "nao_especificado",
                        "forma_contato": forma_contato,
                        "email_contato": emails[0] if emails else None,
                        "whatsapp_contato": whatsapps[0] if whatsapps else None,
                        "perfil_autor": perfil_autor,
                        "nome_autor": autor_original if is_repost else nome_autor,
                        "data_coleta": date.today().isoformat(),
                        "link_post_original": base_url,
                        "imagens_urls": imagens_urls,
                    })

                    print(f"  + {titulo[:40]}... ({forma_contato})")

                except Exception as e:
                    continue

        # === DETECÇÃO INTELIGENTE DE FIM DE CONTEÚDO ===
        # Verifica altura da página e número de posts
        try:
            altura_atual = driver.execute_script("return document.body.scrollHeight")
        except:
            altura_atual = ultima_altura

        # Verifica se página exibe mensagem de fim (LinkedIn mostra isso)
        fim_detectado_texto = False
        try:
            body_text = driver.find_element(By.TAG_NAME, "body").text
            mensagens_fim = ["Você viu todas as publicações", "You've seen all posts", "No more results"]
            fim_detectado_texto = any(msg.lower() in body_text.lower() for msg in mensagens_fim)
        except:
            pass

        if fim_detectado_texto:
            print(f"  Fim do feed detectado por mensagem do LinkedIn após {i+1} scrolls")
            break

        # Notifica progresso (sem mostrar scroll/max, só vagas encontradas)
        if progress_callback:
            # Calcula progresso estimado baseado em inatividade
            # Se está encontrando vagas, progresso aumenta; se não, progresso fica alto
            if len(posts_coletados) > 0:
                progresso = min(90, 30 + int((scrolls_sem_mudanca / 5) * 60))
            else:
                progresso = min(30, i * 3)

            progress_callback({
                "tipo": "scroll",
                "scroll_atual": i + 1,
                "total_vagas": len(posts_coletados),
                "total_posts_vistos": len(textos_vistos),
                "progresso": progresso
            })

        # Verifica se houve mudança (altura OU posts novos)
        houve_mudanca = (altura_atual != ultima_altura) or (len(posts_coletados) != ultimo_total)

        if not houve_mudanca:
            scrolls_sem_mudanca += 1

            # Condições de parada
            if scrolls_sem_mudanca >= 5:
                # Já encontrou vagas e 5 scrolls sem mudança = fim
                if len(posts_coletados) > 0:
                    print(f"  Fim do feed - {scrolls_sem_mudanca} scrolls sem novos posts/vagas (após {i+1} scrolls totais)")
                    break
                # Não encontrou nenhuma e 15 scrolls sem mudança = problema ou sem conteúdo
                elif scrolls_sem_mudanca >= 15:
                    print(f"  Nenhum post encontrado após {i+1} scrolls - finalizando")
                    break
        else:
            scrolls_sem_mudanca = 0

        ultima_altura = altura_atual
        ultimo_total = len(posts_coletados)

    print(f"Total coletado: {len(posts_coletados)} vagas de {len(textos_vistos)} posts analisados em {i+1} scrolls")
    return posts_coletados


def coletar_posts_brutos(max_scrolls=30, headless=True):
    """Coleta posts brutos (texto + links) para análise com IA."""

    url = "https://www.linkedin.com/search/results/content/?keywords=ux%20vaga&datePosted=%22past-24h%22&sortBy=%22date_posted%22"
    driver = None
    posts_brutos = []
    textos_vistos = set()

    try:
        driver = criar_driver_com_perfil(headless=headless)
        driver.get(url)
        time.sleep(5)

        print(f"URL: {driver.current_url}")
        print("Coletando posts brutos...")

        body = driver.find_element(By.TAG_NAME, "body")
        body.click()

        for i in range(max_scrolls):
            # Scroll
            for _ in range(5):
                body.send_keys(Keys.PAGE_DOWN)
                time.sleep(0.3)  # Aumentado de 0.2 para 0.3
            time.sleep(2.5)  # Aumentado de 1.5s para 2.5s - mais tempo para conteúdo carregar

            # Coleta texto e links
            body_text = driver.find_element(By.TAG_NAME, "body").text
            all_links = driver.find_elements(By.TAG_NAME, "a")

            # Mapeia links por posição aproximada
            links_pagina = []
            for link in all_links:
                try:
                    href = link.get_attribute("href") or ""
                    if "lnkd.in" in href or "/in/" in href or "/jobs/" in href:
                        links_pagina.append(href.split("?")[0])
                except:
                    pass

            # Divide posts
            partes = body_text.split("Publicação no feed")

            if i % 5 == 0:
                print(f"  Scroll {i+1}: {len(partes)-1} posts, {len(posts_brutos)} coletados")

            for idx, parte in enumerate(partes[1:]):
                texto = parte.split("Gostar")[0].strip()
                if len(texto) < 50:
                    continue

                # Hash do texto completo para melhor deduplicação
                texto_hash = hash(texto)
                if texto_hash in textos_vistos:
                    continue
                textos_vistos.add(texto_hash)

                # Associa links próximos ao post
                links_post = links_pagina[idx*3:(idx+1)*3] if links_pagina else []

                posts_brutos.append({
                    "id": len(posts_brutos) + 1,
                    "texto": texto[:500],
                    "links": links_post
                })

        print(f"\nTotal: {len(posts_brutos)} posts brutos coletados")
        return posts_brutos

    except Exception as e:
        print(f"Erro: {e}")
        return posts_brutos

    finally:
        if driver:
            driver.quit()


def coletar_vagas_linkedin_posts(max_scrolls=30, headless=True, progress_callback=None):
    """
    Coleta vagas de publicações do LinkedIn (método legado sem IA).

    Args:
        max_scrolls: Número máximo de scrolls
        headless: Se True, roda sem interface gráfica
        progress_callback: Função opcional para reportar progresso em tempo real
    """

    url = "https://www.linkedin.com/search/results/content/?keywords=ux%20vaga&datePosted=%22past-24h%22&sortBy=%22date_posted%22"
    driver = None

    try:
        driver = criar_driver_com_perfil(headless=headless)
        driver.get(url)
        time.sleep(5)

        current_url = driver.current_url
        print(f"URL: {current_url}")
        print("Coletando publicações...")

        vagas = scroll_e_extrair_posts(driver, max_scrolls, progress_callback=progress_callback, base_url=current_url)

        print(f"\nTotal: {len(vagas)} vagas")
        return vagas

    except Exception as e:
        print(f"Erro: {e}")
        return []

    finally:
        if driver:
            driver.quit()


def coletar_e_analisar_com_ia(max_scrolls=30, headless=True):
    """Coleta posts e analisa com IA para extração precisa."""
    from .analisar_com_ia import analisar_posts_com_ia

    print("=== ETAPA 1: Coletando posts brutos ===")
    posts_brutos = coletar_posts_brutos(max_scrolls, headless)

    if not posts_brutos:
        print("Nenhum post coletado")
        return []

    print(f"\n=== ETAPA 2: Analisando {len(posts_brutos)} posts com IA ===")
    vagas = analisar_posts_com_ia(posts_brutos)

    print(f"\n=== RESULTADO: {len(vagas)} vagas UX extraídas ===")
    return vagas


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--ia":
        # Modo com IA
        vagas = coletar_e_analisar_com_ia()
    else:
        # Modo legado
        vagas = coletar_vagas_linkedin_posts()

    print(f"\n{'='*50}")
    print(f"RESULTADO: {len(vagas)} vagas")
    for v in vagas[:10]:
        print(f"\n- {v['titulo']}")
        print(f"  Contato: {v['forma_contato']}")
