"""
Perfil padrao do usuario para matching de vagas.
Baseado no curriculo e LinkedIn do William Vieira.
"""

WILLIAM_PROFILE = {
    "nome": "William Vieira",
    "email": "williamvieira.vagas@gmail.com",

    # Cargos de interesse (lowercase para matching)
    "cargos_interesse": [
        "product designer",
        "product manager",
        "head de produto",
        "ux designer",
        "ui designer",
        "design lead",
        "staff designer",
        "ai product designer",
        "ux research",
        "ux researcher",
        "design ops",
        "product owner",
        "service designer",
        "lead designer",
        "senior designer",
        "especialista ux",
        "especialista produto",
    ],

    # Nivel minimo aceitavel
    "nivel_minimo": "senior",  # 18 anos de experiencia
    "experiencia_anos": 18,

    # Skills para matching (lowercase)
    "skills": [
        # Design Tools
        "figma", "sketch", "adobe xd", "protopie", "axure",
        "photoshop", "illustrator", "invision",

        # UX/Design
        "wireframing", "prototipagem", "prototipo", "design system",
        "ui design", "ux design", "visual design", "interaction design",

        # UX Research
        "ux research", "user research", "pesquisa", "teste de usabilidade",
        "usabilidade", "user journey", "jornada do usuario",
        "arquitetura da informacao", "arquitetura de informacao",
        "persona", "personas",

        # Product
        "product management", "gestao de produto", "roadmap", "roadmaps",
        "okr", "okrs", "kpi", "kpis", "metricas",
        "product strategy", "estrategia de produto",
        "mvp", "backlog", "discovery", "product discovery",

        # Metodologias
        "design thinking", "design sprint",
        "metodologias ageis", "agile", "scrum", "kanban",
        "lean", "lean ux",

        # Tech
        "html", "css", "javascript", "react", "vue",
        "front-end", "frontend",

        # AI/Data
        "ia", "ai", "inteligencia artificial",
        "generative ai", "ia generativa",
        "data-driven", "data driven design",
        "analytics", "dados",

        # Soft Skills
        "lideranca", "leadership", "gestao de equipe",
        "stakeholder management", "gestao de stakeholders",
        "comunicacao", "apresentacao",

        # Acessibilidade
        "acessibilidade", "accessibility", "wcag", "a11y",

        # Ferramentas complementares
        "jira", "confluence", "miro", "figjam", "notion",
        "hotjar", "google analytics", "mixpanel", "amplitude",
    ],

    # Preferencias de trabalho
    "modalidades_aceitas": ["remoto", "hibrido"],
    "tipos_contrato": ["clt", "pj"],

    # Localizacoes aceitas
    "localizacoes": [
        "brasil",
        "rio de janeiro",
        "sao paulo",
        "remoto",
        "remote",
        "anywhere",
        "latam",
        "america latina",
    ],

    # Nivel de ingles
    "nivel_ingles": "intermediario",  # Limited Working

    # Salario (nao especificado = aceita qualquer)
    "salario_minimo": None,
    "salario_maximo": None,
}


def get_default_profile():
    """Retorna o perfil padrao do usuario."""
    return WILLIAM_PROFILE.copy()
