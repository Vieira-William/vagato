from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import date, datetime
from typing import Optional, List, Any
from enum import Enum


class FonteEnum(str, Enum):
    indeed = "indeed"
    linkedin_jobs = "linkedin_jobs"
    linkedin_posts = "linkedin_posts"


class ModalidadeEnum(str, Enum):
    remoto = "remoto"
    hibrido = "hibrido"
    presencial = "presencial"
    nao_especificado = "nao_especificado"


class InglesEnum(str, Enum):
    nenhum = "nenhum"
    basico = "basico"
    intermediario = "intermediario"
    fluente = "fluente"
    nao_especificado = "nao_especificado"


class FormaContatoEnum(str, Enum):
    email = "email"
    link = "link"
    mensagem = "mensagem"
    indeed = "indeed"


class StatusEnum(str, Enum):
    pendente = "pendente"
    aplicada = "aplicada"
    descartada = "descartada"


# NOVOS ENUMS para extracao estruturada
class NivelEnum(str, Enum):
    junior = "junior"
    pleno = "pleno"
    senior = "senior"
    lead = "lead"
    head = "head"
    especialista = "especialista"
    nao_especificado = "nao_especificado"


class TipoContratoEnum(str, Enum):
    clt = "clt"
    pj = "pj"
    freelancer = "freelancer"
    estagio = "estagio"
    temporario = "temporario"
    nao_especificado = "nao_especificado"


class CargaHorariaEnum(str, Enum):
    integral = "integral"
    meio_periodo = "meio_periodo"
    flexivel = "flexivel"
    por_projeto = "por_projeto"
    nao_especificado = "nao_especificado"


class MaturidadeTimeEnum(str, Enum):
    nova = "nova"
    estavel = "estavel"
    legado = "legado"
    nao_especificado = "nao_especificado"


class MomentoEmpresaEnum(str, Enum):
    startup = "startup"
    scaleup = "scaleup"
    enterprise = "enterprise"
    nao_especificado = "nao_especificado"


def _safe_enum(enum_class, value):
    """Converte valor para enum com segurança. Retorna None se inválido."""
    if value is None:
        return None
    try:
        return enum_class(value)
    except (ValueError, KeyError):
        return None


def _safe_list(value) -> list:
    """Converte string JSON ou None para lista. SQLite armazena JSON como texto."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        import json
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, ValueError):
            return []
    return []


class VagaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    titulo: str = Field(..., max_length=200)
    empresa: Optional[str] = Field(None, max_length=100)
    tipo_vaga: Optional[str] = Field(None, max_length=50)
    fonte: Optional[FonteEnum] = None
    link_vaga: Optional[str] = None
    localizacao: Optional[str] = Field(None, max_length=100)
    modalidade: Optional[ModalidadeEnum] = ModalidadeEnum.nao_especificado
    requisito_ingles: Optional[InglesEnum] = InglesEnum.nao_especificado

    @field_validator('fonte', mode='before')
    @classmethod
    def validate_fonte(cls, v): return _safe_enum(FonteEnum, v)

    @field_validator('modalidade', mode='before')
    @classmethod
    def validate_modalidade(cls, v): return _safe_enum(ModalidadeEnum, v) or ModalidadeEnum.nao_especificado

    @field_validator('requisito_ingles', mode='before')
    @classmethod
    def validate_ingles(cls, v): return _safe_enum(InglesEnum, v) or InglesEnum.nao_especificado

    @field_validator('forma_contato', mode='before')
    @classmethod
    def validate_forma_contato(cls, v): return _safe_enum(FormaContatoEnum, v)

    @field_validator('nivel', mode='before')
    @classmethod
    def validate_nivel(cls, v): return _safe_enum(NivelEnum, v) or NivelEnum.nao_especificado

    @field_validator('tipo_contrato', mode='before')
    @classmethod
    def validate_tipo_contrato(cls, v): return _safe_enum(TipoContratoEnum, v) or TipoContratoEnum.nao_especificado

    @field_validator('carga_horaria', mode='before')
    @classmethod
    def validate_carga_horaria(cls, v): return _safe_enum(CargaHorariaEnum, v) or CargaHorariaEnum.nao_especificado

    @field_validator('time_maturidade', mode='before')
    @classmethod
    def validate_maturidade(cls, v): return _safe_enum(MaturidadeTimeEnum, v) or MaturidadeTimeEnum.nao_especificado

    @field_validator('momento_empresa', mode='before')
    @classmethod
    def validate_momento(cls, v): return _safe_enum(MomentoEmpresaEnum, v) or MomentoEmpresaEnum.nao_especificado

    @field_validator(
        'skills_obrigatorias', 'skills_desejaveis', 'beneficios',
        'responsabilidades', 'requisitos_obrigatorios', 'requisitos_desejaveis',
        'processo_seletivo',
        mode='before'
    )
    @classmethod
    def validate_listas(cls, v): return _safe_list(v)
    forma_contato: Optional[FormaContatoEnum] = None
    email_contato: Optional[str] = Field(None, max_length=100)
    perfil_autor: Optional[str] = Field(None, max_length=200)
    nome_autor: Optional[str] = Field(None, max_length=100)
    data_coleta: date
    observacoes: Optional[str] = None

    # NOVOS CAMPOS - Extracao estruturada com IA
    nivel: Optional[NivelEnum] = NivelEnum.nao_especificado
    salario_min: Optional[float] = None
    salario_max: Optional[float] = None
    moeda_salario: Optional[str] = "BRL"
    tipo_contrato: Optional[TipoContratoEnum] = TipoContratoEnum.nao_especificado
    carga_horaria: Optional[CargaHorariaEnum] = CargaHorariaEnum.nao_especificado
    area_departamento: Optional[str] = Field(None, max_length=50)
    skills_obrigatorias: Optional[List[str]] = []
    skills_desejaveis: Optional[List[str]] = []
    beneficios: Optional[List[str]] = []
    experiencia_anos: Optional[int] = None
    descricao_completa: Optional[str] = None
    data_publicacao: Optional[date] = None
    data_expiracao: Optional[date] = None

    # NOVOS CAMPOS - Contato direto
    contato_nome: Optional[str] = Field(None, max_length=100)
    contato_cargo: Optional[str] = Field(None, max_length=100)
    contato_linkedin: Optional[str] = Field(None, max_length=200)
    contato_email: Optional[str] = Field(None, max_length=100)
    contato_telefone: Optional[str] = Field(None, max_length=30)
    whatsapp_contato: Optional[str] = Field(None, max_length=30)  # WhatsApp para contato

    # NOVO CAMPO - Rastreamento de origem
    link_post_original: Optional[str] = None  # URL do post original para verificação

    # NOVOS CAMPOS - Hidden Gems (Fase B/PRD)
    candidaturas_count: Optional[str] = Field(None, max_length=50)
    salario_estimado_indeed: Optional[bool] = False
    contratacao_urgente: Optional[bool] = False

    # NOVOS CAMPOS - Detalhes estruturados da vaga (PRD v2)
    responsabilidades: Optional[List[str]] = []
    requisitos_obrigatorios: Optional[List[str]] = []
    requisitos_desejaveis: Optional[List[str]] = []
    fuso_horario: Optional[str] = Field(None, max_length=50)
    time_tamanho: Optional[str] = Field(None, max_length=50)
    time_reporta: Optional[str] = Field(None, max_length=100)
    time_maturidade: Optional[MaturidadeTimeEnum] = MaturidadeTimeEnum.nao_especificado
    momento_empresa: Optional[MomentoEmpresaEnum] = MomentoEmpresaEnum.nao_especificado
    processo_seletivo: Optional[List[str]] = []

    # NOVOS CAMPOS - 10 Pilares PRD v3
    missao_vaga: Optional[str] = None  # Pilar 6: Por que a vaga existe
    como_aplicar: Optional[str] = None  # Pilar 10: CTA explícito


class VagaCreate(VagaBase):
    pass


class VagaUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=200)
    empresa: Optional[str] = Field(None, max_length=100)
    tipo_vaga: Optional[str] = Field(None, max_length=50)
    link_vaga: Optional[str] = None
    localizacao: Optional[str] = Field(None, max_length=100)
    modalidade: Optional[ModalidadeEnum] = None
    requisito_ingles: Optional[InglesEnum] = None
    forma_contato: Optional[FormaContatoEnum] = None
    email_contato: Optional[str] = Field(None, max_length=100)
    status: Optional[StatusEnum] = None
    observacoes: Optional[str] = None

    # NOVOS CAMPOS atualizaveis
    nivel: Optional[NivelEnum] = None
    salario_min: Optional[float] = None
    salario_max: Optional[float] = None
    tipo_contrato: Optional[TipoContratoEnum] = None
    carga_horaria: Optional[CargaHorariaEnum] = None
    skills_obrigatorias: Optional[List[str]] = None
    skills_desejaveis: Optional[List[str]] = None
    beneficios: Optional[List[str]] = None
    score_compatibilidade: Optional[float] = None
    is_destaque: Optional[bool] = None
    is_favorito: Optional[bool] = None

    # NOVOS CAMPOS - Hidden Gems
    candidaturas_count: Optional[str] = None
    salario_estimado_indeed: Optional[bool] = None
    contratacao_urgente: Optional[bool] = None

    # NOVOS CAMPOS - Detalhes estruturados (PRD v2)
    responsabilidades: Optional[List[str]] = None
    requisitos_obrigatorios: Optional[List[str]] = None
    requisitos_desejaveis: Optional[List[str]] = None
    fuso_horario: Optional[str] = None
    time_tamanho: Optional[str] = None
    time_reporta: Optional[str] = None
    time_maturidade: Optional[MaturidadeTimeEnum] = None
    momento_empresa: Optional[MomentoEmpresaEnum] = None
    processo_seletivo: Optional[List[str]] = None

    # NOVOS CAMPOS - 10 Pilares PRD v3
    missao_vaga: Optional[str] = None
    como_aplicar: Optional[str] = None


class VagaResponse(VagaBase):
    id: int
    status: StatusEnum = StatusEnum.pendente
    created_at: datetime
    updated_at: datetime

    # NOVOS CAMPOS - Matching/Scoring
    score_compatibilidade: Optional[float] = None
    score_breakdown: Optional[dict] = None
    is_destaque: bool = False
    is_favorito: bool = False

    # NOVOS CAMPOS - Contato adicional
    whatsapp_contato: Optional[str] = None
    link_post_original: Optional[str] = None

    class Config:
        from_attributes = True


# Schema para UserProfile
class UserProfileBase(BaseModel):
    nome: str = Field(..., max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    cargos_interesse: Optional[List[str]] = []
    nivel_minimo: Optional[str] = "senior"
    experiencia_anos: Optional[int] = None
    skills: Optional[List[str]] = []
    modalidades_aceitas: Optional[List[str]] = ["remoto", "hibrido"]
    tipos_contrato: Optional[List[str]] = ["clt", "pj"]
    localizacoes: Optional[List[str]] = []
    nivel_ingles: Optional[str] = "intermediario"
    salario_minimo: Optional[float] = None
    salario_maximo: Optional[float] = None
    arquivos_curriculo: Optional[List[dict]] = []
    telefone: Optional[str] = Field(None, max_length=20)
    linkedin_url: Optional[str] = Field(None, max_length=255)
    portfolio_url: Optional[str] = Field(None, max_length=255)
    github_url: Optional[str] = Field(None, max_length=255)
    profissao: Optional[str] = Field(None, max_length=100)


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VagaListResponse(BaseModel):
    total: int
    vagas: list[VagaResponse]


class StatsResponse(BaseModel):
    total_vagas: int
    por_fonte: dict[str, int]
    por_status: dict[str, int]
    por_modalidade: dict[str, int]
    por_tipo_vaga: dict[str, int]
    ultimas_24h: int
    ultima_coleta: Optional[str] = None


# Histórico temporal
class DiaHistorico(BaseModel):
    data: str
    total: int
    indeed: int
    linkedin_jobs: int
    linkedin_posts: int


class CrescimentoStats(BaseModel):
    vs_periodo_anterior: float
    media_diaria: float


class HistoricoResponse(BaseModel):
    periodo: str
    data_inicio: str
    data_fim: str
    total_periodo: int
    por_dia: list[DiaHistorico]
    crescimento: CrescimentoStats
    por_modalidade: dict[str, int]
    por_ingles: dict[str, int]
    top_empresas: list[dict]


# ============================================
# Schemas para Search URLs (PRD v3)
# ============================================

class SearchUrlBase(BaseModel):
    nome: str = Field(..., max_length=100)
    url: str
    fonte: FonteEnum
    ativo: bool = True
    ordem: int = 0


class SearchUrlCreate(SearchUrlBase):
    pass


class SearchUrlUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    url: Optional[str] = None
    fonte: Optional[FonteEnum] = None
    ativo: Optional[bool] = None
    ordem: Optional[int] = None


class SearchUrlResponse(SearchUrlBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Schemas para Match Weights (PRD v3)
# ============================================

class MatchWeightsBase(BaseModel):
    skills: float = Field(0.35, ge=0, le=1)
    nivel: float = Field(0.20, ge=0, le=1)
    modalidade: float = Field(0.15, ge=0, le=1)
    tipo_contrato: float = Field(0.10, ge=0, le=1)
    salario: float = Field(0.10, ge=0, le=1)
    ingles: float = Field(0.05, ge=0, le=1)
    localizacao: float = Field(0.05, ge=0, le=1)


class MatchWeightsUpdate(BaseModel):
    skills: Optional[float] = Field(None, ge=0, le=1)
    nivel: Optional[float] = Field(None, ge=0, le=1)
    modalidade: Optional[float] = Field(None, ge=0, le=1)
    tipo_contrato: Optional[float] = Field(None, ge=0, le=1)
    salario: Optional[float] = Field(None, ge=0, le=1)
    ingles: Optional[float] = Field(None, ge=0, le=1)
    localizacao: Optional[float] = Field(None, ge=0, le=1)


class MatchWeightsResponse(MatchWeightsBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Schema para User Profile Update (PRD v3)
# ============================================

class UserProfileUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    cargos_interesse: Optional[List[str]] = None
    nivel_minimo: Optional[str] = None
    experiencia_anos: Optional[int] = None
    skills: Optional[List[str]] = None
    modalidades_aceitas: Optional[List[str]] = None
    tipos_contrato: Optional[List[str]] = None
    localizacoes: Optional[List[str]] = None
    nivel_ingles: Optional[str] = None
    salario_minimo: Optional[float] = None
    salario_maximo: Optional[float] = None
    arquivos_curriculo: Optional[List[dict]] = None
    telefone: Optional[str] = Field(None, max_length=20)
    linkedin_url: Optional[str] = Field(None, max_length=255)
    portfolio_url: Optional[str] = Field(None, max_length=255)
    github_url: Optional[str] = Field(None, max_length=255)
    profissao: Optional[str] = Field(None, max_length=100)
