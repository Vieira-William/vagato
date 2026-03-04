from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Index, Float, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Vaga(Base):
    __tablename__ = "vagas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    titulo = Column(String(200), nullable=False)
    empresa = Column(String(100))
    tipo_vaga = Column(String(50))  # Product Designer, Product Manager, UX Designer, etc
    fonte = Column(String(20))  # 'indeed', 'linkedin_jobs', 'linkedin_posts'
    link_vaga = Column(Text)
    localizacao = Column(String(100))
    modalidade = Column(String(20))  # 'remoto', 'hibrido', 'presencial', 'nao_especificado'
    requisito_ingles = Column(String(50))  # 'nenhum', 'basico', 'intermediario', 'fluente', 'nao_especificado'
    forma_contato = Column(String(20))  # 'email', 'link', 'mensagem', 'indeed'
    email_contato = Column(String(100))
    perfil_autor = Column(String(200))  # Para LinkedIn posts
    nome_autor = Column(String(100))  # Para LinkedIn posts
    data_coleta = Column(Date, nullable=False)
    status = Column(String(20), default="pendente")  # 'pendente', 'aplicada', 'descartada'
    observacoes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # NOVOS CAMPOS - Extração estruturada com IA
    nivel = Column(String(20))  # junior, pleno, senior, lead, head, especialista
    salario_min = Column(Float, nullable=True)
    salario_max = Column(Float, nullable=True)
    moeda_salario = Column(String(10), default="BRL")
    tipo_contrato = Column(String(20))  # clt, pj, freelancer, estagio, temporario
    carga_horaria = Column(String(30))  # integral, meio_periodo, flexivel, por_projeto
    area_departamento = Column(String(50))  # Produto, Design, Tech, Marketing, Dados
    skills_obrigatorias = Column(JSON)  # ["Figma", "UX Research", ...]
    skills_desejaveis = Column(JSON)  # ["Protopie", "Motion Design", ...]
    beneficios = Column(JSON)  # ["VR", "VA", "Plano de Saude", ...]
    experiencia_anos = Column(Integer, nullable=True)
    descricao_completa = Column(Text)  # Descricao full extraida
    data_publicacao = Column(Date, nullable=True)
    data_expiracao = Column(Date, nullable=True)

    # NOVOS CAMPOS - Matching/Scoring
    score_compatibilidade = Column(Float, nullable=True)  # 0.0 a 1.0
    score_breakdown = Column(JSON)  # {"skills": 0.8, "nivel": 0.9, ...}
    is_destaque = Column(Boolean, default=False)  # Vaga altamente compativel
    is_favorito = Column(Boolean, default=False)  # Vaga favoritada pelo usuario

    # NOVOS CAMPOS - Contato direto
    contato_nome = Column(String(100))  # Nome do recrutador
    contato_cargo = Column(String(100))  # "Tech Recruiter"
    contato_linkedin = Column(String(200))  # URL do perfil
    contato_email = Column(String(100))
    contato_telefone = Column(String(30))
    whatsapp_contato = Column(String(30))  # WhatsApp para contato direto

    # NOVO CAMPO - Rastreamento de origem
    link_post_original = Column(Text)  # URL do post original no LinkedIn (para verificação)

    # NOVOS CAMPOS - Hidden Gems (Fase B/PRD)
    candidaturas_count = Column(String(50))  # "Mais de 100 candidaturas"
    salario_estimado_indeed = Column(Boolean, default=False)
    contratacao_urgente = Column(Boolean, default=False)

    # NOVOS CAMPOS - Detalhes estruturados da vaga (PRD v2)
    responsabilidades = Column(JSON)  # ["Liderar discovery", "Conduzir pesquisas", ...]
    requisitos_obrigatorios = Column(JSON)  # ["Figma", "5 anos exp", ...]
    requisitos_desejaveis = Column(JSON)  # ["Protopie", "MBA", ...]
    fuso_horario = Column(String(50))  # "GMT-3", "PST", etc
    time_tamanho = Column(String(50))  # "5 designers", "Equipe de 10"
    time_reporta = Column(String(100))  # "Head de Design", "CPO"
    time_maturidade = Column(String(20))  # nova, estavel, legado
    momento_empresa = Column(String(20))  # startup, scaleup, enterprise
    processo_seletivo = Column(JSON)  # ["Triagem", "Entrevista RH", "Case", ...]

    # NOVOS CAMPOS - 10 Pilares PRD v3
    missao_vaga = Column(Text)  # Pilar 6: Por que a vaga existe (1 frase de impacto)
    como_aplicar = Column(Text)  # Pilar 10: CTA explícito (link, email, dm, gupy, lever)

    # NOVO CAMPO - Rastreabilidade para auditoria
    registro_bruto_uuid = Column(String(36), index=True)  # UUID do registro bruto original

    # Relacionamento com auditoria
    auditoria = relationship("ProcessamentoAuditoria", back_populates="vaga", uselist=False)

    __table_args__ = (
        Index("idx_fonte", "fonte"),
        Index("idx_status", "status"),
        Index("idx_data_coleta", "data_coleta"),
        Index("idx_modalidade", "modalidade"),
        Index("idx_score", "score_compatibilidade"),
        Index("idx_destaque", "is_destaque"),
        Index("idx_favorito", "is_favorito"),
        Index("idx_nivel", "nivel"),
    )

    def __repr__(self):
        return f"<Vaga(id={self.id}, titulo='{self.titulo}', empresa='{self.empresa}', score={self.score_compatibilidade})>"


class UserProfile(Base):
    """Perfil do usuario para matching de vagas."""
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True)

    # Preferencias de cargo
    cargos_interesse = Column(JSON)  # ["Product Designer", "UX Designer", ...]
    nivel_minimo = Column(String(20))  # junior, pleno, senior, lead, head
    experiencia_anos = Column(Integer)

    # Skills (para matching)
    skills = Column(JSON)  # ["Figma", "UX Research", "Product Management", ...]

    # Gestão de Resumes (v3.5)
    arquivos_curriculo = Column(JSON, default=list)  # [{"id": uuid, "nome": "cv.pdf", "data": "...", "tamanho": 123}]

    # Preferencias de trabalho
    modalidades_aceitas = Column(JSON)  # ["remoto", "hibrido"]
    tipos_contrato = Column(JSON)  # ["clt", "pj"]
    localizacoes = Column(JSON)  # ["Brasil", "Rio de Janeiro"]

    # Idiomas
    nivel_ingles = Column(String(20))  # nenhum, basico, intermediario, fluente

    # Quick Access (Meu Arsenal)
    telefone = Column(String(20), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    portfolio_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    profissao = Column(String(100), nullable=True)

    # Salario
    salario_minimo = Column(Float, nullable=True)
    salario_maximo = Column(Float, nullable=True)

    # Metadados
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<UserProfile(id={self.id}, nome='{self.nome}')>"


class SearchUrl(Base):
    """URLs de busca configuráveis pelo usuário."""
    __tablename__ = "search_urls"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)  # "LinkedIn Product Designer Remoto"
    url = Column(Text, nullable=False)
    fonte = Column(String(20), nullable=False)  # linkedin_jobs, indeed, linkedin_posts
    ativo = Column(Boolean, default=True)
    ordem = Column(Integer, default=0)  # Para ordenação de prioridade
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_search_fonte", "fonte"),
        Index("idx_search_ativo", "ativo"),
    )

    def __repr__(self):
        return f"<SearchUrl(id={self.id}, nome='{self.nome}', fonte='{self.fonte}')>"


class MatchWeights(Base):
    """Pesos configuráveis para o cálculo de match score."""
    __tablename__ = "match_weights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    skills = Column(Float, default=0.35)
    nivel = Column(Float, default=0.20)
    modalidade = Column(Float, default=0.15)
    tipo_contrato = Column(Float, default=0.10)
    salario = Column(Float, default=0.10)
    ingles = Column(Float, default=0.05)
    localizacao = Column(Float, default=0.05)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<MatchWeights(id={self.id}, skills={self.skills}, nivel={self.nivel})>"


# =============================================================================
# TABELAS DE AUDITORIA - Sistema de Rastreabilidade Completa
# =============================================================================

class RegistroBruto(Base):
    """
    Registro bruto original para auditoria.

    Armazena todos os dados coletados de todas as fontes (LinkedIn Posts/Jobs, Indeed)
    antes de qualquer processamento. Serve como "gabarito" para auditoria.
    """
    __tablename__ = "registros_brutos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(String(36), unique=True, nullable=False, index=True)
    fonte = Column(String(20), nullable=False)  # linkedin_posts, linkedin_jobs, indeed
    arquivo_origem = Column(String(200), nullable=False)  # posts_2026-02-20_103000.json
    raw_id = Column(String(100))  # ID dentro do arquivo original

    # Dados brutos (JSON completo do registro original)
    dados_brutos = Column(Text, nullable=False)  # JSON serializado

    # Integridade
    checksum_sha256 = Column(String(64), nullable=False)  # Hash para detectar alterações

    # Timestamps
    timestamp_coleta = Column(DateTime, nullable=False)  # Quando foi coletado
    created_at = Column(DateTime, server_default=func.now())  # Quando foi inserido no banco

    # Relacionamento
    processamento = relationship("ProcessamentoAuditoria", back_populates="registro_bruto", uselist=False)
    validacoes = relationship("ValidacaoAuditoria", back_populates="registro_bruto")

    __table_args__ = (
        Index("idx_bruto_fonte", "fonte"),
        Index("idx_bruto_arquivo", "arquivo_origem"),
        Index("idx_bruto_checksum", "checksum_sha256"),
        Index("idx_bruto_timestamp", "timestamp_coleta"),
    )

    def __repr__(self):
        return f"<RegistroBruto(uuid='{self.uuid[:8]}...', fonte='{self.fonte}')>"


class ProcessamentoAuditoria(Base):
    """
    Auditoria de processamento de cada registro bruto.

    Registra o resultado do processamento (sucesso ou descarte) e o log
    de todas as transformações aplicadas para rastreabilidade completa.
    """
    __tablename__ = "processamento_auditoria"

    id = Column(Integer, primary_key=True, autoincrement=True)
    registro_bruto_id = Column(Integer, ForeignKey("registros_brutos.id"), nullable=False)
    vaga_id = Column(Integer, ForeignKey("vagas.id"), nullable=True)  # NULL se descartado

    # Status do processamento
    status = Column(String(20), nullable=False)  # processado, descartado, erro
    motivo_descarte = Column(String(100))  # agregador, nao_ux, sem_titulo, link_generico, sem_contato

    # Log de transformações (cada etapa do processamento)
    transformacoes = Column(JSON)  # [{"etapa": "filtro_agregador", "resultado": "passou"}, ...]

    # Validação com IA
    validado_ia = Column(Boolean, default=False)
    confianca_ia = Column(Float)  # 0.0 a 1.0
    resposta_ia_raw = Column(Text)  # Resposta bruta da IA para debug

    # Timestamps
    timestamp_processamento = Column(DateTime, server_default=func.now())

    # Relacionamentos
    registro_bruto = relationship("RegistroBruto", back_populates="processamento")
    vaga = relationship("Vaga", back_populates="auditoria")

    __table_args__ = (
        Index("idx_proc_status", "status"),
        Index("idx_proc_motivo", "motivo_descarte"),
        Index("idx_proc_timestamp", "timestamp_processamento"),
    )

    def __repr__(self):
        return f"<ProcessamentoAuditoria(id={self.id}, status='{self.status}')>"


class ValidacaoAuditoria(Base):
    """
    Validações de amostra com IA.

    Registra validações periódicas onde a IA compara os dados extraídos
    no banco com os dados brutos originais para detectar discrepâncias.
    """
    __tablename__ = "validacao_auditoria"

    id = Column(Integer, primary_key=True, autoincrement=True)
    registro_bruto_id = Column(Integer, ForeignKey("registros_brutos.id"), nullable=True)
    vaga_id = Column(Integer, ForeignKey("vagas.id"), nullable=True)

    # Tipo de validação
    tipo_validacao = Column(String(30))  # amostra_periodica, manual, reprocessamento

    # Resultado
    resultado = Column(String(20))  # correto, discrepancia, erro

    # Detalhes da validação
    campos_verificados = Column(JSON)  # ["titulo", "empresa", "modalidade", ...]
    score_confianca = Column(Float)  # 0.0 a 1.0
    discrepancias = Column(JSON)  # [{"campo": "titulo", "esperado": "...", "atual": "..."}]

    # IA
    prompt_usado = Column(Text)  # Prompt enviado para a IA
    resposta_ia = Column(Text)  # Resposta completa da IA

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())

    # Relacionamentos
    registro_bruto = relationship("RegistroBruto", back_populates="validacoes")

    __table_args__ = (
        Index("idx_valid_tipo", "tipo_validacao"),
        Index("idx_valid_resultado", "resultado"),
        Index("idx_valid_timestamp", "created_at"),
    )

    def __repr__(self):
        return f"<ValidacaoAuditoria(id={self.id}, resultado='{self.resultado}', score={self.score_confianca})>"


class ConfiguracaoIA(Base):
    """Configurações globais e controle de custos da IA."""
    __tablename__ = "configuracao_ia"

    id = Column(Integer, primary_key=True, autoincrement=True)
    saldo_inicial_usd = Column(Float, default=10.0)  # Créditos totais comprados
    gasto_acumulado_usd = Column(Float, default=0.0)  # Total já gasto
    alerta_limite_usd = Column(Float, default=2.0)   # Valor para disparar aviso

    # Rastreamento de chamadas por modelo
    haiku_calls = Column(Integer, default=0)  # Total de chamadas Haiku
    sonnet_calls = Column(Integer, default=0)  # Total de chamadas Sonnet
    vision_calls = Column(Integer, default=0)  # Total de chamadas Vision

    # Rastreamento de gasto por modelo (USD)
    gasto_haiku_usd = Column(Float, default=0.0)  # Gasto com Haiku
    gasto_sonnet_usd = Column(Float, default=0.0)  # Gasto com Sonnet
    gasto_vision_usd = Column(Float, default=0.0)  # Gasto com Vision

    # Metadados de última cobrança
    ultima_atualizacao = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        saldo = self.saldo_inicial_usd - self.gasto_acumulado_usd
        return f"<ConfiguracaoIA(saldo_atual=${saldo:.2f})>"

    @property
    def saldo_disponivel(self) -> float:
        """Calcula saldo disponível em tempo real."""
        return max(0, self.saldo_inicial_usd - self.gasto_acumulado_usd)

    @property
    def percentual_gasto(self) -> float:
        """Percentual do saldo já gasto."""
        if self.saldo_inicial_usd == 0:
            return 0.0
        return min(100, (self.gasto_acumulado_usd / self.saldo_inicial_usd) * 100)

    @property
    def em_alerta(self) -> bool:
        """Verifica se está abaixo do limite de alerta."""
        return self.saldo_disponivel <= self.alerta_limite_usd

