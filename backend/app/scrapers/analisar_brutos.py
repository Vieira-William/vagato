#!/usr/bin/env python3
"""
Analisa arquivos brutos e extrai vagas de UX/Produto.

Arquitetura de 2 etapas:
1. ETAPA 1 (coleta_bruta.py): Coleta bruta → JSON
2. ETAPA 2 (este arquivo): JSON → Análise → Vagas filtradas

CORREÇÕES v2 (QA intensivo):
- Detecta e ignora posts agregadores (10 VAGAS HOME OFFICE)
- Rastreia links usados para evitar duplicatas
- Detecta links genéricos (páginas de busca, não vagas específicas)
- Extração de títulos sem fallback genérico
"""

import json
import os
import re
from datetime import date
from typing import Optional, List, Set

# =============================================================================
# CONSTANTES
# =============================================================================

# Termos que indicam vaga de UX/Produto
TERMOS_PRODUTO = [
    "product designer", "product design", "ux designer", "ui designer",
    "ux/ui", "ui/ux", "service designer", "head de produto", "product owner",
    "product manager", "design de produto", "designer de produto", "vaga de ux",
    "vaga ux", "vaga product", "vaga designer", "oportunidade ux", "oportunidade product",
    "ux research", "ux researcher", "design ops", "designops", "ux writing",
    "ux writer", "content designer", "content design",
]

# Termos que EXCLUEM (não é vaga de UX/Produto)
TERMOS_EXCLUIR = [
    "developer", "desenvolvedor", "engineer", "engenheiro", "qa", "tester",
    "analista de dados", "data analyst", "designer gráfico", "graphic designer",
    "marketing", "growth", "devops", "backend", "frontend", "fullstack",
    "designer multimídia", "multimidia", "audiovisual", "motion designer",
    "designer instrucional", "web designer", "game designer",
]

# Plataformas de vagas conhecidas
PLATAFORMAS_VAGAS = [
    "gupy.io", "lever.co", "greenhouse.io", "workable.com",
    "99jobs.com", "vagas.com", "catho.com.br", "trampos.co", "jobs.lever.co",
    "boards.greenhouse.io", "apply.workable.com", "jobs.gupy.io",
]

# Nomes de páginas/perfis agregadores conhecidos
AGREGADORES_CONHECIDOS = [
    "nerdin vagas", "vagas rj", "empregos aqui", "tecnologia da informação",
    "temos vagas", "home office", "remoto", "vagas ti", "vagas de ti",
    "vagas tech", "emprego", "trabalho remoto",
]

# =============================================================================
# RASTREAMENTO GLOBAL DE LINKS (evita duplicatas)
# =============================================================================

_links_usados_global: Set[str] = set()


def resetar_links_usados():
    """Reseta o rastreamento de links (chamar no início de cada análise de arquivo)."""
    global _links_usados_global
    _links_usados_global = set()


def link_ja_usado(link: str) -> bool:
    """Verifica se um link já foi usado em outra vaga."""
    return link in _links_usados_global


def registrar_link_usado(link: str):
    """Registra um link como usado."""
    _links_usados_global.add(link)


# =============================================================================
# DETECÇÃO DE POSTS AGREGADORES
# =============================================================================

def eh_post_agregador(texto: str) -> bool:
    """
    Detecta se o post lista MÚLTIPLAS vagas (agregador).

    Esses posts devem ser IGNORADOS pois:
    - Links são genéricos (não apontam para vaga específica)
    - Não é possível associar título correto a cada link

    Returns:
        True se é agregador (deve ser ignorado)
    """
    texto_lower = texto.lower()

    # Padrão 1: "X VAGAS" onde X > 1
    match_vagas = re.search(r'(\d+)\s*vagas?\s*(home\s*office|remot[oa]s?|em\s*todo|trabalho|ti)?', texto_lower)
    if match_vagas:
        num_vagas = int(match_vagas.group(1))
        if num_vagas > 1:
            return True

    # Padrão 2: Múltiplos "Candidate-se" ou "Apply" (2+ = agregador)
    count_candidatese = texto_lower.count('candidate-se')
    count_apply = texto_lower.count('apply now') + texto_lower.count('apply:')
    if count_candidatese >= 2 or count_apply >= 2:
        return True

    # Padrão 3: Lista numerada de vagas (1., 2., 3... ou 1), 2), 3)...)
    linhas_numeradas = re.findall(r'^\s*[1-9][0-9]?[\.\)\-\:️⃣]', texto, re.MULTILINE)
    if len(linhas_numeradas) >= 3:
        return True

    # Padrão 4: Múltiplos emojis numéricos (1️⃣, 2️⃣, 3️⃣...)
    emojis_num = len(re.findall(r'[1-9]️⃣', texto))
    if emojis_num >= 2:  # 2+ já indica lista
        return True

    # Padrão 5: Muitas setas indicando lista de vagas (→ ou ➡️ ou 🔗)
    count_setas = texto.count('→') + texto.count('➡️') + texto.count('->') + texto.count('🔗')
    if count_setas >= 4:
        return True

    # Padrão 6: Posts de páginas agregadoras conhecidas
    primeiras_linhas = '\n'.join(texto.split('\n')[:5]).lower()
    for nome in AGREGADORES_CONHECIDOS:
        if nome in primeiras_linhas:
            # Verifica se tem indicadores de lista
            if count_candidatese >= 1 or count_setas >= 2 or match_vagas:
                return True

    # Padrão 7: Post começa com lista de vagas sem autor claro
    if texto_lower.strip().startswith(('10 vagas', '5 vagas', 'vagas home', 'vagas remot')):
        return True

    # Padrão 8: Múltiplas menções de cargos em lista (curadoria de vagas)
    # Ex: "vagas em UX, UI, Product, Service, Design Gráfico, Research"
    if re.search(r'vagas?\s+(?:em|de|para)\s+[\w\s,]+,\s+[\w\s]+,\s+[\w\s]+', texto_lower):
        return True

    # Padrão 9: Newsletter/curadoria de vagas
    indicadores_curadoria = [
        'curadoria de vagas', 'edição especial', 'newsletter', 'foca no ux',
        'recheada de vagas', 'oportunidades reais', 'confira as vagas',
        'selecionamos algumas', 'confira agora', 'repassando oportunidades',
    ]
    for ind in indicadores_curadoria:
        if ind in texto_lower:
            return True

    # Padrão 10: Bootcamp/curso (não é vaga específica)
    if 'bootcamp' in texto_lower and ('gratuito' in texto_lower or 'inscrição' in texto_lower):
        return True

    # Padrão 11: Pessoa buscando vaga (não oferecendo)
    buscando_vaga = [
        'estou em busca de', 'estou buscando', 'em busca de oportunidade',
        'busco oportunidade', 'procurando oportunidade', 'à procura de',
        'looking for opportunity', 'open to work', 'disponível para',
    ]
    for termo in buscando_vaga:
        if termo in texto_lower:
            return True

    return False


# =============================================================================
# DETECÇÃO DE LINKS GENÉRICOS
# =============================================================================

def eh_link_generico(link: str) -> bool:
    """
    Detecta se o link é genérico (página de lista de vagas, não vaga específica).

    Returns:
        True se é genérico (deve ser ignorado)
    """
    if not link:
        return True

    link_lower = link.lower()

    # Links terminando em /vagas, /jobs sem ID específico
    padroes_genericos = [
        r'/vagas/?(\?.*)?$',
        r'/jobs/?(\?.*)?$',
        r'/careers/?(\?.*)?$',
        r'/carreiras/?(\?.*)?$',
        r'/trabalhe-conosco/?$',
        r'/oportunidades/?$',
        r'/home-office/?$',
    ]

    for padrao in padroes_genericos:
        if re.search(padrao, link_lower):
            return True

    # Links de páginas agregadoras (não vagas específicas)
    # nerdin.com.br/vagas é genérico, mas nerdin.com.br/vaga/12345 é específico
    if 'nerdin.com.br/vagas' in link_lower and '/vaga/' not in link_lower:
        return True

    # Perfis pessoais ou de empresa (não são vagas)
    if '/linkedin.com/company/' in link_lower:
        return True
    if '/linkedin.com/in/' in link_lower:
        return True

    return False


# =============================================================================
# VALIDAÇÃO DE LINKS
# =============================================================================

# Cache de links já expandidos (evita requests repetidos)
_links_expandidos_cache: dict = {}


def expandir_link_encurtado(link: str) -> Optional[str]:
    """
    Expande link encurtado (lnkd.in) para URL final.
    Retorna None se falhar.
    """
    global _links_expandidos_cache

    if link in _links_expandidos_cache:
        return _links_expandidos_cache[link]

    try:
        import requests
        resp = requests.get(link, timeout=10, allow_redirects=True)
        url_final = resp.url
        _links_expandidos_cache[link] = url_final
        return url_final
    except Exception:
        _links_expandidos_cache[link] = None
        return None


def eh_link_vaga_especifica(link: str) -> bool:
    """
    Verifica se um link é de vaga ESPECÍFICA (não página genérica de listagem).
    Para links lnkd.in, expande e verifica o destino.
    """
    if not link:
        return False

    link_lower = link.lower()

    # Se é lnkd.in, precisa expandir para verificar
    if "lnkd.in" in link_lower:
        url_final = expandir_link_encurtado(link)
        if not url_final:
            return False  # Falhou em expandir, assume não é válido
        link_lower = url_final.lower()

    # Agora verifica se o link (expandido ou não) é específico

    # GENÉRICO: páginas de listagem de vagas
    padroes_genericos = [
        r'nerdin\.com\.br/vagas\?',  # nerdin.com.br/vagas?... é genérico
        r'/vagas\?',                   # /vagas?... é genérico
        r'/jobs\?',                    # /jobs?... é genérico
        r'/vagas/?$',                  # /vagas ou /vagas/ no fim
        r'/jobs/?$',                   # /jobs ou /jobs/ no fim
        r'/careers/?$',
        r'/carreiras/?$',
    ]
    for padrao in padroes_genericos:
        if re.search(padrao, link_lower):
            return False

    # ESPECÍFICO: tem ID de vaga na URL
    padroes_especificos = [
        r'/vaga/\d+',                  # /vaga/12345
        r'/job/\d+',                   # /job/12345
        r'/jobs/view/\d+',             # LinkedIn /jobs/view/123
        r'/vagas/[a-z0-9-]+$',         # Gupy slug /vagas/ux-designer-123
        r'[?&]job_id=',                # ?job_id=...
    ]
    for padrao in padroes_especificos:
        if re.search(padrao, link_lower):
            return True

    # Se é plataforma de vagas conhecida, assume válido
    for p in PLATAFORMAS_VAGAS:
        if p in link_lower:
            return True

    return False


def eh_link_vaga_valido(link: str) -> bool:
    """Verifica se o link é potencialmente uma vaga específica."""
    if not link:
        return False

    link_lower = link.lower()

    # Blacklist de domínios
    dominios_ignorar = [
        "instagram.com", "twitter.com", "x.com", "facebook.com",
        "youtube.com", "tiktok.com", "spotify.com", "discord",
        "whatsapp.com", "t.me", "telegram",
    ]
    for d in dominios_ignorar:
        if d in link_lower:
            return False

    # Whitelist de plataformas de vagas
    for p in PLATAFORMAS_VAGAS:
        if p in link_lower:
            return True

    # Links do LinkedIn de vagas específicas
    if "/jobs/view/" in link_lower:
        return True

    # Links encurtados lnkd.in - precisa validar destino
    if "lnkd.in" in link_lower:
        return True

    # Outros links externos com indicadores de vaga
    if link.startswith("http") and "linkedin.com" not in link_lower:
        # Verifica se tem indicadores de vaga na URL
        indicadores_vaga = ['/vaga/', '/job/', '/apply', '/candidatar', '/position/']
        if any(ind in link_lower for ind in indicadores_vaga):
            return True
        # Aceita outros links externos (pode ser página de carreira)
        return True

    return False


# =============================================================================
# EXTRAÇÃO DE TÍTULO (REESCRITO - SEM FALLBACK GENÉRICO)
# =============================================================================

def extrair_titulo_vaga(texto: str) -> Optional[str]:
    """
    Extrai título da vaga do texto.

    Returns:
        Título extraído ou None se não conseguir extrair um título válido
    """
    texto_lower = texto.lower()

    # Padrão 1: Títulos explícitos "Vaga: TITULO" ou "[VAGA] TITULO"
    padroes_explicitos = [
        r'\[(?:olha\s+a\s+)?vaga\][:\s\-]+([A-Za-zÀ-ú][A-Za-zÀ-ú\s/\-\(\)]+?)(?:\n|\||–|—|!|$)',
        r'(?:vaga|oportunidade)[:\s\|]+([A-Za-zÀ-ú][A-Za-zÀ-ú\s/\-\(\)]+?)(?:\n|\||–|—|!|$)',
        r'(?:contratando|hiring|buscamos)[:\s]+([A-Za-zÀ-ú][A-Za-zÀ-ú\s/\-\(\)]+?)(?:\n|\||–|—|!|$)',
    ]

    for padrao in padroes_explicitos:
        match = re.search(padrao, texto, re.IGNORECASE)
        if match:
            titulo = match.group(1).strip()
            if _titulo_valido(titulo):
                return _normalizar_titulo(titulo)

    # Padrão 2: Cargos específicos com nível
    padroes_cargo = [
        # Product Designer com variações
        r'\b((?:senior |sênior |sr\.?\s*|pleno |jr\.?\s*|junior |júnior )?product\s+designer(?:\s+(?:jr\.?|pleno|sênior|senior|remoto|remote))?)\b',
        # UX Designer com variações
        r'\b((?:senior |sênior |sr\.?\s*|pleno |jr\.?\s*|junior |júnior )?ux\s+designer(?:\s+(?:jr\.?|pleno|sênior|senior|remoto|remote))?)\b',
        # UI Designer com variações
        r'\b((?:senior |sênior |sr\.?\s*|pleno |jr\.?\s*|junior |júnior )?ui\s+designer(?:\s+(?:jr\.?|pleno|sênior|senior|remoto|remote))?)\b',
        # UX/UI Designer
        r'\b((?:senior |sênior |sr\.?\s*|pleno |jr\.?\s*)?(?:ux/?ui|ui/?ux)\s+designer(?:\s+(?:jr\.?|pleno|sênior|senior))?)\b',
        # Product Manager/Owner
        r'\b(product\s+(?:manager|owner)(?:\s+(?:jr\.?|pleno|sênior|senior))?)\b',
        # Head/Lead
        r'\b((?:head|lead|líder)\s+(?:de\s+)?(?:produto|product|design|ux))\b',
        # UX Research
        r'\b(ux\s+(?:research(?:er)?|writing|writer))\b',
        # Content Designer
        r'\b(content\s+design(?:er)?)\b',
        # Service Designer
        r'\b(service\s+designer)\b',
        # Design de Produto (PT)
        r'\b(design(?:er)?\s+de\s+(?:produto|interface|interação))\b',
    ]

    for padrao in padroes_cargo:
        match = re.search(padrao, texto_lower)
        if match:
            titulo = match.group(1).strip()
            if len(titulo) >= 8:  # Mínimo 8 caracteres
                return _normalizar_titulo(titulo)

    # Padrão 3: Linhas que parecem ser título de vaga (RESTRITO)
    linhas = texto.split('\n')
    for linha in linhas[:20]:  # Primeiras 20 linhas
        linha = linha.strip()
        linha_lower = linha.lower()

        # Ignora linhas muito curtas ou muito longas
        if len(linha) < 12 or len(linha) > 60:
            continue

        # Ignora linhas que são claramente não-títulos
        invalidos = [
            'candidate-se', 'apply', 'http', 'www.', '@', 'r$',
            'requisitos', 'responsabilidades', 'qualifications',
            'enviando', 'send', 'contato', 'email', 'dm', 'inbox',
            'confira', 'veja', 'saiba mais', 'clique', 'acesse',
            'seguir', 'conectar', 'participar', 'curtir', 'compartilh',
            '•', 'verificado', 'verified', 'premium', '1st', '2nd', '3rd',
        ]
        if any(x in linha_lower for x in invalidos):
            continue

        # Linha deve conter termo de cargo UX/Produto
        termos_cargo = ['designer', 'product', 'ux', 'ui', 'manager', 'owner', 'research', 'writing']
        if any(t in linha_lower for t in termos_cargo):
            # Verifica se parece ser título (não frase longa)
            if linha.count(' ') <= 6:  # Máximo 6 espaços = ~7 palavras
                return _normalizar_titulo(linha)

    # NÃO USAR FALLBACK - retorna None se não conseguir extrair
    return None


def _titulo_valido(titulo: str) -> bool:
    """Valida se um título extraído é válido."""
    if not titulo:
        return False

    # Muito curto
    if len(titulo) < 8:
        return False

    # Muito longo (provavelmente é parágrafo, não título)
    if len(titulo) > 60:
        return False

    # É apenas termo genérico demais
    titulos_genericos = [
        'designer', 'product designer', 'ux', 'ui', 'product',
        'vaga', 'oportunidade', 'contratando', 'hiring',
    ]
    if titulo.lower().strip() in titulos_genericos:
        return False

    # Contém palavras que indicam que não é título
    palavras_invalidas = [
        'candidate-se', 'apply', 'click', 'clique', 'link',
        'http', 'www', 'confira', 'veja', 'saiba mais',
        'vagas', 'home office', 'remoto',  # Listas, não títulos
    ]
    if any(p in titulo.lower() for p in palavras_invalidas):
        return False

    return True


def _normalizar_titulo(titulo: str) -> str:
    """Normaliza o título extraído."""
    # Remove caracteres especiais do início/fim
    titulo = titulo.strip(' \t\n\r-–—|:!.')

    # Remove emojis comuns
    titulo = re.sub(r'[🚀🎯💼📍✨🔥💡]', '', titulo).strip()

    # Capitaliza corretamente
    titulo = titulo.title()

    # Corrige siglas comuns
    substituicoes = {
        'Ux': 'UX',
        'Ui': 'UI',
        'Ux/Ui': 'UX/UI',
        'Ui/Ux': 'UI/UX',
        ' Jr': ' Jr.',
        ' Sr': ' Sr.',
        'Jr.': 'Júnior',
        'Sr.': 'Sênior',
    }
    for de, para in substituicoes.items():
        titulo = titulo.replace(de, para)

    return titulo[:60]  # Limita a 60 caracteres


# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

def eh_vaga_ux_produto(texto: str) -> bool:
    """
    Verifica se o texto indica uma vaga de UX/Produto.

    Lógica:
    1. Se contém termo de exclusão → EXCLUI (mesmo se tiver "ux/ui")
       Exemplo: "Designer Multimídia | UX/UI" → EXCLUÍDO (multimídia é exclusão)
    2. Se contém termo de produto → INCLUI
    3. Senão → EXCLUI
    """
    texto_lower = texto.lower()

    # Primeiro verifica exclusões — se encontrou, EXCLUI independente de inclusões
    for termo in TERMOS_EXCLUIR:
        if termo in texto_lower:
            return False

    # Verifica se tem termos de produto
    for termo in TERMOS_PRODUTO:
        if termo in texto_lower:
            return True

    return False


def extrair_empresa(texto: str) -> Optional[str]:
    """Extrai nome da empresa do texto."""
    padroes = [
        r'(?:@|na\s+|at\s+|aqui\s+na\s+)([A-Z][a-zA-Z0-9\s&\-\.]{2,25})',
        r'empresa[:\s]+([A-Z][a-zA-Z0-9\s&\-\.]{2,25})',
        r'(?:estamos|está)\s+(?:na|at)\s+([A-Z][a-zA-Z0-9\s&\-\.]{2,25})',
    ]
    for padrao in padroes:
        match = re.search(padrao, texto)
        if match:
            empresa = match.group(1).strip()
            # Remove newlines e timestamps que podem vir grudados
            empresa = empresa.split('\n')[0].strip()
            # Remove padrões de tempo (ex: "7 h", "1 d")
            empresa = re.sub(r'\s*\d+\s*[hd]\s*$', '', empresa).strip()
            # Filtra empresas que são claramente erradas
            invalidos = ['linkedin', 'seguir', 'conectar', 'perfil', 'premium',
                         'verified', 'profile', '1st', '2nd', '2º', '1°']
            if not any(inv in empresa.lower() for inv in invalidos):
                if len(empresa) >= 2:
                    return empresa[:50]
    return None


def classificar_modalidade(texto: str) -> str:
    """Classifica modalidade de trabalho."""
    texto_lower = texto.lower()
    if 'remoto' in texto_lower or 'remote' in texto_lower:
        return 'remoto'
    elif 'híbrido' in texto_lower or 'hibrido' in texto_lower or 'hybrid' in texto_lower:
        return 'hibrido'
    elif 'presencial' in texto_lower or 'on-site' in texto_lower:
        return 'presencial'
    return 'nao_especificado'


def classificar_tipo_vaga(texto: str) -> str:
    """Classifica tipo da vaga."""
    texto_lower = texto.lower()
    if "product manager" in texto_lower or "product owner" in texto_lower:
        return "Product Manager"
    elif "ux/ui" in texto_lower or "ui/ux" in texto_lower:
        return "UX/UI Designer"
    elif "ux designer" in texto_lower:
        return "UX Designer"
    elif "ui designer" in texto_lower:
        return "UI Designer"
    elif "ux research" in texto_lower:
        return "UX Researcher"
    elif "ux writ" in texto_lower or "content design" in texto_lower:
        return "UX Writer"
    elif "product designer" in texto_lower:
        return "Product Designer"
    elif "service designer" in texto_lower:
        return "Service Designer"
    return "Product Designer"


def extrair_emails(texto: str) -> list:
    """Extrai emails do texto."""
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    emails = re.findall(pattern, texto)
    return list(set([e for e in emails if 'example' not in e.lower()]))


def _limpar_empresa(empresa: Optional[str]) -> Optional[str]:
    """
    Limpa nome de empresa removendo newlines, timestamps e valores inválidos.

    Reutiliza a mesma lógica de limpeza de extrair_empresa() para garantir
    consistência entre todas as fontes (posts, jobs, indeed).
    """
    if not empresa:
        return None
    # Remove newlines - pega só a primeira linha
    empresa = empresa.split('\n')[0].strip()
    # Remove padrões de tempo grudados (ex: "Bradesco 7 h" → "Bradesco")
    empresa = re.sub(r'\s*\d+\s*[hd]\s*$', '', empresa).strip()
    # Filtra empresas que são claramente erradas
    invalidos = ['linkedin', 'seguir', 'conectar', 'perfil', 'premium',
                 'verified', 'profile', '1st', '2nd', '2º', '1°']
    if any(inv in empresa.lower() for inv in invalidos):
        return None
    if len(empresa) < 2:
        return None
    return empresa[:50]


# =============================================================================
# ANÁLISE DE POST BRUTO (FUNÇÃO PRINCIPAL - REESCRITA)
# =============================================================================

def analisar_post_bruto(post: dict) -> Optional[dict]:
    """
    Analisa um post bruto e retorna vaga estruturada se for UX/Produto.

    Args:
        post: Dict com texto_completo, links_encontrados, nome_autor, perfil_autor

    Returns:
        Dict com vaga estruturada ou None se não for vaga válida
    """
    texto = post.get("texto_completo", "")
    links = post.get("links_encontrados", [])
    nome_autor = post.get("nome_autor")
    perfil_autor = post.get("perfil_autor")

    # Limpa timestamps capturados como nome_autor (ex: "3 h", "41 min")
    if nome_autor and re.match(r'^\d+\s*(min|h|d|sem|mês|meses|s)$', nome_autor.strip()):
        nome_autor = None

    # 1. NOVO: Detecta e ignora posts agregadores
    if eh_post_agregador(texto):
        return None

    # 2. Extrai título PRIMEIRO (antes do filtro UX)
    titulo = extrair_titulo_vaga(texto)
    if titulo is None:
        # Não conseguiu extrair título válido - ignora o post
        return None

    # 3. Filtra UX/Produto pelo TÍTULO (não pelo texto completo)
    # O título é a melhor indicação se a vaga é de UX/Produto
    if not eh_vaga_ux_produto(titulo):
        return None

    # 4. Extrai outros dados
    empresa = extrair_empresa(texto)
    modalidade = classificar_modalidade(texto)
    tipo_vaga = classificar_tipo_vaga(texto)
    emails = extrair_emails(texto)

    # 5. MODIFICADO: Encontra melhor link (com validação RIGOROSA)
    link_vaga = None
    for link in links:
        # Pula links genéricos (verificação rápida sem HTTP)
        if eh_link_generico(link):
            continue

        # Pula links já usados por outros posts
        if link_ja_usado(link):
            continue

        # Valida se é link de vaga
        if not eh_link_vaga_valido(link):
            continue

        # NOVO: Para links encurtados (lnkd.in), valida se destino é específico
        if "lnkd.in" in link.lower():
            if not eh_link_vaga_especifica(link):
                # Link expande para página genérica - não usar
                continue

        link_vaga = link
        registrar_link_usado(link)
        break

    # 6. Determina forma de contato
    if link_vaga:
        forma_contato = 'link'
    elif emails:
        forma_contato = 'email'
    elif perfil_autor:
        forma_contato = 'mensagem'
    else:
        forma_contato = 'indefinido'

    # Só retorna se tiver forma de aplicar
    if forma_contato == 'indefinido':
        return None

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
        "post_id_original": post.get("id"),
        "imagens_urls": post.get("imagens_urls", []),
    }


def analisar_job_bruto(job: dict) -> Optional[dict]:
    """
    Analisa uma vaga bruta do LinkedIn Jobs.

    Args:
        job: Dict com titulo, empresa, localizacao, link_vaga, job_id

    Returns:
        Dict com vaga estruturada ou None se não for vaga válida
    """
    titulo = job.get("titulo", "")

    # Verifica se é vaga de UX/Produto pelo título
    if not eh_vaga_ux_produto(titulo):
        return None

    # Limpa empresa (remove newlines, timestamps)
    empresa = _limpar_empresa(job.get("empresa"))

    # Extrai modalidade da localização (ao invés de hardcoded "nao_especificado")
    loc = job.get("localizacao", "")
    modalidade = classificar_modalidade(loc) if loc else "nao_especificado"

    return {
        "titulo": titulo,
        "empresa": empresa,
        "tipo_vaga": classificar_tipo_vaga(titulo),
        "fonte": "linkedin_jobs",
        "link_vaga": job.get("link_vaga"),
        "localizacao": loc,
        "modalidade": modalidade,
        "requisito_ingles": "nao_especificado",
        "forma_contato": "link",
        "data_coleta": date.today().isoformat(),
        "job_id_original": job.get("job_id"),
        "descricao_completa": job.get("descricao_completa"),
        "nivel": job.get("nivel", "nao_especificado"),
        "tipo_contrato": job.get("tipo_contrato", "nao_especificado"),
        "carga_horaria": job.get("carga_horaria", "nao_especificado"),
        "salario_min": job.get("salario_min"),
        "salario_max": job.get("salario_max"),
        "candidaturas_count": job.get("candidaturas_count"),
        "contato_nome": job.get("contato_nome"),
        "contato_cargo": job.get("contato_cargo"),
        "contato_linkedin": job.get("contato_linkedin"),
    }


def analisar_indeed_bruto(job: dict) -> Optional[dict]:
    """
    Analisa uma vaga bruta do Indeed.

    Args:
        job: Dict com titulo, empresa, localizacao, link_vaga, descricao_completa

    Returns:
        Dict com vaga estruturada ou None se não for vaga válida
    """
    titulo = job.get("titulo", "")

    # Verifica se é vaga de UX/Produto pelo título
    if not eh_vaga_ux_produto(titulo):
        return None

    # Limpa empresa (remove newlines, timestamps)
    empresa = _limpar_empresa(job.get("empresa"))

    # Extrai modalidade da localização
    loc = job.get("localizacao", "")
    modalidade = classificar_modalidade(loc) if loc else "nao_especificado"

    return {
        "titulo": titulo,
        "empresa": empresa,
        "tipo_vaga": classificar_tipo_vaga(titulo),
        "fonte": "indeed",
        "link_vaga": job.get("link_vaga"),
        "localizacao": loc,
        "modalidade": modalidade,
        "requisito_ingles": "nao_especificado",
        "forma_contato": "indeed",
        "data_coleta": date.today().isoformat(),
        "descricao_completa": job.get("descricao_completa"),
        "nivel": job.get("nivel", "nao_especificado"),
        "tipo_contrato": job.get("tipo_contrato", "nao_especificado"),
        "carga_horaria": job.get("carga_horaria", "nao_especificado"),
        "salario_min": job.get("salario_min"),
        "salario_max": job.get("salario_max"),
        "contratacao_urgente": job.get("contratacao_urgente", False),
        "salario_estimado_indeed": job.get("salario_estimado_indeed", False),
    }


# =============================================================================
# ANÁLISE DE ARQUIVOS
# =============================================================================

def analisar_arquivo_indeed(caminho_arquivo: str, progress_callback=None) -> dict:
    """
    Analisa arquivo bruto do Indeed e extrai vagas de UX/Produto.
    """
    with open(caminho_arquivo, "r", encoding="utf-8") as f:
        dados = json.load(f)

    jobs = dados.get("vagas", [])
    vagas = []
    total = len(jobs)

    print(f"Analisando {total} vagas do Indeed de {caminho_arquivo}...")

    for i, job in enumerate(jobs):
        vaga = analisar_indeed_bruto(job)
        if vaga:
            vagas.append(vaga)

        if progress_callback and (i + 1) % 10 == 0:
            progress_callback({
                "tipo": "analise",
                "processados": i + 1,
                "total": total,
                "vagas_encontradas": len(vagas),
                "progresso": int(((i + 1) / total) * 100)
            })

    resultado = {
        "arquivo_origem": caminho_arquivo,
        "total_jobs": total,
        "vagas_encontradas": len(vagas),
        "taxa_conversao": f"{(len(vagas) / total * 100):.1f}%" if total > 0 else "0%",
        "vagas": vagas
    }

    print(f"\nResultado Indeed: {total} vagas → {len(vagas)} vagas UX/Produto ({resultado['taxa_conversao']})")
    return resultado


def analisar_arquivo_posts(caminho_arquivo: str, progress_callback=None) -> dict:
    """
    Analisa arquivo bruto de posts e extrai vagas.

    Args:
        caminho_arquivo: Caminho para o arquivo JSON bruto
        progress_callback: Função para reportar progresso

    Returns:
        Dict com estatísticas e lista de vagas
    """
    with open(caminho_arquivo, "r", encoding="utf-8") as f:
        dados = json.load(f)

    posts = dados.get("posts", [])
    vagas = []
    total = len(posts)

    # NOVO: Reseta rastreamento de links
    resetar_links_usados()

    # NOVO: Contadores para estatísticas
    posts_agregadores = 0
    posts_sem_titulo = 0
    posts_sem_contato = 0

    print(f"Analisando {total} posts de {caminho_arquivo}...")
    print(f"(Com filtro de agregadores e validação de links)")

    for i, post in enumerate(posts):
        # Conta agregadores (para estatísticas)
        if eh_post_agregador(post.get("texto_completo", "")):
            posts_agregadores += 1

        vaga = analisar_post_bruto(post)
        if vaga:
            vagas.append(vaga)
            print(f"  ✓ [{vaga['titulo'][:40]}] via {vaga['forma_contato']}")

        if progress_callback and (i + 1) % 5 == 0:
            progress_callback({
                "tipo": "analise",
                "processados": i + 1,
                "total": total,
                "vagas_encontradas": len(vagas),
                "progresso": int(((i + 1) / total) * 100)
            })

    resultado = {
        "arquivo_origem": caminho_arquivo,
        "total_posts": total,
        "posts_agregadores_ignorados": posts_agregadores,
        "vagas_encontradas": len(vagas),
        "taxa_conversao": f"{(len(vagas) / total * 100):.1f}%" if total > 0 else "0%",
        "vagas": vagas
    }

    print(f"\n{'='*60}")
    print(f"RESULTADO:")
    print(f"  Posts analisados: {total}")
    print(f"  Posts agregadores ignorados: {posts_agregadores}")
    print(f"  Vagas UX/Produto extraídas: {len(vagas)}")
    print(f"  Taxa de conversão: {resultado['taxa_conversao']}")
    print(f"{'='*60}")

    return resultado


def analisar_arquivo_jobs(caminho_arquivo: str, progress_callback=None) -> dict:
    """
    Analisa arquivo bruto de jobs e extrai vagas de UX/Produto.
    """
    with open(caminho_arquivo, "r", encoding="utf-8") as f:
        dados = json.load(f)

    jobs = dados.get("vagas", [])
    vagas = []
    total = len(jobs)

    print(f"Analisando {total} jobs de {caminho_arquivo}...")

    for i, job in enumerate(jobs):
        vaga = analisar_job_bruto(job)
        if vaga:
            vagas.append(vaga)

        if progress_callback and (i + 1) % 10 == 0:
            progress_callback({
                "tipo": "analise",
                "processados": i + 1,
                "total": total,
                "vagas_encontradas": len(vagas),
                "progresso": int(((i + 1) / total) * 100)
            })

    resultado = {
        "arquivo_origem": caminho_arquivo,
        "total_jobs": total,
        "vagas_encontradas": len(vagas),
        "taxa_conversao": f"{(len(vagas) / total * 100):.1f}%" if total > 0 else "0%",
        "vagas": vagas
    }

    print(f"\nResultado: {total} jobs → {len(vagas)} vagas UX/Produto ({resultado['taxa_conversao']})")
    return resultado


def listar_arquivos_brutos(fonte: str = None) -> list:
    """Lista arquivos brutos disponíveis."""
    brutos_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "brutos")

    if not os.path.exists(brutos_dir):
        return []

    arquivos = []
    for f in os.listdir(brutos_dir):
        if f.endswith(".json"):
            if fonte is None or f.startswith(fonte):
                arquivos.append(os.path.join(brutos_dir, f))

    return sorted(arquivos, reverse=True)  # Mais recentes primeiro


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        arquivo = sys.argv[1]
        if "posts" in arquivo:
            resultado = analisar_arquivo_posts(arquivo)
        elif "indeed" in arquivo:
            resultado = analisar_arquivo_indeed(arquivo)
        elif "jobs" in arquivo:
            resultado = analisar_arquivo_jobs(arquivo)
        else:
            print("Arquivo não reconhecido. Use posts_*.json, jobs_*.json ou indeed_*.json")
            sys.exit(1)

        print(f"\n{resultado['vagas_encontradas']} vagas extraídas:")
        for v in resultado['vagas'][:10]:
            link_preview = v.get('link_vaga', 'N/A')[:40] if v.get('link_vaga') else 'N/A'
            print(f"  - {v['titulo']} | {v['forma_contato']} | {link_preview}...")
    else:
        # Lista arquivos disponíveis
        arquivos = listar_arquivos_brutos()
        if arquivos:
            print("Arquivos brutos disponíveis:")
            for a in arquivos[:10]:
                print(f"  {os.path.basename(a)}")
            print("\nUso: python -m app.scrapers.analisar_brutos <arquivo.json>")
        else:
            print("Nenhum arquivo bruto encontrado.")
            print("Execute primeiro: python -m app.scrapers.coleta_bruta --posts")
