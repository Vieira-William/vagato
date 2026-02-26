# CLAUDE.md — Memória Completa do Projeto
> ⚠️ **LEIA ESTE ARQUIVO INTEIRO ANTES DE QUALQUER AÇÃO.**
> Este é o arquivo de contexto persistente do projeto. Deve ser lido no início de TODA sessão,
> em qualquer dispositivo. Atualizar a cada nova decisão importante.

---

## 🧭 O QUE É ESTE PROJETO

**Nome:** Vagas UX Platform
**Objetivo:** Plataforma pessoal de agregação de vagas de emprego para UX/UI Designer. Coleta automática de vagas do Indeed, LinkedIn Jobs e LinkedIn Posts, analisa com IA (Claude API), calcula score de compatibilidade com o perfil do usuário e gera cold messages personalizadas.
**Dono:** William Marangon — 18 anos de experiência em UX/Produto
**Status:** Em produção (Render), em desenvolvimento ativo
**Linguagem das respostas:** Sempre Português Brasileiro

---

## 🌐 LINKS CRÍTICOS — NUNCA ESQUECER

| Serviço | URL |
|---------|-----|
| **Frontend (online/produção)** | https://vagas-frontend.onrender.com/ |
| **Backend API (produção)** | https://vagas-api-cbar.onrender.com |
| **API Docs (Swagger)** | https://vagas-api-cbar.onrender.com/docs |
| **Repositório GitHub** | https://github.com/Vieira-William/vagas-ux-platform |
| **Render Dashboard** | https://dashboard.render.com |
| **Neon PostgreSQL** | https://neon.tech |
| **Anthropic Console** | https://console.anthropic.com |
| **Figma — arquivo "Vagas"** | https://figma.com/design/46upQ0yYDHuJqssvTT4Pxp/Vagas |

> ⚠️ O plano **gratuito do Render hiberna** servidores sem uso. Na 1ª visita leva ~60s para acordar.
> O frontend tem uma LoadingScreen que lida com isso automaticamente (auto-retry, health checks).

---

## 💻 DISPOSITIVOS DE TRABALHO

| Dispositivo | Hostname | Usuário | Papel |
|-------------|----------|---------|-------|
| **MacBook Air (notebook)** | MacBook-Air-de-William.local | williammarangon | Desenvolvimento principal |
| **Mac Mini** | Williams-Mac-mini.local | mactrabalho | Trabalho paralelo |

- Mesma conta Claude logada em ambos
- Mesma rede local
- Remote Login (SSH) ativado no Mac Mini
- Senha do Mac Mini: `169004`

### Workflow Git entre dispositivos
```bash
# SEMPRE antes de começar a trabalhar
git pull origin main

# SEMPRE ao terminar
git add .
git commit -m "mensagem descritiva"
git push origin main
```

### Setup do Mac Mini
Script automático disponível:
```bash
curl -fsSL https://raw.githubusercontent.com/Vieira-William/vagas-ux-platform/main/setup_macmini.sh | bash
```

---

## 🛠️ STACK TECNOLÓGICA

### Backend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| FastAPI | 0.109.0 | Framework principal |
| SQLAlchemy | 2.0.25 | ORM |
| Pydantic | 2.5.3 | Validação de dados |
| SQLite | — | Banco local (dev) |
| PostgreSQL (Neon) | — | Banco em produção |
| Anthropic Claude API | 0.40.0 | IA para extração e análise |
| Selenium | 4.17.2 | Scraping de vagas |
| APScheduler | 3.10.4 | Agendamento automático |
| Gunicorn + Uvicorn | — | Servidor de produção |
| pdfplumber | 0.11.0 | Leitura de CV em PDF |
| requests | 2.31.0 | HTTP client |
| pyarrow | ≥14.0.0 | Parquet para auditoria |
| psycopg2-binary | 2.9.9 | Driver PostgreSQL |

> Python forçado em **3.11.0** via arquivo `.python-version` (Python 3.13 é incompatível com pydantic-core no Render)

### Frontend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 19.2.0 | Framework UI |
| Vite | 7.2.4 | Build tool |
| Tailwind CSS | 3.4.19 | Estilização |
| Lucide React | 0.563.0 | Ícones |
| Recharts | 3.7.0 | Gráficos |
| Axios | 1.13.4 | HTTP client |
| clsx | 2.1.1 | Classes condicionais |
| date-fns | 4.1.0 | Datas |

### Deploy
| Serviço | Função |
|---------|--------|
| Render.com | Backend (Web Service) + Frontend (Static Site) |
| Neon | PostgreSQL gerenciado gratuito |
| GitHub | Repositório + trigger de deploy automático via push na `main` |

---

## 📁 ESTRUTURA COMPLETA DO PROJETO

```
vagas-ux-platform/
│
├── CLAUDE.md                          ← ESTE ARQUIVO (ler sempre primeiro)
├── FIGMA_IMPLEMENTATION_GUIDE.md      ← Especificações completas do Design System
├── FIGMA_BUILD_CHECKLIST.md           ← Checklist passo a passo para criar no Figma
├── figma_setup_structure.json         ← Estrutura JSON das 31 frames / 6 páginas
├── setup_figma_design_system.py       ← Script Python para gerar estrutura Figma
├── setup_macmini.sh                   ← Script automático de setup no Mac Mini
├── render.yaml                        ← Blueprint de deploy no Render
├── QA_PENDENCIAS.md                   ← Pendências identificadas em QA
│
├── backend/
│   ├── .python-version                ← Força Python 3.11.0 no Render
│   ├── requirements.txt               ← Dependências Python
│   ├── fazer_login.py                 ← Login manual LinkedIn (rodar quando expirar)
│   ├── abrir_linkedin.py              ← Abre LinkedIn com perfil salvo
│   │
│   └── app/
│       ├── main.py                    ← Entry point FastAPI + CORS
│       ├── database.py                ← Conexão SQLite/PostgreSQL
│       ├── models.py                  ← SQLAlchemy models (Vaga, UserProfile, ConfiguracaoIA)
│       ├── schemas.py                 ← Pydantic schemas com Enums
│       ├── crud.py                    ← CRUD + verificação de duplicatas
│       ├── config.py                  ← Settings + ANTHROPIC_API_KEY
│       │
│       ├── api/
│       │   ├── vagas.py               ← Endpoints de vagas (listar, criar, status, favoritar)
│       │   ├── stats.py               ← Estatísticas + histórico + ultima_coleta
│       │   ├── scraper.py             ← SSE streaming de coleta e auditoria
│       │   ├── config.py              ← Config LinkedIn, IA, agendamento, status tokens
│       │   ├── profile.py             ← Perfil do usuário + upload de PDF
│       │   └── search_urls.py         ← URLs de busca configuráveis
│       │
│       ├── scrapers/
│       │   ├── indeed.py              ← Scraper Indeed (Selenium, SEM login)
│       │   ├── linkedin_jobs.py       ← Scraper LinkedIn Jobs (Selenium + login)
│       │   ├── linkedin_posts.py      ← Scraper LinkedIn Posts (Selenium + Keys.PAGE_DOWN)
│       │   ├── login_helper.py        ← Helper login + cleanup_chrome_processes()
│       │   ├── coletar_tudo.py        ← Orquestrador de coleta
│       │   ├── coleta_bruta.py        ← Coleta raw sem processamento IA
│       │   ├── analisar_brutos.py     ← Análise pós-coleta
│       │   ├── analisar_com_ia.py     ← Análise com Claude API
│       │   ├── scheduler.py           ← Agendamento automático (APScheduler)
│       │   ├── cookies/
│       │   │   └── linkedin_cookies.json  ← Cookies LinkedIn (podem expirar!)
│       │   └── config/
│       │       ├── agendamento.json       ← Config de horários agendados
│       │       └── linkedin_credentials.json ← Credenciais LinkedIn
│       │
│       ├── services/
│       │   ├── ai_extractor.py        ← Extração Claude API + tracking de tokens
│       │   ├── job_matcher.py         ← Algoritmo de scoring/matching
│       │   └── default_profile.py     ← Perfil padrão do William
│       │
│       ├── audit/
│       │   ├── consolidador_gabarito.py    ← Consolida raw em gabarito (Parquet+JSON+DB)
│       │   ├── processar_com_auditoria.py  ← 8 estágios de transformação com logging
│       │   └── validar_amostra.py          ← Validação por amostragem via Claude
│       │
│       └── migrations/
│           └── add_ai_fields.py       ← Migração para adicionar campos IA
│
└── frontend/
    ├── package.json
    ├── tailwind.config.js             ← Cores e tokens customizados do design system
    ├── vite.config.js
    │
    └── src/
        ├── App.jsx                    ← Roteamento principal (React Router)
        ├── main.jsx                   ← Entry point
        ├── index.css                  ← Design tokens globais (CSS variables)
        │
        ├── components/
        │   ├── Dashboard.jsx          ← Dashboard principal (29KB — componente central)
        │   ├── VagaCard.jsx           ← Card de vaga (redesenhado múltiplas vezes)
        │   ├── Filtros.jsx            ← Sidebar de filtros colapsável
        │   ├── LoadingScreen.jsx      ← Tela de carregamento com health checks e auto-retry
        │   ├── ScrapingProgress.jsx   ← Modal SSE scraping em tempo real (34KB)
        │   ├── SkeletonVagaCard.jsx   ← Loading skeleton do card
        │   ├── SkeletonStatCard.jsx   ← Loading skeleton do StatCard
        │   ├── SchedulerConfig.jsx    ← Configuração de agendamento automático
        │   ├── layout/
        │   │   ├── Layout.jsx         ← Wrapper com sidebar push layout
        │   │   └── Sidebar.jsx        ← Sidebar colapsável (estilo ChatGPT)
        │   └── ui/
        │       ├── Badge.jsx          ← Badges multi-variante com cores
        │       ├── StatCard.jsx       ← Cards de KPIs com trend indicator
        │       ├── PeriodoSelector.jsx ← Seletor rápido de período (1D/7D/30D...)
        │       └── DateRangePicker.jsx ← Seletor de intervalo de datas (modal)
        │
        ├── pages/
        │   ├── Match.jsx              ← Analytics + gráficos (Recharts)
        │   ├── Perfil.jsx             ← Perfil do usuário + gestão de skills
        │   └── Configuracoes.jsx      ← Config LinkedIn, IA tokens, URLs, Scheduler
        │
        ├── contexts/
        │   ├── ThemeContext.jsx        ← Light/Dark mode com persistência localStorage
        │   └── SidebarContext.jsx      ← Estado global da sidebar
        │
        └── services/
            └── api.js                 ← Chamadas HTTP (axios) + todos os services
```

---

## 🗄️ BANCO DE DADOS

### Models (SQLAlchemy)
**Vaga** — tabela principal
- id, titulo, empresa, fonte (indeed/linkedin_jobs/linkedin_posts)
- tipo_contrato (CLT/PJ/Freelancer/Estágio)
- modalidade (Remoto/Híbrido/Presencial)
- nivel (Junior/Pleno/Senior/Lead/Head)
- salario_min, salario_max, localizacao, descricao
- url, url_candidatura, contato_email, contato_perfil
- score_match (Float), status (pendente/aplicada/ignorada/favorita)
- criado_em, atualizado_em, data_publicacao
- haiku_calls, sonnet_calls, vision_calls (tracking de tokens)

**ConfiguracaoIA** — config e tracking de consumo
- saldo_inicial_usd, gasto_acumulado_usd, alerta_limite_usd
- haiku_calls, sonnet_calls, vision_calls
- gasto_haiku_usd, gasto_sonnet_usd, gasto_vision_usd
- Properties: saldo_disponivel, percentual_gasto, em_alerta

**UserProfile** — perfil do usuário
- nome, nivel, modalidade, tipo_contrato, nivel_ingles
- skills (JSON list), localizacao, cv_texto

### Conexão em Produção (Neon PostgreSQL)
```
postgresql://neondb_owner:npg_imcE8WQIJ5nd@ep-shiny-forest-aidp7er1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 📡 TODOS OS ENDPOINTS DA API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/vagas/` | Listar vagas com filtros |
| POST | `/api/vagas/` | Criar vaga manualmente |
| GET | `/api/vagas/{id}` | Obter vaga por ID |
| PATCH | `/api/vagas/{id}` | Atualizar vaga |
| PATCH | `/api/vagas/{id}/status` | Mudar status da vaga |
| POST | `/api/vagas/{id}/favoritar` | Toggle favorito |
| DELETE | `/api/vagas/{id}` | Deletar vaga |
| POST | `/api/vagas/{id}/gerar-pitch` | Gerar cold message com Sonnet |
| GET | `/api/stats/` | Estatísticas gerais |
| GET | `/api/stats/historico` | Histórico por período |
| GET | `/api/scraper/stream/v3` | **SSE** — Coleta em tempo real |
| GET | `/api/scraper/stream/auditoria` | **SSE** — Auditoria em tempo real |
| GET/POST | `/api/config/` | Configurações gerais |
| GET | `/api/config/ia/status` | Status tokens Claude em tempo real |
| POST | `/api/config/ia/sincronizar` | Sincronizar saldo real Anthropic |
| GET | `/api/config/agendamento` | Config agendamento |
| POST | `/api/config/agendamento` | Salvar config agendamento |
| GET/POST | `/api/profile/` | Perfil do usuário |
| POST | `/api/profile/upload-cv` | Upload de CV em PDF |
| GET/POST | `/api/search-urls/` | URLs de busca configuráveis |

---

## 🎨 DESIGN SYSTEM (Código)

### Tokens CSS (index.css)
```css
/* Light Mode */
--bg-primary: #f8fafc;      --text-primary: #0f172a;
--bg-secondary: #ffffff;    --text-secondary: #64748b;
--bg-tertiary: #f1f5f9;     --text-muted: #94a3b8;
--border: #e2e8f0;

/* Dark Mode */
--bg-primary: #0f0f12;      --text-primary: #ffffff;
--bg-secondary: #1a1a1f;    --text-secondary: #a1a1aa;
--bg-tertiary: #252529;     --text-muted: #71717a;
--border: #2e2e33;
```

### Accent Colors (tailwind.config.js)
```js
'accent-primary': '#6366f1',  // Indigo
'accent-success': '#22c55e',  // Green
'accent-warning': '#f59e0b',  // Amber
'accent-danger':  '#ef4444',  // Red
'accent-info':    '#06b6d4',  // Cyan
'accent-purple':  '#a855f7',  // Purple
```

### Tipografia
- Font: **Inter** (Google Fonts)
- Escala: 12px caption → 14px sm/button → 16px body → 20px h3 → 24px h2 → 28px h1 → 32px display
- Dark mode: class-based (`.dark` no `<html>`)

---

## 🤖 INTEGRAÇÃO COM IA (Claude API)

### Modelos e Usos
| Modelo | Uso | Custo aprox. |
|--------|-----|-------------|
| claude-haiku | Validação rápida (~100 tokens) | ~$0.001/vaga |
| claude-haiku | Extração completa (~250 tokens) | ~$0.002/vaga |
| claude-sonnet | Geração de cold messages | ~$0.01/msg |
| claude-vision | Análise de imagens de vagas | ~$0.005/img |

### Tracking de Consumo (implementado em `ai_extractor.py`)
- `_registrar_custo()` chamado após cada chamada à API
- Detecta modelo pelo nome (sonnet/haiku/vision)
- Atualiza `ConfiguracaoIA` no banco
- Alerta quando `saldo_disponivel <= alerta_limite_usd` ($2.00)
- Frontend faz polling: Configurações a cada 5s, Dashboard a cada 10s

### URLs de Busca Padrão
```
Indeed: https://br.indeed.com/empregos?q=UX&l=Brasil&sc=0kf%3Aattr%28DSQF7%29%3B&radius=25&fromage=1&lang=pt

LinkedIn Jobs: https://www.linkedin.com/jobs/search/?f_TPR=r86400&f_WT=2&keywords=ux&sortBy=R
```

---

## 🔄 FUNCIONALIDADES IMPLEMENTADAS (completo)

### ✅ Dashboard
- 5 abas: Todas / Indeed / LinkedIn Vagas / LinkedIn Posts / Destaques
- Filtros laterais colapsáveis (fonte, status, modalidade, inglês)
- Períodos: 1D, 3D, 1S, 1M, 3M, 6M, 1A
- Busca por texto
- Paginação com controles primeiro/último
- Opções: 6, 9, 12 vagas por página
- Ordenação por compatibilidade, data, etc.
- Modo grid e lista
- Alerta de créditos baixos de IA no topo
- Polling de status IA a cada 10s

### ✅ VagaCard
Os 10 campos obrigatórios exibidos:
1. Nome da empresa, 2. Título da vaga, 3. Tipo de contratação
4. Modalidade, 5. Localização, 6. Carga horária
7. Faixa salarial, 8. Área/departamento, 9. Nível, 10. Data de publicação

Botões por tipo de post:
- Post com link → "Ver Vaga"
- Post com email → "Copiar Email"
- Post com contato → "Ver Perfil"
- "Ver Post" (link ao post original)
- Coração (favoritar) — canto superior direito

### ✅ LoadingScreen
- 3 health checks: API → Database → Stats
- Auto-retry até 3 tentativas em erro de rede
- Auto-wake para servidores hibernados (Render free)
- Mensagens claras de erro com sugestões

### ✅ ScrapingProgress (Modal SSE)
- EventSource só abre ao clicar "Iniciar Coleta"
- Status em tempo real de cada fonte
- Contadores: vagas encontradas vs processadas
- 3 estágios reais de auditoria via SSE
- Botão para fechar manualmente

### ✅ SchedulerConfig
- Até 3 horários recorrentes configuráveis
- Toggle individual por horário
- Opção de auditoria por horário
- Indicador visual quando coleta automática ocorre

### ✅ Sistema de Auditoria
- Gabarito master: Parquet + JSON + DB
- 8 estágios de transformação com logging
- Validação por amostragem via Claude Haiku
- Tabelas: RegistroBruto, ProcessamentoAuditoria, ValidacaoAuditoria

### ✅ Tracking de Tokens IA
- Breakdown: Haiku / Sonnet / Vision
- Contadores de chamadas e gastos em USD por modelo
- Saldo disponível em tempo real
- Alerta visual (banner vermelho) quando crédito baixo

### ✅ Perfil do Usuário
- Upload de CV em PDF (lido via pdfplumber)
- Gestão de skills (chips removíveis)
- Nível, modalidade, tipo de contrato, inglês, localização
- Botão "Recalcular Scores" para reaplicar matching

### ✅ Páginas
- **Match/Analytics:** Gráficos Recharts, múltiplos períodos, insights
- **Configurações:** LinkedIn, URLs, pesos do matching, IA tokens, agendamento
- **Perfil:** Skills, upload CV, dados pessoais

### ✅ Deploy
- Frontend e Backend em produção no Render
- Deploy automático via push no GitHub
- Banco PostgreSQL gerenciado no Neon

---

## ❌ NÃO CONCLUÍDO — PENDÊNCIAS IMPORTANTES

### 1. 🎨 Design System no Figma — PARCIALMENTE FEITO
**Status:** Planejamento 100% concluído, implementação 0%
**O que foi feito:**
- Arquivo Figma "Vagas" criado (praticamente vazio)
- Plano completo documentado em `FIGMA_BUILD_CHECKLIST.md`
- Especificações em `FIGMA_IMPLEMENTATION_GUIDE.md`
- Estrutura JSON em `figma_setup_structure.json`
- 31 frames planejados em 6 páginas

**O que falta:**
- Criar as 6 páginas no Figma: [SYSTEM] Design System, [SCREENS] Dashboard, [SCREENS] User, [SCREENS] Analytics, [SCREENS] Settings, [SCREENS] Components
- Criar as 31 frames com todos os componentes
- Criar 15+ componentes reutilizáveis
- Criar variáveis de cores (light/dark)
- Criar estilos de tipografia

**Por que não foi concluído:**
Os tools de Figma Dev Mode MCP disponíveis são **read-only** (leitura/inspeção apenas). Não existe ferramenta para criar elementos via API/MCP. A criação precisa ser feita:
- Manualmente no Figma Desktop
- Via plugin Figma com capacidade de escrita
- Via Figma REST API com token (mas a REST API também é read-only para criação de frames)

**Como resolver no futuro:**
- Verificar se algum plugin Figma permite criação programática de frames/componentes
- Fazer manualmente seguindo o `FIGMA_BUILD_CHECKLIST.md` (7-10 horas estimadas)
- Aguardar evolução das ferramentas MCP do Figma com suporte a escrita
- Token Figma: disponível no painel de configurações da conta Figma (não commitar)

---

### 2. 🔗 Code Connect Figma ↔ Código
**Status:** Não iniciado
**O que é:** Mapear componentes Figma para componentes React (Badge.jsx → Badge do Figma)
**Depende de:** Design System no Figma concluído primeiro
**Como resolver:** Após criar o Design System, usar `mcp__Figma__add_code_connect_map`

---

### 3. 🔧 Setup do Mac Mini — PARCIALMENTE FEITO
**Status:** Script criado, não executado com sucesso ainda
**O que foi feito:**
- Script `setup_macmini.sh` criado e publicado no GitHub
- Remote Login ativado no Mac Mini
- Tentativa de conexão SSH falhou (stdin não é terminal)

**O que falta:**
- Usuário executar o script no Mac Mini via Terminal
- Verificar se Node.js e Python3 estão instalados no Mac Mini
- Clonar o repositório no Mac Mini

**Como resolver:**
```bash
# No Terminal do Mac Mini:
curl -fsSL https://raw.githubusercontent.com/Vieira-William/vagas-ux-platform/main/setup_macmini.sh | bash
```

---

### 4. 🔔 Notificações Push/Email
**Status:** Não iniciado
**Ideia:** Notificar por email/WhatsApp quando novas vagas forem coletadas
**Como resolver:** Integrar SendGrid (email) ou Twilio (WhatsApp)

---

### 5. 🧪 Testes Automatizados E2E
**Status:** Não iniciado (existe `backend/tests/` mas apenas relatório manual de QA)
**Como resolver:** Pytest para backend, Playwright/Cypress para frontend

---

### 6. 🔄 LinkedIn Jobs — Loop na Primeira Página
**Status:** Problema recorrente, corrigido múltiplas vezes mas pode voltar
**Sintoma:** Scraper para de navegar para outras páginas e fica em loop na primeira
**Causa:** LinkedIn muda a estrutura HTML dos botões de paginação
**Como resolver:** Revisar lógica de paginação em `linkedin_jobs.py` quando ocorrer

---

### 7. 📊 Sincronização Real com Saldo Anthropic
**Status:** Parcialmente implementado
**O que existe:** Endpoint `/api/config/ia/sincronizar` criado
**O que falta:** A API da Anthropic não tem endpoint público para consultar saldo em tempo real. O saldo mostrado é calculado internamente (saldo_inicial - gasto_acumulado)
**Como resolver:** Verificar se Anthropic lançou API de billing, ou manter cálculo interno

---

## 🐛 BUGS CONHECIDOS E HISTÓRICO DE FIXES

| Data | Problema | Causa | Solução |
|------|---------|-------|---------|
| Fev/2026 | Scraper coletava só 7 vagas | Sem scroll, só primeiro viewport | Implementar scroll + paginação |
| Fev/2026 | LinkedIn scroll não funcionava | `window.scrollTo()` bloqueado | Usar `Keys.PAGE_DOWN` no body |
| Fev/2026 | LinkedIn bloqueando com login | Detecção de bot | Perfil Chrome persistente |
| Fev/2026 | IA descartando vagas válidas | Prompt restritivo demais | Ampliar termos aceitos no prompt |
| Fev/2026 | CORS bloqueando frontend | Só tinha porta 5173 | Adicionar todas as portas ao `allow_origins` |
| Fev/2026 | Layout quebrando com sidebar | `pl-` vs `ml-` + overflow | `ml-16/56` + `min-w-0` + `w-full overflow-hidden` |
| Fev/2026 | Deploy falhando no Render | Python 3.13 incompatível | `.python-version: 3.11.0` |
| Fev/2026 | Auditoria durando 1 segundo | Timeout fake em vez de SSE real | Conectar ao endpoint SSE real |
| Fev/2026 | Schema DB com colunas faltando | Modelo alterado sem migração | Deletar DB e recriar via `create_all()` |
| 26/02/2026 | Deploy falhando no Render | `pdfplumber` e `requests` fora do requirements.txt | Adicionar ao requirements.txt |

---

## 📅 HISTÓRICO COMPLETO DE DECISÕES

| Data | Decisão | Motivo |
|------|---------|--------|
| Fev/2026 | FastAPI como backend | Simplicidade, performance, auto-docs |
| Fev/2026 | SQLite local → PostgreSQL Neon | SQLite perde dados ao reiniciar no Render |
| Fev/2026 | Indeed sem login | LinkedIn bloqueava Selenium com login no Jobs |
| Fev/2026 | Keys.PAGE_DOWN para scroll | `window.scrollTo/By()` bloqueado pelo LinkedIn |
| Fev/2026 | Claude Haiku para extração | Mais barato que Sonnet, qualidade suficiente |
| Fev/2026 | Claude Sonnet para cold messages | Qualidade superior necessária para mensagens |
| Fev/2026 | Tailwind + CSS custom properties | Flexibilidade para dark/light mode |
| Fev/2026 | Render para deploy | Plano gratuito, integração GitHub automática |
| Fev/2026 | SSE para progresso em tempo real | WebSockets mais complexo, SSE suficiente |
| Fev/2026 | APScheduler para agendamento | Integrado ao FastAPI sem serviço externo |
| Fev/2026 | Perfil Chrome persistente | Manter login LinkedIn entre coletas |
| Fev/2026 | Auditoria em 3 estágios via SSE | Feedback visual granular para o usuário |
| Fev/2026 | Tracking de tokens por modelo | Controle de gastos granular Haiku/Sonnet/Vision |
| Fev/2026 | Figma Dev Mode MCP | Tentativa de criar Design System programaticamente |
| 26/02/2026 | Mac Mini adicionado ao workflow | Trabalho paralelo em dois dispositivos |
| 26/02/2026 | pdfplumber adicionado | Leitura de CV em PDF no perfil do usuário |
| 26/02/2026 | CLAUDE.md criado | Memória persistente entre sessões |

---

## 🔑 VARIÁVEIS DE AMBIENTE

### Backend (Render)
```
ANTHROPIC_API_KEY=<configurada no dashboard do Render — não commitar>
DATABASE_URL=<configurada no dashboard do Render — não commitar>
PYTHON_VERSION=3.11.0
```

### Frontend (Render)
```
VITE_API_URL=https://vagas-api-cbar.onrender.com
```

---

## 🔧 COMO RODAR LOCALMENTE

```bash
# Backend
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger)

# Frontend (outro terminal)
cd frontend
npm run dev
# → http://localhost:5173

# Login LinkedIn (quando cookies expirarem)
cd backend && source venv/bin/activate
python3 fazer_login.py
```

---

## ⚙️ RENDER — DEPLOY

- **Trigger:** Automático a cada push na branch `main`
- **Blueprint:** `render.yaml` na raiz
- **Build backend:** `pip install -r requirements.txt`
- **Start backend:** `gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
- **Frontend:** Static Site apontando para `frontend/` com `npm run build`

---

## 📝 REGRAS DO PROJETO

1. **Responder sempre em Português Brasileiro**
2. **Ler este arquivo no início de toda sessão** — sem exceção
3. **Atualizar este arquivo** a cada nova decisão, fix ou funcionalidade
4. **Não commitar sem testar** o impacto no deploy do Render
5. **Sempre fazer git pull antes** de trabalhar em qualquer dispositivo
6. **Cookies do LinkedIn podem expirar** — rodar `fazer_login.py` quando necessário
7. **Monitorar gastos da API Claude** via `/api/config/ia/status`
8. **Verificar requirements.txt** sempre que adicionar um novo import Python

---

## 🔮 PRÓXIMOS PASSOS SUGERIDOS

1. **Completar setup do Mac Mini** — rodar o script no Terminal
2. **Criar Design System no Figma** — seguir `FIGMA_BUILD_CHECKLIST.md` manualmente (7-10h)
3. **Notificações** — email/WhatsApp para novas vagas
4. **Testes E2E** — Pytest + Playwright
5. **Resolver loop LinkedIn Jobs** — monitorar e corrigir quando ocorrer
6. **Upgrade Render** — plano pago elimina hibernação do servidor
