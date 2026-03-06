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
    primeiro_nome = Column(String(50), nullable=True)
    nome_meio = Column(String(50), nullable=True)
    ultimo_nome = Column(String(100), nullable=True)
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

    # PRD v13 — Novos campos estruturados
    profissoes_interesse = Column(JSON, default=list)   # [{titulo, nivel, anos_exp}]
    idiomas = Column(JSON, default=list)                # [{idioma, proficiencia}]
    formacoes = Column(JSON, default=list)              # [{grau, curso, instituicao, status}]
    salario_moeda = Column(String(5), default="BRL")
    salario_periodo = Column(String(20), default="mensal")
    salario_negociavel = Column(Boolean, default=True)
    modelos_trabalho = Column(JSON, default=list)       # ["remoto", "hibrido", "presencial"]
    aceita_relocacao = Column(Boolean, default=False)
    raio_busca_km = Column(Integer, default=50)
    pais = Column(String(100), default="Brasil")
    estado = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=True)
    cep = Column(String(10), nullable=True)
    skills_prioritarias = Column(JSON, default=list)    # top 5 skills (ordenadas)

    # Onboarding
    onboarding_completed = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=0)
    import_method = Column(String(20), nullable=True)  # 'linkedin_zip' | 'cv' | 'manual'

    # Assinatura SaaS / Plano Premium
    is_premium = Column(Boolean, default=False)
    plano_expira_em = Column(DateTime, nullable=True)
    plano_tipo = Column(String(20), default='free')       # 'free' | 'pro' | 'ultimate'
    billing_period = Column(String(10), default='mensal') # 'mensal' | 'anual'

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


class SmartEmailCache(Base):
    """Cache de e-mails classificados pela IA para o card Smart Emails do Dashboard."""
    __tablename__ = "smart_emails_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String(255), unique=True, nullable=False)
    thread_id = Column(String(255))
    category = Column(String(50), nullable=False)      # INTERVIEW_SCHEDULED, STAGE_APPROVED, etc.
    priority = Column(String(20), nullable=False)       # urgent, high, medium, low
    company_name = Column(String(255))
    job_title = Column(String(255))
    summary = Column(Text)                              # Resumo gerado pela IA
    action_required = Column(Text)                      # Ação necessária (ou null)
    deadline = Column(DateTime, nullable=True)          # Prazo (ISO datetime ou null)
    sentiment = Column(String(20))                      # positive, neutral, negative
    from_name = Column(String(255))
    from_email = Column(String(255))
    subject = Column(Text)
    received_at = Column(DateTime)
    is_unread = Column(Boolean, default=True)
    classified_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)       # Cache TTL (6 horas)

    __table_args__ = (
        Index("idx_smart_priority", "priority"),
        Index("idx_smart_expires", "expires_at"),
    )

    def __repr__(self):
        return f"<SmartEmailCache(id={self.id}, company='{self.company_name}', priority='{self.priority}')>"


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


# =============================================================================
# WHATSAPP ALERTS (PRD v17)
# =============================================================================

class WhatsAppPreferences(Base):
    """Preferências do usuário para recebimento de alertas via WhatsApp."""
    __tablename__ = "whatsapp_preferences"

    id = Column(String(36), primary_key=True)  # UUID4
    user_id = Column(Integer, ForeignKey("user_profiles.id"), unique=True, nullable=False)
    phone_number = Column(String(20), nullable=True)  # +5511999999999
    phone_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)  # Master switch
    
    # Alertas
    alert_high_score = Column(Boolean, default=True)
    alert_daily_summary = Column(Boolean, default=False)
    alert_expiring = Column(Boolean, default=False)
    alert_interview = Column(Boolean, default=True)
    alert_approved = Column(Boolean, default=True)
    alert_feedback = Column(Boolean, default=False)
    alert_reminder_24h = Column(Boolean, default=True)
    alert_profile = Column(Boolean, default=False)
    alert_inactivity = Column(Boolean, default=False)
    
    # Config do Silêncio
    quiet_start = Column(String(5), default="22:00")
    quiet_end = Column(String(5), default="07:00")
    timezone = Column(String(50), default="America/Sao_Paulo")
    quiet_until = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relacionamento back-populates opcional depois
    def __repr__(self):
        return f"<WhatsAppPreferences(user_id={self.user_id}, active={self.is_active})>"

class WhatsAppLog(Base):
    """Log de auditoria das mensagens disparadas no WhatsApp."""
    __tablename__ = "whatsapp_log"

    id = Column(String(36), primary_key=True)  # UUID4
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # high_score, interview, etc
    template_id = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)
    message_body = Column(Text, nullable=True)
    status = Column(String(20), default="queued")  # queued, sent, delivered, read, failed
    provider_id = Column(String(255), nullable=True)  # Twilio SID
    error = Column(Text, nullable=True)
    cost_usd = Column(Float, nullable=True)
    
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_wa_log_user", "user_id", "created_at"),
        Index("idx_wa_log_status", "status", "created_at"),
    )

    def __repr__(self):
        return f"<WhatsAppLog(id={self.id}, type='{self.alert_type}', status='{self.status}')>"


class TransacaoPagamento(Base):
    """Histórico de transações financeiras para compras de pacotes de IA."""
    __tablename__ = "transacoes_pagamento"

    id = Column(String(36), primary_key=True)  # UUID4
    gateway = Column(String(50), nullable=False, index=True)  # 'mercadopago', 'stripe'
    gateway_id = Column(String(100), nullable=True)  # ID retornado pelo Gateway
    status = Column(String(20), default="pending")  # 'pending', 'approved', 'rejected'
    
    valor_usd = Column(Float, nullable=False)  # Quantidade de Créditos IA add
    valor_brl = Column(Float, nullable=False)  # Valor pago pelo usuário em BRL
    
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Vinculo com o usuario do SaaS em vez da configuração de IA
    user_email = Column(String(100), nullable=True, index=True)
    
    def __repr__(self):
        return f"<TransacaoPagamento(id={self.id}, status='{self.status}', BRL={self.valor_brl})>"


class ExtensionLog(Base):
    """Log de eventos da Chrome Extension Vagato para analytics."""
    __tablename__ = "extension_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(100), nullable=False)
    event = Column(String(50), nullable=False)       # form_detected, form_filled, ai_generated
    site = Column(String(100), nullable=True)         # gupy.io, linkedin.com
    fields_filled = Column(Integer, default=0)
    ai_calls = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_ext_log_email", "user_email"),
        Index("idx_ext_log_event", "event"),
        Index("idx_ext_log_timestamp", "created_at"),
    )

    def __repr__(self):
        return f"<ExtensionLog(id={self.id}, event='{self.event}', site='{self.site}')>"


# ══════════════════════════════════════════════════════════════════════════════
# BACKOFFICE ADMIN
# ══════════════════════════════════════════════════════════════════════════════

class AdminUser(Base):
    """Tabela de admins — SEPARADA dos users comuns (Supabase Auth)."""
    __tablename__ = "admin_users"

    id            = Column(String, primary_key=True)
    email         = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20), nullable=False, default='admin')  # 'owner' | 'admin' | 'viewer'
    totp_secret   = Column(String(255), nullable=True)
    totp_enabled  = Column(Boolean, default=False)
    is_active     = Column(Boolean, default=True)
    last_login    = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class AdminAuditLog(Base):
    """Audit log — TODA ação administrativa é registrada aqui."""
    __tablename__ = "admin_audit_log"

    id          = Column(String, primary_key=True)
    admin_id    = Column(String, ForeignKey("admin_users.id"), nullable=True)
    action      = Column(String(100), nullable=False)   # 'admin.login', 'user.delete', 'coupon.create'
    target_type = Column(String(50), nullable=True)      # 'user', 'coupon', 'plan', 'config'
    target_id   = Column(String(255), nullable=True)     # ID do recurso afetado
    details     = Column(JSON, nullable=True)            # detalhes extras
    ip_address  = Column(String(45), nullable=True)
    user_agent  = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_audit_log_admin", "admin_id", "created_at"),
        Index("idx_audit_log_action", "action", "created_at"),
    )


class Coupon(Base):
    """Cupons de desconto gerenciados pelo Backoffice Admin."""
    __tablename__ = "coupons"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    code             = Column(String(50), unique=True, nullable=False, index=True)
    discount_pct     = Column(Float, nullable=True)            # 20.0 = 20%
    discount_fixed   = Column(Float, nullable=True)            # R$10 off
    discount_type    = Column(String(10), nullable=False, default='percent')  # 'percent' | 'fixed'
    max_uses         = Column(Integer, nullable=True)          # null = ilimitado
    current_uses     = Column(Integer, default=0)
    applicable_plans = Column(JSON, default=list)              # ["pro", "ultimate"] ou [] = todos
    expires_at       = Column(DateTime(timezone=True), nullable=True)
    is_active        = Column(Boolean, default=True)
    created_by       = Column(String, ForeignKey("admin_users.id"), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_coupon_active", "is_active"),
    )


class EmailTemplate(Base):
    """Templates de e-mail transacional gerenciados pelo Backoffice."""
    __tablename__ = "email_templates"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    slug          = Column(String(100), unique=True, nullable=False, index=True)
    nome          = Column(String(200), nullable=False)
    assunto       = Column(String(500), nullable=False)
    corpo         = Column(Text, nullable=False)
    variaveis     = Column(JSON, default=list)
    tipo          = Column(String(30), default='transacional')
    is_active     = Column(Boolean, default=True)
    created_by    = Column(String, ForeignKey("admin_users.id"), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EmailLog(Base):
    """Log de envio de e-mails transacionais."""
    __tablename__ = "email_logs"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    template_id   = Column(Integer, ForeignKey("email_templates.id"), nullable=True)
    to_email      = Column(String(255), nullable=False)
    subject       = Column(String(500), nullable=False)
    status        = Column(String(20), default='sent')
    error_message = Column(Text, nullable=True)
    sent_at       = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_email_log_status", "status"),
        Index("idx_email_log_sent", "sent_at"),
    )


