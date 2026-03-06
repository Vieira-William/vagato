/**
 * Constantes para o Onboarding Wizard v13.1 (Redesign).
 * Scope: qualquer profissional no Brasil buscando emprego.
 * 5 steps focados no que impacta o score de match (85%).
 */

// ============================================
// Steps metadata (5 steps)
// ============================================
export const STEPS = [
  { id: 0, label: 'Dados',     icon: 'User' },
  { id: 1, label: 'Profissão', icon: 'Briefcase' },
  { id: 2, label: 'Skills',    icon: 'Zap' },
  { id: 3, label: 'Trabalho',  icon: 'Settings2' },
  { id: 4, label: 'Revisão',   icon: 'CheckCircle2' },
];

export const TOTAL_STEPS = STEPS.length; // 5

// Nenhum step inteiro é pulável (campos opcionais ficam dentro do step 3)
export const SKIPPABLE_STEPS = [];

// ============================================
// Top profissões para cards clicáveis (Step 2)
// ============================================
export const TOP_PROFISSOES = [
  { titulo: 'UX Designer', emoji: '🎨' },
  { titulo: 'Product Designer', emoji: '📐' },
  { titulo: 'UX Researcher', emoji: '🔍' },
  { titulo: 'UI Designer', emoji: '🖥️' },
  { titulo: 'UX Writer', emoji: '✏️' },
  { titulo: 'Frontend Developer', emoji: '💻' },
  { titulo: 'Product Manager', emoji: '📊' },
  { titulo: 'Fullstack Developer', emoji: '🚀' },
  { titulo: 'Data Analyst', emoji: '📈' },
];

// ============================================
// Nível / Senioridade — cards descritivos (Step 2)
// ============================================
export const NIVEL_CARDS = [
  { valor: 'junior', emoji: '🌱', titulo: 'Júnior (0-2 anos)', desc: 'Estou começando na área ou em transição de carreira' },
  { valor: 'pleno', emoji: '🌿', titulo: 'Pleno (2-5 anos)', desc: 'Tenho experiência sólida e trabalho com autonomia' },
  { valor: 'senior', emoji: '🌳', titulo: 'Sênior (5-10 anos)', desc: 'Lidero projetos e mentoro outros profissionais' },
  { valor: 'lead', emoji: '👑', titulo: 'Lead / Staff (10+ anos)', desc: 'Defino estratégia e influencio decisões de produto' },
];

// ============================================
// Métodos de importação (pré-wizard)
// ============================================
export const IMPORT_METHODS = [
  { value: 'linkedin_zip', label: 'Importar do LinkedIn', icon: 'Linkedin', accept: '.zip' },
  { value: 'cv', label: 'Enviar Currículo (PDF)', icon: 'FileText', accept: '.pdf' },
  { value: 'manual', label: 'Preencher manualmente', icon: 'PencilLine', accept: null },
];

// ============================================
// Profissões (90+ — scope geral)
// ============================================
export const PROFISSAO_SUGGESTIONS = [
  // Design & Criação
  'UX Designer', 'Product Designer', 'UI Designer', 'Motion Designer',
  'Graphic Designer', 'UX Researcher', 'UX Writer', 'Design Lead',
  'Head of Design', 'Service Designer', 'Interaction Designer',
  // Tecnologia
  'Frontend Developer', 'Backend Developer', 'Fullstack Developer',
  'Mobile Developer', 'DevOps Engineer', 'SRE', 'Data Engineer',
  'Data Scientist', 'Machine Learning Engineer', 'QA Engineer',
  'Tech Lead', 'CTO', 'Engenheiro de Software', 'Arquiteto de Software',
  'DBA', 'Analista de Sistemas', 'Scrum Master',
  // Produto
  'Product Manager', 'Product Owner', 'Head of Product',
  'Analista de Produto', 'Growth Product Manager',
  // Marketing
  'Analista de Marketing', 'Social Media', 'Growth Hacker',
  'Analista de SEO/SEM', 'Copywriter', 'Content Strategist',
  'Marketing Manager', 'Head de Marketing', 'Analista de CRM',
  'Performance Marketing', 'Brand Manager',
  // Comercial & Vendas
  'Executivo de Vendas', 'SDR', 'Account Manager', 'Key Account Manager',
  'Customer Success Manager', 'Pré-vendas', 'Gerente Comercial',
  'Head de Vendas', 'Inside Sales',
  // RH & Pessoas
  'Analista de RH', 'Recrutador', 'HRBP', 'Analista de T&D',
  'Gestão de Pessoas', 'Head de RH', 'People Analytics',
  'Analista de Departamento Pessoal',
  // Financeiro & Contabilidade
  'Analista Financeiro', 'Contador', 'Controller', 'Analista de BI',
  'CFO', 'Tesoureiro', 'Analista de FP&A', 'Auditor',
  // Jurídico
  'Advogado', 'Analista Jurídico', 'Compliance Officer',
  'Paralegal', 'Head Jurídico',
  // Operações & Projetos
  'Analista de Operações', 'Supply Chain Manager', 'Analista de Logística',
  'Comprador', 'Gerente de Projetos', 'PMO', 'Analista de Processos',
  // Saúde
  'Médico', 'Enfermeiro', 'Psicólogo', 'Nutricionista',
  'Fisioterapeuta', 'Farmacêutico', 'Dentista',
  // Educação
  'Professor', 'Pedagogo', 'Coordenador Pedagógico',
  'Instrutor', 'Designer Instrucional',
  // Atendimento & CX
  'Analista de Suporte', 'Customer Support', 'Analista de CX',
  'Gerente de Atendimento',
  // Engenharia (não-tech)
  'Engenheiro Civil', 'Engenheiro Mecânico', 'Engenheiro Elétrico',
  'Engenheiro de Produção', 'Engenheiro Ambiental',
  // Comunicação & Jornalismo
  'Jornalista', 'Assessor de Imprensa', 'Relações Públicas',
  'Analista de Comunicação Interna',
  // Administrativo & Geral
  'Administrador', 'Analista Administrativo', 'Secretária Executiva',
  'Assistente Administrativo', 'Consultor',
];

// ============================================
// Skills por profissão (mapeamento inteligente)
// ============================================
export const SKILLS_BY_PROFISSAO = {
  // --- Design & Criação ---
  'UX Designer': ['Figma', 'UX Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Usability Testing', 'User Flows', 'Information Architecture', 'Design Thinking', 'Accessibility', 'Heuristic Evaluation', 'Journey Mapping'],
  'Product Designer': ['Figma', 'Product Strategy', 'Design Thinking', 'A/B Testing', 'User Flows', 'Prototyping', 'Design Systems', 'Data-Driven Design', 'Stakeholder Management', 'UX Research', 'UI Design', 'Interaction Design'],
  'UI Designer': ['Figma', 'Visual Design', 'Typography', 'Color Theory', 'Iconography', 'Design Systems', 'Motion Design', 'Responsive Design', 'CSS', 'Illustration', 'Brand Design', 'Component Library'],
  'UX Researcher': ['User Interviews', 'Usability Testing', 'Survey Design', 'Data Analysis', 'Qualitative Research', 'Quantitative Research', 'A/B Testing', 'Card Sorting', 'Diary Studies', 'Ethnographic Research', 'Competitive Analysis', 'Personas'],
  'Motion Designer': ['After Effects', 'Figma', 'Lottie', 'Animation', 'Motion Graphics', 'Cinema 4D', 'Premiere Pro', 'Storyboarding', 'Visual Design', 'Illustration'],
  'Graphic Designer': ['Photoshop', 'Illustrator', 'InDesign', 'Figma', 'Brand Identity', 'Typography', 'Print Design', 'Packaging', 'Visual Communication', 'Layout'],
  'Design Lead': ['Team Management', 'Design Strategy', 'Stakeholder Management', 'Design Systems', 'Mentoring', 'Design Ops', 'Figma', 'Product Strategy', 'Roadmap Planning', 'Cross-functional Collaboration'],
  'Head of Design': ['Design Leadership', 'Team Building', 'Design Strategy', 'Budget Management', 'Stakeholder Management', 'Design Ops', 'OKRs', 'Hiring', 'Mentoring', 'Executive Communication'],
  'UX Writer': ['Microcopy', 'Content Strategy', 'Tone of Voice', 'Localization', 'A/B Testing', 'Information Architecture', 'Accessibility', 'User Research', 'Style Guides', 'Content Design'],
  'Service Designer': ['Service Blueprinting', 'Journey Mapping', 'Stakeholder Mapping', 'Co-creation Workshops', 'Systems Thinking', 'Design Thinking', 'Ethnographic Research', 'Prototyping', 'Figma', 'Facilitation'],
  'Interaction Designer': ['Interaction Design', 'Prototyping', 'Motion Design', 'Figma', 'User Flows', 'Micro-interactions', 'Responsive Design', 'Accessibility', 'Usability Testing', 'Design Systems'],
  // --- Tecnologia ---
  'Frontend Developer': ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Next.js', 'Tailwind CSS', 'Node.js', 'Git', 'REST APIs', 'GraphQL', 'Testing'],
  'Backend Developer': ['Python', 'Node.js', 'Java', 'PostgreSQL', 'MongoDB', 'Docker', 'REST APIs', 'Microservices', 'Redis', 'AWS', 'Git', 'CI/CD'],
  'Fullstack Developer': ['React', 'Node.js', 'TypeScript', 'Python', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'REST APIs', 'GraphQL', 'Git', 'CI/CD'],
  'Mobile Developer': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 'Firebase', 'REST APIs', 'Git', 'App Store', 'UI/UX Mobile', 'Testing'],
  'DevOps Engineer': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Terraform', 'CI/CD', 'Linux', 'Monitoring', 'Ansible', 'Jenkins', 'Git', 'Bash'],
  'Data Engineer': ['Python', 'SQL', 'Spark', 'Airflow', 'AWS/GCP', 'ETL', 'Kafka', 'Databricks', 'Data Modeling', 'PostgreSQL', 'Docker', 'Git'],
  'Data Scientist': ['Python', 'Machine Learning', 'SQL', 'Statistics', 'Pandas', 'Scikit-learn', 'TensorFlow', 'Data Visualization', 'Jupyter', 'R', 'Deep Learning', 'NLP'],
  'Machine Learning Engineer': ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'Docker', 'AWS/GCP', 'Deep Learning', 'NLP', 'Computer Vision', 'Kubernetes', 'SQL', 'Git'],
  'QA Engineer': ['Selenium', 'Cypress', 'Jest', 'Testing Manual', 'Automação de Testes', 'Postman', 'BDD', 'Performance Testing', 'SQL', 'Git', 'Jira', 'CI/CD'],
  'Engenheiro de Software': ['Java', 'Python', 'C#', 'Design Patterns', 'Clean Architecture', 'Microservices', 'Docker', 'SQL', 'Git', 'Agile', 'TDD', 'CI/CD'],
  'Tech Lead': ['Arquitetura de Software', 'Code Review', 'Mentoria', 'Agile', 'System Design', 'Git', 'CI/CD', 'Gestão de Time', 'React', 'Node.js'],
  'Scrum Master': ['Scrum', 'Kanban', 'Facilitação', 'Agile', 'Jira', 'Confluence', 'Coaching', 'Retrospectivas', 'Sprint Planning', 'Métricas Ágeis'],
  // --- Produto ---
  'Product Manager': ['Product Strategy', 'Roadmap Planning', 'User Stories', 'Agile/Scrum', 'Data Analysis', 'Stakeholder Management', 'A/B Testing', 'Metrics & KPIs', 'Market Research', 'Competitive Analysis', 'Prioritization', 'SQL'],
  'Product Owner': ['Backlog Management', 'User Stories', 'Agile/Scrum', 'Stakeholder Management', 'Priorização', 'Jira', 'Refinamento', 'Sprint Planning', 'Acceptance Criteria'],
  'Head of Product': ['Product Strategy', 'Team Management', 'OKRs', 'Data-Driven Decisions', 'Stakeholder Management', 'Roadmap', 'Hiring', 'Budget', 'Executive Communication'],
  // --- Marketing ---
  'Analista de Marketing': ['Google Analytics', 'Google Ads', 'Meta Ads', 'Email Marketing', 'CRM', 'SEO', 'Content Marketing', 'Métricas', 'A/B Testing', 'Excel'],
  'Social Media': ['Instagram', 'LinkedIn', 'TikTok', 'Copywriting', 'Canva', 'Métricas', 'Planejamento de Conteúdo', 'Community Management', 'Ads', 'Storytelling'],
  'Growth Hacker': ['Growth Strategy', 'A/B Testing', 'Funil de Conversão', 'Google Analytics', 'SQL', 'Automação', 'CRO', 'Product-Led Growth', 'Métricas', 'Python'],
  'Copywriter': ['Copywriting', 'Storytelling', 'SEO', 'UX Writing', 'Email Marketing', 'Landing Pages', 'Criatividade', 'Pesquisa de Mercado', 'Tone of Voice'],
  'Content Strategist': ['Content Strategy', 'SEO', 'Editorial Calendar', 'Analytics', 'Storytelling', 'Brand Voice', 'Content Marketing', 'Social Media'],
  // --- Comercial ---
  'Executivo de Vendas': ['Negociação', 'CRM (Salesforce/HubSpot)', 'Prospecção', 'Pipeline Management', 'Apresentações', 'Fechamento', 'B2B', 'Consultive Selling', 'Meta/KPI'],
  'SDR': ['Prospecção', 'Cold Calling', 'Email Outreach', 'LinkedIn', 'CRM', 'Qualificação de Leads', 'Cadência de Vendas', 'SaaS', 'B2B'],
  'Account Manager': ['Gestão de Contas', 'Relacionamento com Cliente', 'Upselling', 'CRM', 'Negociação', 'Customer Success', 'Apresentações', 'Renovação de Contratos'],
  'Customer Success Manager': ['Onboarding de Clientes', 'Health Score', 'Churn Prevention', 'CRM', 'NPS', 'Upselling', 'Customer Journey', 'Data Analysis'],
  // --- RH ---
  'Analista de RH': ['Recrutamento e Seleção', 'Treinamento', 'Avaliação de Desempenho', 'Gestão de Benefícios', 'Excel', 'Legislação Trabalhista', 'SAP/Totvs', 'Employer Branding', 'People Analytics'],
  'Recrutador': ['Talent Acquisition', 'LinkedIn Recruiter', 'Entrevistas', 'Sourcing', 'ATS', 'Employer Branding', 'Técnicas de Seleção', 'Negociação de Ofertas'],
  'HRBP': ['Business Partner', 'Gestão de Pessoas', 'Desenvolvimento Organizacional', 'Consultoria Interna', 'Indicadores de RH', 'Mediação de Conflitos', 'Planejamento de Carreira'],
  // --- Financeiro ---
  'Analista Financeiro': ['Excel Avançado', 'Análise de Demonstrações', 'Fluxo de Caixa', 'Budget', 'FP&A', 'Modelagem Financeira', 'SAP', 'Power BI', 'SQL', 'VBA'],
  'Contador': ['Contabilidade Geral', 'Fiscal/Tributário', 'IFRS', 'Excel', 'SAP/Totvs', 'SPED', 'Balanço Patrimonial', 'DRE', 'Legislação Contábil', 'Auditoria'],
  'Controller': ['Controladoria', 'Orçamento', 'KPIs Financeiros', 'Excel Avançado', 'SAP', 'Power BI', 'Fechamento Contábil', 'Compliance', 'FP&A'],
  'Analista de BI': ['Power BI', 'SQL', 'Excel', 'Data Modeling', 'ETL', 'Python', 'Tableau', 'Dashboard Design', 'Storytelling com Dados', 'Google Analytics'],
  // --- Jurídico ---
  'Advogado': ['Direito Empresarial', 'Contratos', 'Compliance', 'LGPD', 'Trabalhista', 'Societário', 'Tributário', 'Negociação', 'Pesquisa Jurídica'],
  'Compliance Officer': ['Compliance', 'LGPD', 'Auditoria', 'Gestão de Riscos', 'Ética Corporativa', 'Políticas Internas', 'Treinamento', 'SOX', 'ISO', 'Due Diligence'],
  // --- Operações ---
  'Gerente de Projetos': ['PMBOK', 'Agile/Scrum', 'MS Project', 'Jira', 'Gestão de Riscos', 'Stakeholder Management', 'Budget', 'Kanban', 'Cronograma', 'KPIs'],
  'Analista de Operações': ['Processos', 'Excel', 'Lean', 'Six Sigma', 'Melhoria Contínua', 'Indicadores', 'Automação de Processos', 'ERP', 'Power BI', 'BPM'],
  'Analista de Logística': ['Supply Chain', 'SAP', 'Excel', 'Gestão de Estoque', 'Transporte', 'WMS', 'Importação/Exportação', 'Indicadores Logísticos', 'Negociação'],
  // --- Saúde ---
  'Médico': ['Diagnóstico Clínico', 'Prontuário Eletrônico', 'Telemedicina', 'Gestão Hospitalar', 'Pesquisa Clínica', 'Comunicação com Paciente'],
  'Enfermeiro': ['Assistência de Enfermagem', 'SAE', 'Prontuário Eletrônico', 'Emergência', 'UTI', 'Gestão de Equipe', 'Educação em Saúde'],
  'Psicólogo': ['Psicologia Clínica', 'Avaliação Psicológica', 'TCC', 'Psicologia Organizacional', 'R&S', 'Laudos', 'Saúde Mental'],
  // --- Educação ---
  'Professor': ['Planejamento de Aulas', 'Didática', 'Avaliação', 'Educação a Distância', 'Google Classroom', 'Metodologias Ativas', 'BNCC', 'Inclusão'],
  'Designer Instrucional': ['Design Instrucional', 'LMS', 'Storyline/Articulate', 'ADDIE', 'Gamificação', 'EAD', 'UX para Educação', 'Vídeo Educacional'],
  // --- Engenharia ---
  'Engenheiro Civil': ['AutoCAD', 'Revit', 'Gestão de Obras', 'Orçamento', 'MS Project', 'Estruturas', 'NR-18', 'Topografia', 'BIM', 'Excel'],
  'Engenheiro de Produção': ['Lean Manufacturing', 'Six Sigma', 'Kaizen', 'PCP', 'SAP', 'Gestão da Qualidade', 'Indicadores', 'Excel', 'Melhoria Contínua'],
  // --- Comunicação ---
  'Jornalista': ['Redação', 'Apuração', 'Edição de Texto', 'SEO', 'Wordpress', 'Redes Sociais', 'Assessoria de Imprensa', 'Fotojornalismo'],
  'Relações Públicas': ['Comunicação Corporativa', 'Eventos', 'Gerenciamento de Crise', 'Media Relations', 'Assessoria de Imprensa', 'Stakeholder Management'],
};

// Skills genéricas (fallback)
export const GENERIC_SKILLS = [
  'Comunicação', 'Excel', 'PowerPoint', 'Word', 'Inglês',
  'Gestão de Tempo', 'Trabalho em Equipe', 'Liderança',
  'Resolução de Problemas', 'Pensamento Analítico', 'Organização',
  'Gestão de Projetos', 'Negociação', 'Apresentações',
  'Atendimento ao Cliente', 'Vendas', 'Marketing Digital',
  'Redes Sociais', 'Google Analytics', 'Power BI',
  'SQL', 'Python', 'Data Analysis', 'Agile/Scrum',
  'Design Thinking', 'Figma', 'Photoshop', 'Canva',
  'SAP', 'ERP', 'CRM', 'Jira', 'Notion',
  'Git', 'Docker', 'AWS', 'Google Workspace',
  'Scrum', 'Kanban', 'Lean', 'Six Sigma',
  'Storytelling', 'Criatividade', 'Empatia', 'Adaptabilidade',
];

// Master skills list (200+ para autocomplete)
export const MASTER_SKILLS = [
  // Design Tools
  'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Framer', 'Principle', 'ProtoPie',
  'Photoshop', 'Illustrator', 'After Effects', 'Blender', 'Cinema 4D', 'Spline',
  'Webflow', 'Miro', 'FigJam', 'Whimsical', 'Maze', 'Hotjar', 'Canva',
  // Design Skills
  'UX Research', 'Usability Testing', 'User Interviews', 'Card Sorting',
  'A/B Testing', 'Wireframing', 'Prototyping', 'Design Systems', 'Information Architecture',
  'Interaction Design', 'Visual Design', 'Typography', 'Color Theory', 'Accessibility (WCAG)',
  'Responsive Design', 'Mobile Design', 'Design Thinking', 'Service Design',
  'UX Writing', 'Content Strategy', 'Motion Design', 'Micro-interactions',
  'Journey Mapping', 'Personas', 'Heuristic Evaluation', 'User Flows',
  // Development
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Next.js',
  'Node.js', 'Python', 'Java', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin',
  'Flutter', 'React Native', 'SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'Git', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'REST APIs', 'GraphQL', 'CI/CD', 'Tailwind CSS', 'Sass',
  'Testing', 'Jest', 'Cypress', 'Selenium', 'TDD',
  // Data
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
  'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy',
  'Spark', 'Airflow', 'Kafka', 'ETL', 'Data Modeling',
  'Power BI', 'Tableau', 'Looker', 'BigQuery', 'Databricks',
  'Google Analytics', 'Mixpanel', 'Amplitude', 'Data Visualization',
  'Statistics', 'R', 'Jupyter',
  // Product
  'Product Management', 'Agile', 'Scrum', 'Kanban', 'OKRs', 'KPIs',
  'Roadmap Planning', 'Backlog Management', 'User Stories', 'Sprint Planning',
  'Jira', 'Asana', 'Trello', 'Notion', 'Confluence',
  'Product Discovery', 'Product-Led Growth', 'Metrics', 'Prioritization',
  // Soft Skills
  'Comunicação', 'Liderança', 'Trabalho em Equipe', 'Pensamento Crítico',
  'Resolução de Problemas', 'Gestão de Tempo', 'Apresentações', 'Negociação',
  'Feedback', 'Mentoring', 'Stakeholder Management', 'Cross-functional Collaboration',
  'Empatia', 'Adaptabilidade', 'Criatividade', 'Organização',
  // Business
  'Marketing Digital', 'SEO', 'SEM', 'Growth Hacking', 'CRM',
  'Salesforce', 'HubSpot', 'Email Marketing', 'Copywriting',
  'Business Intelligence', 'Estratégia', 'Finanças', 'Gestão de Projetos',
  'Excel', 'Excel Avançado', 'PowerPoint', 'Word', 'Google Workspace',
  'SAP', 'ERP', 'Totvs', 'Oracle',
  'Lean', 'Six Sigma', 'BPM', 'BPMN',
  // Languages & Frameworks
  'Inglês', 'Espanhol', 'LGPD', 'Compliance',
  'Storytelling', 'Content Marketing', 'Social Media',
  'Automação', 'RPA', 'VBA', 'Macro',
];

// ============================================
// Nível / Senioridade
// ============================================
export const NIVEL_OPTIONS = [
  { value: 'estagio', label: 'Estágio' },
  { value: 'junior', label: 'Júnior' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'senior', label: 'Sênior' },
  { value: 'especialista', label: 'Especialista / Staff' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
  { value: 'c-level', label: 'C-Level' },
];

// ============================================
// Idiomas e proficiência
// ============================================
export const IDIOMAS_COMUNS = [
  'Português', 'Inglês', 'Espanhol', 'Francês', 'Alemão',
  'Italiano', 'Japonês', 'Mandarim', 'Coreano', 'Libras',
  'Russo', 'Árabe', 'Holandês', 'Sueco',
];

export const PROFICIENCIA_OPTIONS = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
  { value: 'fluente', label: 'Fluente' },
  { value: 'nativo', label: 'Nativo' },
];

// ============================================
// Formação acadêmica
// ============================================
export const GRAU_OPTIONS = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'tecnologo', label: 'Tecnólogo' },
  { value: 'graduacao', label: 'Graduação' },
  { value: 'pos-graduacao', label: 'Pós-Graduação' },
  { value: 'mba', label: 'MBA' },
  { value: 'mestrado', label: 'Mestrado' },
  { value: 'doutorado', label: 'Doutorado' },
  { value: 'bootcamp', label: 'Bootcamp' },
];

export const STATUS_FORMACAO = [
  { value: 'cursando', label: 'Cursando' },
  { value: 'completo', label: 'Completo' },
  { value: 'trancado', label: 'Trancado' },
];

// ============================================
// Salário e contratação
// ============================================
export const MOEDA_OPTIONS = [
  { value: 'BRL', label: 'R$', symbol: 'R$' },
  { value: 'USD', label: 'US$', symbol: 'US$' },
  { value: 'EUR', label: '€', symbol: '€' },
];

export const PERIODO_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
  { value: 'hora', label: 'Por Hora' },
];

export const CONTRATO_OPTIONS = [
  { value: 'clt', label: 'CLT' },
  { value: 'pj', label: 'PJ' },
  { value: 'freelancer', label: 'Freelance' },
  { value: 'estagio', label: 'Estágio' },
];

export const MODALIDADE_OPTIONS = [
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'presencial', label: 'Presencial' },
];

// ============================================
// Localização — Estados BR
// ============================================
export const ESTADOS_BR = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' }, { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' }, { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' }, { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' }, { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' },
];

export const PAISES_COMUNS = [
  'Brasil', 'EUA', 'Portugal', 'Canadá', 'Alemanha',
  'Reino Unido', 'Espanha', 'França', 'Holanda', 'Irlanda',
  'Austrália', 'Japão', 'Argentina', 'Chile', 'México',
  'Colômbia', 'Uruguai', 'Itália', 'Suíça', 'Suécia',
];

export const RAIO_OPTIONS = [
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 200, label: '200 km' },
];

// ============================================
// Helpers
// ============================================

/** Normaliza string para busca (remove acentos, lowercase) */
export function normalizeSearch(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Busca fuzzy simples */
export function fuzzyMatch(query, items) {
  if (!query || query.length < 2) return [];
  const q = normalizeSearch(query);
  return items.filter((item) => normalizeSearch(item).includes(q));
}

/** Retorna skills sugeridas para uma ou mais profissões */
export function getSkillsForProfissoes(profissoes = []) {
  const seen = new Set();
  const result = [];
  for (const p of profissoes) {
    const titulo = typeof p === 'string' ? p : p.titulo;
    const skills = SKILLS_BY_PROFISSAO[titulo] || [];
    for (const s of skills) {
      if (!seen.has(s)) {
        seen.add(s);
        result.push(s);
      }
    }
  }
  if (result.length === 0) return GENERIC_SKILLS.slice(0, 20);
  return result;
}

/** Máscara monetária BR */
export function maskCurrency(value) {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return num.toLocaleString('pt-BR');
}

export function parseCurrency(value) {
  const digits = String(value).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : null;
}

/** Máscara telefone BR */
export function maskPhone(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Máscara CEP */
export function maskCep(value) {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Validação de URL */
export function isValidUrl(str) {
  if (!str) return false;
  try {
    const url = new URL(str.startsWith('http') ? str : `https://${str}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
