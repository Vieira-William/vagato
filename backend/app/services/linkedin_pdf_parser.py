"""
Parser para LinkedIn Profile PDF.

O LinkedIn permite salvar o perfil como PDF via:
  Perfil → botão "Mais" → "Salvar em PDF"

O PDF gerado tem estrutura padronizada com seções reconhecíveis:
  Nome (primeira linha), Headline, Localização, Contact,
  Summary, Experience, Education, Skills, Languages, etc.

Este módulo extrai essas seções e retorna dados estruturados
compatíveis com o UserProfile do sistema.
"""

import re
import io
import logging
from typing import Optional

import pdfplumber

from .linkedin_parser import (
    PROFICIENCY_MAP,
    _inferir_nivel,
    _mapear_grau,
    _extrair_ano,
)

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────
# Cabeçalhos de seção reconhecidos no PDF do LinkedIn
# ──────────────────────────────────────────────────────────
SECTION_HEADERS = {
    "experience":  {"experience", "experiência", "experiencia", "work experience"},
    "education":   {"education", "educação", "educacao", "formação", "formacao"},
    "skills":      {"skills", "habilidades", "competências", "competencias", "top skills"},
    "languages":   {"languages", "idiomas", "línguas", "linguas"},
    "summary":     {"summary", "about", "resumo", "sobre"},
    "contact":     {"contact", "contato", "contact info"},
    "certifications": {"licenses & certifications", "certifications", "certificações", "certificacoes"},
    "volunteer":   {"volunteering", "voluntariado", "volunteer experience"},
    "honors":      {"honors & awards", "prêmios", "premios", "awards"},
}


def parse_linkedin_profile_pdf(pdf_bytes: bytes) -> dict:
    """
    Parseia o PDF de Perfil do LinkedIn e retorna dados estruturados.

    Args:
        pdf_bytes: Conteúdo binário do arquivo PDF

    Returns:
        dict com campos compatíveis com UserProfile + _campos_preenchidos
    """
    resultado = {
        "nome": None,
        "profissoes_interesse": [],
        "skills": [],
        "formacoes": [],
        "idiomas": [],
        "pais": None,
        "estado": None,
        "cidade": None,
    }

    try:
        linhas = _extrair_linhas_pdf(pdf_bytes)
        if not linhas:
            logger.warning("[PDF-LI] Nenhuma linha extraída do PDF")
            return resultado

        logger.info(f"[PDF-LI] {len(linhas)} linhas extraídas do PDF")

        # Detectar seções
        secoes = _detectar_secoes(linhas)
        logger.info(f"[PDF-LI] Seções encontradas: {list(secoes.keys())}")

        # --- Nome, Headline, Localização (header do perfil) ---
        nome, localizacao = _extrair_header(linhas, secoes)
        if nome:
            resultado["nome"] = nome
        if localizacao:
            cidade, estado, pais = _parsear_localizacao(localizacao)
            if cidade:
                resultado["cidade"] = cidade
            if estado:
                resultado["estado"] = estado
            if pais:
                resultado["pais"] = pais

        # --- Experience ---
        if "experience" in secoes:
            resultado["profissoes_interesse"] = _parsear_experience(
                secoes["experience"]
            )

        # --- Education ---
        if "education" in secoes:
            resultado["formacoes"] = _parsear_education(secoes["education"])

        # --- Skills ---
        if "skills" in secoes:
            resultado["skills"] = _parsear_skills(secoes["skills"])

        # --- Languages ---
        if "languages" in secoes:
            resultado["idiomas"] = _parsear_languages(secoes["languages"])

    except Exception as e:
        logger.error(f"[PDF-LI] Erro ao parsear PDF: {e}", exc_info=True)
        raise

    # Contagem de campos preenchidos
    campos = sum([
        bool(resultado["nome"]),
        bool(resultado["profissoes_interesse"]),
        bool(resultado["skills"]),
        bool(resultado["formacoes"]),
        bool(resultado["idiomas"]),
        bool(resultado["pais"] or resultado["cidade"]),
    ])
    resultado["_campos_preenchidos"] = campos
    logger.info(f"[PDF-LI] Parsing concluído: {campos} campos preenchidos")
    return resultado


# ──────────────────────────────────────────────────────────
# Extração de texto via pdfplumber
# ──────────────────────────────────────────────────────────

def _extrair_linhas_pdf(pdf_bytes: bytes) -> list[str]:
    """Extrai todas as linhas de texto do PDF, removendo vazias."""
    linhas = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for pagina in pdf.pages:
                texto = pagina.extract_text(x_tolerance=3, y_tolerance=3)
                if texto:
                    for linha in texto.splitlines():
                        stripped = linha.strip()
                        if stripped:
                            linhas.append(stripped)
    except Exception as e:
        logger.error(f"[PDF-LI] Erro ao abrir PDF com pdfplumber: {e}")
        raise ValueError(f"Não foi possível ler o PDF: {e}")
    return linhas


# ──────────────────────────────────────────────────────────
# Detecção de seções
# ──────────────────────────────────────────────────────────

def _detectar_secoes(linhas: list[str]) -> dict[str, list[str]]:
    """
    Percorre as linhas e agrupa por seção.
    Retorna dict: {nome_secao: [linhas da seção]}
    """
    secoes: dict[str, list[str]] = {}
    secao_atual = "header"
    secoes[secao_atual] = []

    for linha in linhas:
        nome_secao = _identificar_header_secao(linha)
        if nome_secao:
            secao_atual = nome_secao
            if secao_atual not in secoes:
                secoes[secao_atual] = []
        else:
            secoes[secao_atual].append(linha)

    return secoes


def _identificar_header_secao(linha: str) -> Optional[str]:
    """
    Identifica se uma linha é um cabeçalho de seção.
    Retorna o nome normalizado da seção ou None.
    """
    linha_lower = linha.strip().lower()

    # Remove pontuação de borda para comparação
    linha_clean = re.sub(r"[^a-záàâãéèêíïóôõöúüñç& ]", "", linha_lower).strip()

    for nome_secao, variantes in SECTION_HEADERS.items():
        for variante in variantes:
            if linha_clean == variante:
                return nome_secao
            # Match parcial para "Top Skills" → skills, etc.
            if variante in linha_clean and len(linha_clean) <= len(variante) + 5:
                return nome_secao

    return None


# ──────────────────────────────────────────────────────────
# Parsing do header (nome, localização)
# ──────────────────────────────────────────────────────────

def _extrair_header(
    linhas: list[str],
    secoes: dict[str, list[str]],
) -> tuple[Optional[str], Optional[str]]:
    """
    Extrai nome e localização do cabeçalho do perfil.
    O PDF do LinkedIn tem: Nome, Headline, Localização nas primeiras linhas.
    """
    header_linhas = secoes.get("header", linhas[:10])

    nome = None
    localizacao = None

    # O nome é geralmente a primeira linha não-vazia com 2+ palavras
    for i, linha in enumerate(header_linhas[:6]):
        if _parece_nome(linha):
            nome = linha.strip()
            # Localização: buscar padrão "Cidade, Estado, País" nas próximas linhas
            for j in range(i + 1, min(i + 5, len(header_linhas))):
                candidato = header_linhas[j]
                if _parece_localizacao(candidato):
                    localizacao = candidato
                    break
            break

    return nome, localizacao


def _parece_nome(linha: str) -> bool:
    """Heurística: linha com 2–5 palavras, sem dígitos, sem URL."""
    if not linha or len(linha) < 3 or len(linha) > 80:
        return False
    if re.search(r"\d", linha):
        return False
    if any(c in linha for c in ["@", "http", "linkedin.com", "·", "|"]):
        return False
    palavras = linha.split()
    return 2 <= len(palavras) <= 6


def _parece_localizacao(linha: str) -> bool:
    """Heurística: contém vírgula e não parece cargo ou empresa."""
    if "," not in linha:
        return False
    if any(c in linha.lower() for c in ["@", "http", "·", "years", "months"]):
        return False
    partes = [p.strip() for p in linha.split(",")]
    return 2 <= len(partes) <= 4


def _parsear_localizacao(loc: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Parseia 'Cidade, Estado, País' → (cidade, estado, pais)."""
    partes = [p.strip() for p in loc.split(",")]
    cidade = partes[0] if len(partes) >= 1 else None
    estado = partes[1] if len(partes) >= 3 else None
    pais = partes[-1] if len(partes) >= 2 else None
    # Se só 2 partes: Cidade, País
    if len(partes) == 2:
        estado = None
    return cidade, estado, pais


# ──────────────────────────────────────────────────────────
# Parsing de Experience
# ──────────────────────────────────────────────────────────

# Padrão de data: "Jan 2020 – Present", "2018 – 2022", "Jan 2018 – Dec 2022"
_RE_DATE_RANGE = re.compile(
    r"([A-Za-záàâãéèêíóôõúü]+\.?\s+\d{4}|\d{4})"   # data início
    r"\s*[–—-]\s*"                                    # separador
    r"(Present|Atual|[A-Za-záàâãéèêíóôõúü]+\.?\s+\d{4}|\d{4})",
    re.IGNORECASE,
)

# Padrão de empresa com tipo: "Google · Full-time"
_RE_COMPANY = re.compile(r"^(.+?)\s*[·•]\s*(Full-time|Part-time|Freelance|Contract|Contrato|CLT|PJ|Estágio|Estagio|Intern|Internship|Self-employed)?", re.IGNORECASE)


def _parsear_experience(linhas: list[str]) -> list[dict]:
    """
    Parseia seção Experience do LinkedIn PDF.
    Cada cargo tem: Título → Empresa (· Tipo) → Período → Localização
    """
    profissoes = []
    titulos_vistos: set[str] = set()

    i = 0
    while i < len(linhas):
        linha = linhas[i]

        # Linha de título: não começa com data, não parece empresa/localização
        if _parece_titulo_cargo(linha, linhas, i):
            titulo = linha.strip()

            if titulo.lower() in titulos_vistos:
                i += 1
                continue
            titulos_vistos.add(titulo.lower())

            empresa = None
            started_on = None
            finished_on = None

            # Buscar empresa e datas nas próximas 4 linhas
            for j in range(i + 1, min(i + 6, len(linhas))):
                prox = linhas[j]

                # Empresa
                if not empresa and _parece_empresa(prox):
                    m = _RE_COMPANY.match(prox)
                    empresa = m.group(1).strip() if m else prox.strip()

                # Datas
                m_data = _RE_DATE_RANGE.search(prox)
                if m_data and started_on is None:
                    started_on = m_data.group(1)
                    finished_on_raw = m_data.group(2)
                    if finished_on_raw.lower() not in ("present", "atual"):
                        finished_on = finished_on_raw

            # Calcular anos de experiência
            anos = _calc_anos_experiencia(started_on, finished_on)
            nivel = _inferir_nivel(anos)

            entrada = {"titulo": titulo, "nivel": nivel}
            if anos is not None:
                entrada["anos_exp"] = anos

            profissoes.append(entrada)

        i += 1

    return profissoes[:5]


def _parece_titulo_cargo(linha: str, linhas: list[str], idx: int) -> bool:
    """Heurística para identificar uma linha como título de cargo."""
    if not linha or len(linha) < 3 or len(linha) > 120:
        return False
    # Não é linha de data
    if _RE_DATE_RANGE.search(linha):
        return False
    # Não tem "·" (indica empresa/tipo)
    if "·" in linha or "•" in linha:
        return False
    # Não é localização (vírgula + padrão geográfico)
    if re.search(r",\s*[A-Z][a-z]", linha) and "·" not in linha:
        # pode ser localização — verificar se a próxima linha tem data
        prox = linhas[idx + 1] if idx + 1 < len(linhas) else ""
        if _RE_DATE_RANGE.search(prox):
            return False
    # Tem ao menos 2 palavras
    if len(linha.split()) < 2:
        return False
    # Não é um header de seção
    if _identificar_header_secao(linha):
        return False
    return True


def _parece_empresa(linha: str) -> bool:
    """Heurística para linha de empresa."""
    if not linha or len(linha) > 120:
        return False
    if _RE_DATE_RANGE.search(linha):
        return False
    # Empresa geralmente contém · ou é uma palavra/nome curto
    return bool("·" in linha or len(linha.split()) <= 6)


def _calc_anos_experiencia(started: Optional[str], finished: Optional[str]) -> Optional[int]:
    """Calcula anos de experiência a partir de strings de data."""
    try:
        if not started:
            return None
        ano_inicio = _extrair_ano(started)
        if not ano_inicio:
            return None
        from datetime import datetime
        if finished:
            ano_fim = _extrair_ano(finished) or datetime.now().year
        else:
            ano_fim = datetime.now().year
        return max(0, ano_fim - ano_inicio)
    except Exception:
        return None


# ──────────────────────────────────────────────────────────
# Parsing de Education
# ──────────────────────────────────────────────────────────

def _parsear_education(linhas: list[str]) -> list[dict]:
    """
    Parseia seção Education do LinkedIn PDF.
    Cada entrada: Instituição → Grau, Curso → Datas
    """
    formacoes = []
    i = 0

    while i < len(linhas):
        linha = linhas[i]

        # Instituição: linha que não é data, não tem grau inline, 2+ palavras
        if _parece_instituicao(linha):
            instituicao = linha.strip()
            grau_raw = ""
            curso = ""
            ano_inicio = None
            ano_fim = None
            status = "completo"

            # Próximas linhas: grau/curso e datas
            for j in range(i + 1, min(i + 5, len(linhas))):
                prox = linhas[j]

                # Linha de grau e curso: "Bachelor of Science - BS, Computer Science"
                if not grau_raw and _parece_grau_curso(prox):
                    partes = re.split(r"[,·\-–]", prox, maxsplit=1)
                    grau_raw = partes[0].strip()
                    curso = partes[1].strip() if len(partes) > 1 else prox.strip()

                # Linha de datas: "2012 – 2016" ou "Jan 2012 – Dec 2016"
                m_data = _RE_DATE_RANGE.search(prox)
                if m_data:
                    ano_inicio = _extrair_ano(m_data.group(1))
                    fim_raw = m_data.group(2)
                    if fim_raw.lower() in ("present", "atual"):
                        status = "cursando"
                    else:
                        ano_fim = _extrair_ano(fim_raw)
                        from datetime import datetime
                        if ano_fim and ano_fim > datetime.now().year:
                            status = "cursando"

            grau = _mapear_grau(grau_raw) if grau_raw else "graduacao"

            entrada = {
                "grau": grau,
                "curso": curso or grau_raw or instituicao,
                "instituicao": instituicao,
                "status": status,
            }
            formacoes.append(entrada)

        i += 1

    return formacoes


def _parece_instituicao(linha: str) -> bool:
    """Heurística: nome de instituição (não é data, não é grau)."""
    if not linha or len(linha) < 3 or len(linha) > 120:
        return False
    if _RE_DATE_RANGE.search(linha):
        return False
    if _identificar_header_secao(linha):
        return False
    if "·" in linha or "@" in linha:
        return False
    # Pelo menos 2 palavras
    if len(linha.split()) < 2:
        return False
    return True


def _parece_grau_curso(linha: str) -> bool:
    """Heurística: linha contém palavras-chave de grau acadêmico."""
    linha_lower = linha.lower()
    grau_keywords = [
        "bachelor", "master", "phd", "doctorate", "associate",
        "bacharelado", "mestrado", "doutorado", "técnico", "tecnico",
        "tecnólogo", "tecnologo", "especialização", "especializacao",
        "mba", "bootcamp", "licenciatura", "graduação", "graduacao",
        "degree", "science", "engineering", "arts", "business",
    ]
    return any(kw in linha_lower for kw in grau_keywords)


# ──────────────────────────────────────────────────────────
# Parsing de Skills
# ──────────────────────────────────────────────────────────

def _parsear_skills(linhas: list[str]) -> list[str]:
    """
    Parseia seção Skills do LinkedIn PDF.
    Skills aparecem como uma por linha ou separadas por " · ".
    """
    skills = []

    for linha in linhas:
        # Ignorar linhas muito longas (provavelmente descrição, não skill)
        if len(linha) > 60:
            continue
        # Ignorar linhas com datas ou que parecem header
        if _RE_DATE_RANGE.search(linha):
            continue
        if _identificar_header_secao(linha):
            continue

        # Separar por "·" se houver múltiplas skills na linha
        partes = re.split(r"\s*[·•]\s*", linha)
        for parte in partes:
            skill = parte.strip()
            # Validação básica: 2–50 chars, não é um número puro
            if 2 <= len(skill) <= 50 and not re.match(r"^\d+$", skill):
                if skill not in skills:
                    skills.append(skill)

    return skills[:20]  # Máximo 20 skills


# ──────────────────────────────────────────────────────────
# Parsing de Languages
# ──────────────────────────────────────────────────────────

# Níveis de proficiência em inglês/português que podem aparecer no PDF
_PROFICIENCY_KEYWORDS = list(PROFICIENCY_MAP.keys()) + [
    "native", "nativo", "bilingual", "fluent", "fluente",
    "advanced", "avançado", "avancado", "intermediate", "intermediário", "intermediario",
    "basic", "básico", "basico", "elementary", "beginner",
    "professional", "profissional",
]


def _parsear_languages(linhas: list[str]) -> list[dict]:
    """
    Parseia seção Languages do LinkedIn PDF.
    Padrão: Idioma (uma linha) → Proficiência (próxima linha)
    Ou: "Inglês - Fluente" numa linha só.
    """
    idiomas = []
    i = 0

    while i < len(linhas):
        linha = linhas[i]

        # Ignorar headers de seção
        if _identificar_header_secao(linha):
            i += 1
            continue

        # Padrão inline: "Inglês - Fluente" ou "English (Native)"
        proficiencia_inline = _extrair_proficiencia_inline(linha)
        if proficiencia_inline:
            nome_idioma = re.split(r"[\-–(]", linha)[0].strip()
            if _parece_idioma(nome_idioma):
                idiomas.append({
                    "idioma": nome_idioma,
                    "proficiencia": proficiencia_inline,
                })
                i += 1
                continue

        # Padrão de 2 linhas: idioma → proficiência
        if _parece_idioma(linha):
            proficiencia = "intermediario"
            if i + 1 < len(linhas):
                prox = linhas[i + 1]
                prof_map = _extrair_proficiencia_inline(prox) or _mapear_proficiencia_texto(prox)
                if prof_map:
                    proficiencia = prof_map
                    i += 1  # Pula a linha de proficiência

            idiomas.append({
                "idioma": linha.strip(),
                "proficiencia": proficiencia,
            })

        i += 1

    # Default: Português nativo se não encontrou idiomas
    if not idiomas:
        idiomas.append({"idioma": "Português", "proficiencia": "nativo"})

    return idiomas


def _parece_idioma(linha: str) -> bool:
    """Heurística: nome de idioma (1-3 palavras, sem dígitos)."""
    if not linha or len(linha) < 3 or len(linha) > 40:
        return False
    if re.search(r"\d", linha):
        return False
    if "·" in linha or "@" in linha or "," in linha:
        return False
    if _identificar_header_secao(linha):
        return False
    # Máximo 3 palavras
    if len(linha.split()) > 3:
        return False
    return True


def _extrair_proficiencia_inline(linha: str) -> Optional[str]:
    """Extrai proficiência de uma linha que contenha 'idioma - nível' ou 'idioma (nível)'."""
    # Separadores comuns
    m = re.search(r"[\-–(]\s*(.+?)[\s)]*$", linha)
    if not m:
        return None
    candidato = m.group(1).strip()
    return _mapear_proficiencia_texto(candidato)


def _mapear_proficiencia_texto(texto: str) -> Optional[str]:
    """Mapeia texto de proficiência para enum do sistema."""
    texto_clean = texto.strip().lower()

    # Tenta PROFICIENCY_MAP primeiro
    for key, value in PROFICIENCY_MAP.items():
        if key.lower() == texto_clean:
            return value

    # Fallbacks por palavras-chave
    if any(w in texto_clean for w in ["native", "nativo", "bilingual", "bilíngue"]):
        return "nativo"
    if any(w in texto_clean for w in ["fluent", "fluente", "full professional"]):
        return "fluente"
    if any(w in texto_clean for w in ["advanced", "avançado", "avancado", "professional working"]):
        return "avancado"
    if any(w in texto_clean for w in ["intermediate", "intermediário", "intermediario", "limited working"]):
        return "intermediario"
    if any(w in texto_clean for w in ["basic", "básico", "basico", "elementary", "beginner"]):
        return "basico"

    return None
