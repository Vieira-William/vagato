"""
Parser para LinkedIn Data Export (.zip)

O LinkedIn permite o usuario baixar seus dados em:
LinkedIn > Settings > Privacy > Get a copy of your data

O .zip contém CSVs com: Profile, Positions, Skills, Education, Languages, etc.
Este modulo parseia os CSVs relevantes e retorna dados estruturados
compativeis com o UserProfile do sistema.
"""

import csv
import io
import zipfile
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# ============================================
# Mapeamento de proficiencia LinkedIn → sistema
# ============================================
PROFICIENCY_MAP = {
    "ELEMENTARY": "basico",
    "LIMITED_WORKING": "intermediario",
    "PROFESSIONAL_WORKING": "avancado",
    "FULL_PROFESSIONAL": "fluente",
    "NATIVE_OR_BILINGUAL": "nativo",
    # Variantes lowercase
    "elementary": "basico",
    "limited_working": "intermediario",
    "professional_working": "avancado",
    "full_professional": "fluente",
    "native_or_bilingual": "nativo",
    # Variantes legíveis
    "Elementary proficiency": "basico",
    "Limited working proficiency": "intermediario",
    "Professional working proficiency": "avancado",
    "Full professional proficiency": "fluente",
    "Native or bilingual proficiency": "nativo",
}

# Mapeamento de grau academico
DEGREE_MAP = {
    "bachelor": "graduacao",
    "bachelor's": "graduacao",
    "bacharelado": "graduacao",
    "licenciatura": "graduacao",
    "master": "mestrado",
    "master's": "mestrado",
    "mestrado": "mestrado",
    "mba": "mba",
    "doctorate": "doutorado",
    "phd": "doutorado",
    "doutorado": "doutorado",
    "associate": "tecnologo",
    "technical": "tecnico",
    "tecnico": "tecnico",
    "tecnologo": "tecnologo",
    "postgraduate": "pos_graduacao",
    "pos-graduacao": "pos_graduacao",
    "especializacao": "pos_graduacao",
    "bootcamp": "bootcamp",
}


def parse_linkedin_zip(zip_bytes: bytes) -> dict:
    """
    Parseia um .zip do LinkedIn Data Export e retorna dados estruturados.

    Args:
        zip_bytes: Conteudo binario do arquivo .zip

    Returns:
        dict com campos compativeis com UserProfile
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
        "linkedin_url": None,
    }

    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            nomes = zf.namelist()
            logger.info(f"LinkedIn .zip contém {len(nomes)} arquivos: {nomes[:20]}")

            for nome_arquivo in nomes:
                nome_lower = nome_arquivo.lower().split("/")[-1]

                try:
                    conteudo = zf.read(nome_arquivo).decode("utf-8", errors="replace")
                except Exception:
                    continue

                if nome_lower == "profile.csv":
                    dados_perfil = _parse_profile_csv(conteudo)
                    resultado.update({k: v for k, v in dados_perfil.items() if v})

                elif nome_lower == "skills.csv":
                    resultado["skills"] = _parse_skills_csv(conteudo)

                elif nome_lower == "positions.csv":
                    resultado["profissoes_interesse"] = _parse_positions_csv(conteudo)

                elif nome_lower == "education.csv":
                    resultado["formacoes"] = _parse_education_csv(conteudo)

                elif nome_lower == "languages.csv":
                    resultado["idiomas"] = _parse_languages_csv(conteudo)

    except zipfile.BadZipFile:
        logger.error("Arquivo nao e um .zip valido")
        raise ValueError("Arquivo nao e um .zip valido")
    except Exception as e:
        logger.error(f"Erro ao parsear LinkedIn .zip: {e}")
        raise

    # Contar campos preenchidos
    campos = 0
    if resultado["nome"]:
        campos += 1
    if resultado["profissoes_interesse"]:
        campos += 1
    if resultado["skills"]:
        campos += 1
    if resultado["formacoes"]:
        campos += 1
    if resultado["idiomas"]:
        campos += 1
    if resultado["pais"] or resultado["cidade"]:
        campos += 1

    resultado["_campos_preenchidos"] = campos
    return resultado


def _read_csv(text: str) -> list[dict]:
    """Le CSV string e retorna lista de dicts."""
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def _parse_profile_csv(text: str) -> dict:
    """
    Profile.csv contem: First Name, Last Name, Headline, Summary,
    Geo Location, Industry, Zip Code, etc.
    """
    resultado = {}
    try:
        rows = _read_csv(text)
        if not rows:
            return resultado

        row = rows[0]  # Profile.csv tem apenas 1 linha de dados

        first = row.get("First Name", "").strip()
        last = row.get("Last Name", "").strip()
        if first or last:
            resultado["nome"] = f"{first} {last}".strip()

        geo = row.get("Geo Location", "").strip()
        if geo:
            partes = [p.strip() for p in geo.split(",")]
            if len(partes) >= 2:
                resultado["cidade"] = partes[0]
                # Ultimo item geralmente e o pais
                resultado["pais"] = partes[-1]
                if len(partes) >= 3:
                    resultado["estado"] = partes[1]
            elif len(partes) == 1:
                resultado["cidade"] = partes[0]

    except Exception as e:
        logger.warning(f"Erro ao parsear Profile.csv: {e}")

    return resultado


def _parse_skills_csv(text: str) -> list[str]:
    """Skills.csv contem: Skill Name (uma por linha)."""
    skills = []
    try:
        rows = _read_csv(text)
        for row in rows:
            skill = (row.get("Skill Name") or row.get("skill name") or "").strip()
            if skill and skill not in skills:
                skills.append(skill)
    except Exception as e:
        logger.warning(f"Erro ao parsear Skills.csv: {e}")

    return skills[:20]  # Max 20 (limite do wizard)


def _parse_positions_csv(text: str) -> list[dict]:
    """
    Positions.csv contem: Company Name, Title, Description,
    Location, Started On, Finished On
    """
    profissoes = []
    titulos_vistos = set()

    try:
        rows = _read_csv(text)
        for row in rows:
            titulo = (row.get("Title") or row.get("title") or "").strip()
            if not titulo or titulo.lower() in titulos_vistos:
                continue
            titulos_vistos.add(titulo.lower())

            # Inferir nivel por anos de experiencia
            anos = _calcular_anos(
                row.get("Started On", ""),
                row.get("Finished On", "")
            )
            nivel = _inferir_nivel(anos)

            profissoes.append({
                "titulo": titulo,
                "nivel": nivel,
                "anos_exp": anos,
            })

    except Exception as e:
        logger.warning(f"Erro ao parsear Positions.csv: {e}")

    return profissoes[:5]  # Max 5 profissoes


def _parse_education_csv(text: str) -> list[dict]:
    """
    Education.csv contem: School Name, Start Date, End Date,
    Notes, Degree Name, Activities
    """
    formacoes = []
    try:
        rows = _read_csv(text)
        for row in rows:
            escola = (row.get("School Name") or row.get("school name") or "").strip()
            grau_raw = (row.get("Degree Name") or row.get("degree name") or "").strip()
            notes = (row.get("Notes") or row.get("notes") or "").strip()

            if not escola and not grau_raw:
                continue

            # Mapear grau
            grau = _mapear_grau(grau_raw)

            # Inferir status
            end_date = (row.get("End Date") or row.get("end date") or "").strip()
            status = "completo"
            if not end_date:
                status = "cursando"
            else:
                try:
                    end = datetime.strptime(end_date, "%Y")
                    if end.year > datetime.now().year:
                        status = "cursando"
                except (ValueError, TypeError):
                    pass

            formacoes.append({
                "grau": grau,
                "curso": notes or grau_raw,
                "instituicao": escola,
                "status": status,
            })

    except Exception as e:
        logger.warning(f"Erro ao parsear Education.csv: {e}")

    return formacoes


def _parse_languages_csv(text: str) -> list[dict]:
    """Languages.csv contem: Language, Proficiency."""
    idiomas = []
    try:
        rows = _read_csv(text)
        for row in rows:
            idioma = (row.get("Language") or row.get("language") or "").strip()
            prof_raw = (row.get("Proficiency") or row.get("proficiency") or "").strip()

            if not idioma:
                continue

            proficiencia = PROFICIENCY_MAP.get(prof_raw, "intermediario")

            idiomas.append({
                "idioma": idioma,
                "proficiencia": proficiencia,
            })

    except Exception as e:
        logger.warning(f"Erro ao parsear Languages.csv: {e}")

    # Se nao tem idiomas, adicionar Portugues como default
    if not idiomas:
        idiomas.append({"idioma": "Portugues", "proficiencia": "nativo"})

    return idiomas


# ============================================
# Helpers
# ============================================

def _calcular_anos(started_on: str, finished_on: str) -> Optional[int]:
    """Calcula anos de experiencia entre duas datas (formato: 'MMM YYYY' ou 'YYYY')."""
    try:
        if not started_on:
            return None

        start_str = started_on.strip()
        end_str = finished_on.strip() if finished_on else ""

        # Tentar parsear formatos comuns
        start_year = _extrair_ano(start_str)
        end_year = _extrair_ano(end_str) if end_str else datetime.now().year

        if start_year and end_year:
            return max(0, end_year - start_year)
    except Exception:
        pass
    return None


def _extrair_ano(date_str: str) -> Optional[int]:
    """Extrai ano de uma string de data."""
    for fmt in ["%b %Y", "%B %Y", "%Y", "%m/%Y"]:
        try:
            return datetime.strptime(date_str.strip(), fmt).year
        except (ValueError, TypeError):
            continue

    # Tentar extrair 4 digitos
    import re
    match = re.search(r"\d{4}", date_str)
    if match:
        return int(match.group())
    return None


def _inferir_nivel(anos: Optional[int]) -> str:
    """Infere nivel profissional por anos de experiencia."""
    if anos is None:
        return "pleno"
    if anos <= 2:
        return "junior"
    if anos <= 5:
        return "pleno"
    if anos <= 10:
        return "senior"
    return "lead"


def _mapear_grau(grau_raw: str) -> str:
    """Mapeia nome do grau academico para o enum do sistema."""
    grau_lower = grau_raw.lower().strip()

    for key, value in DEGREE_MAP.items():
        if key in grau_lower:
            return value

    # Default: graduacao
    return "graduacao"
