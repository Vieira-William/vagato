# CLAUDE.md — Contexto Completo do Projeto
> **LEIA ESTE ARQUIVO SEMPRE AO INICIAR UMA SESSÃO.**
> Ele contém todas as decisões, configurações e contexto crítico do projeto.
> Atualize-o a cada nova decisão importante tomada.

---

## 🏗️ O QUE É ESTE PROJETO

**Nome:** Vagas UX Platform
**Objetivo:** Plataforma pessoal de agregação de vagas de emprego para UX/UI Designer com coleta automática, análise por IA (Claude), scoring de match e geração de cold messages.
**Dono:** William Marangon
**Status:** Em desenvolvimento ativo

---

## 🌐 LINKS CRÍTICOS — NUNCA ESQUECER

| Serviço | URL | Status |
|---------|-----|--------|
| **Frontend (online)** | https://vagas-frontend.onrender.com/ | ✅ Live |
| **Backend API (online)** | https://vagas-api-cbar.onrender.com | ✅ Live |
| **Repositório GitHub** | https://github.com/Vieira-William/vagas-ux-platform | ✅ Público |
| **Figma Design System** | https://figma.com/design/46upQ0yYDHuJqssvTT4Pxp/Vagas | 🎨 Em criação |
| **Render Dashboard** | https://dashboard.render.com | ⚙️ Deploy |

> ⚠️ O plano **gratuito** do Render faz o servidor dormir após inatividade. Na primeira visita demora ~60s para acordar. Se o deploy falhar, verificar `requirements.txt`.

---

## 💻 DISPOSITIVOS DE TRABALHO

| Dispositivo | Hostname | Usuário |
|-------------|----------|---------|
| **MacBook Air (notebook)** | MacBook-Air-de-William.local | williammarangon |
| **Mac Mini** | Williams-Mac-mini.local | mactrabalho |

**Acesso Remoto:** Remote Login ativado no Mac Mini (SSH disponível)
**Rede:** Mesmos dispositivos na mesma rede local
**Conta Claude:** A mesma conta está logada em ambos os dispositivos

**Workflow entre dispositivos:**
```bash
# Antes de começar a trabalhar em qualquer dispositivo
git pull origin main

# Ao terminar
git add .
git commit -m "mensagem"
git push origin main
```

---

## 📁 ESTRUTURA DO PROJETO

```
vagas-ux-platform/
├── backend/                    # FastAPI + Python
│   ├── app/
│   │   ├── main.py            # Entry point FastAPI
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── crud.py            # Operações de banco de dados
│   │   ├── database.py        # Conexão DB
│   │   ├── config.py          # Configurações globais
│   │   ├── api/               # Endpoints da API
│   │   │   ├── vagas.py       # CRUD vagas
│   │   │   ├── stats.py       # Estatísticas
│   │   │   ├── scraper.py     # Coleta de vagas (SSE)
│   │   │   ├── config.py      # Configurações IA, LinkedIn, URLs
│   │   │   ├── profile.py     # Perfil do usuário
│   │   │   └── search_urls.py # URLs de busca
│   │   ├── scrapers/          # Coletores de vagas
│   │   │   ├── indeed.py      # Coleta do Indeed
│   │   │   ├── linkedin_jobs.py # LinkedIn Jobs
│   │   │   ├── linkedin_posts.py # LinkedIn Posts
│   │   │   ├── coletar_tudo.py  # Orquestrador
│   │   │   └── scheduler.py   # Agendamento automático
│   │   ├── services/          # Serviços de negócio
│   │   │   ├── ai_extractor.py  # Integração Claude API (tracking de tokens)
│   │   │   ├── job_matcher.py   # Algoritmo de scoring
│   │   │   └── default_profile.py
│   │   └── audit/             # Sistema de auditoria de vagas
│   ├── requirements.txt       # Dependências Python
│   └── tests/                 # Testes e relatórios QA
├── frontend/                  # React + Vite + Tailwind
│   ├── src/
│   │   ├── App.jsx            # Roteamento principal
│   │   ├── index.css          # Design tokens (CSS vars)
│   │   ├── components/
│   │   │   ├── Dashboard.jsx  # Dashboard principal (29KB)
│   │   │   ├── VagaCard.jsx   # Card de vaga
│   │   │   ├── Filtros.jsx    # Sidebar de filtros
│   │   │   ├── ScrapingProgress.jsx # Modal de coleta SSE (34KB)
│   │   │   ├── SchedulerConfig.jsx  # Config agendamento
│   │   │   ├── layout/        # Layout, Sidebar
│   │   │   └── ui/            # Badge, StatCard, DateRangePicker
│   │   ├── pages/
│   │   │   ├── Match.jsx      # Analytics / Gráficos
│   │   │   ├── Perfil.jsx     # Perfil do usuário + skills
│   │   │   └── Configuracoes.jsx # Config LinkedIn, IA, URLs, Scheduler
│   │   ├── contexts/
│   │   │   ├── ThemeContext.jsx  # Light/Dark mode
│   │   │   └── SidebarContext.jsx
│   │   └── services/
│   │       └── api.js         # Chamadas HTTP (axios)
│   ├── tailwind.config.js     # Cores e tokens customizados
│   └── package.json
├── render.yaml                # Config deploy Render (backend)
├── CLAUDE.md                  # ← ESTE ARQUIVO (contexto do projeto)
├── FIGMA_IMPLEMENTATION_GUIDE.md  # Especificações do Design System
├── FIGMA_BUILD_CHECKLIST.md       # Checklist passo a passo do Figma
├── figma_setup_structure.json     # Estrutura JSON das páginas Figma
└── setup_macmini.sh               # Script de setup no Mac Mini
```

---

## 🛠️ STACK TECNOLÓGICA

### Backend
- **FastAPI** 0.109.0 — Framework Python
- **SQLAlchemy** 2.0.25 — ORM
- **SQLite** (dev) / **PostgreSQL** (produção via Render)
- **Anthropic Claude API** — Extração e análise de vagas com IA
- **Selenium** — Scraping de vagas
- **APScheduler** — Agendamento automático de coletas
- **Gunicorn + Uvicorn** — Servidor de produção

### Frontend
- **React 19** + **Vite**
- **Tailwind CSS 3** com modo dark/light via CSS custom properties
- **Lucide React** — Ícones
- **Recharts** — Gráficos
- **Axios** — HTTP client

### Deploy
- **Render.com** — Backend (Python) e Frontend (Static Site)
- **GitHub** — Repositório e trigger de deploy automático

---

## 🎨 DESIGN SYSTEM

### Cores (CSS Custom Properties)
```
Light Mode:
  --bg-primary: #f8fafc    --text-primary: #0f172a
  --bg-secondary: #ffffff  --text-secondary: #64748b
  --bg-tertiary: #f1f5f9   --text-muted: #94a3b8
  --border: #e2e8f0

Dark Mode:
  --bg-primary: #0f0f12    --text-primary: #ffffff
  --bg-secondary: #1a1a1f  --text-secondary: #a1a1aa
  --bg-tertiary: #252529   --text-muted: #71717a
  --border: #2e2e33

Accent Colors:
  Primary (Indigo): #6366f1   Success (Green): #22c55e
  Warning (Amber):  #f59e0b   Danger (Red):    #ef4444
  Info (Cyan):      #06b6d4   Purple:          #a855f7
```

### Tipografia
- Font: **Inter**
- Escala: 12px (caption) → 14px (body sm/button) → 16px (body) → 20px (h3) → 24px (h2) → 28px (h1) → 32px (display)

### Figma
- Arquivo criado: **"Vagas"** (vazio inicialmente, Design System a ser construído)
- Plano completo em: `FIGMA_BUILD_CHECKLIST.md`
- 31 frames planejados em 6 páginas
- Status: **Planejamento concluído, implementação pendente**

---

## 🔑 CONFIGURAÇÕES E CREDENCIAIS

### Anthropic Claude API
- Integração via `backend/app/services/ai_extractor.py`
- Tracking de consumo de tokens por modelo (Haiku / Sonnet / Vision)
- Modelos usados: `claude-haiku` (extração), `claude-sonnet` (cold messages), Vision (imagens)
- Alerta configurado quando saldo < $2 USD
- Endpoint: `GET /api/config/ia/status` — retorna consumo em tempo real

### LinkedIn Scraping
- Credenciais configuradas via: `backend/app/scrapers/config/linkedin_credentials.json`
- Selenium + Chrome Profile para manter sessão
- Cookies: `backend/app/scrapers/cookies/linkedin_cookies.json`

### Render Deploy
- Backend: `render.yaml` na raiz do projeto
- Frontend: configurado direto no dashboard do Render (Static Site)
- Deploy automático a cada push na branch `main`

---

## 📡 ENDPOINTS PRINCIPAIS DA API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/vagas/` | Listar vagas com filtros |
| GET | `/api/stats/` | Estatísticas gerais |
| GET/POST | `/api/config/` | Configurações do sistema |
| GET | `/api/config/ia/status` | Status tokens Claude API |
| POST | `/api/config/ia/sincronizar` | Sincronizar saldo real Anthropic |
| GET | `/api/scraper/stream/v3` | **SSE** — Coleta de vagas em tempo real |
| GET | `/api/scraper/stream/auditoria` | **SSE** — Auditoria em tempo real |
| GET/POST | `/api/profile/` | Perfil do usuário |
| GET/POST | `/api/search-urls/` | URLs de busca |

---

## 🔄 FUNCIONALIDADES IMPLEMENTADAS

### ✅ Concluído
- [x] Coleta automática de vagas (Indeed, LinkedIn Jobs, LinkedIn Posts)
- [x] Análise e extração com Claude IA (haiku/sonnet/vision)
- [x] Scoring de match de vagas com perfil do usuário
- [x] Geração de cold messages personalizadas
- [x] Dashboard com filtros e visualização em grid/lista
- [x] Sistema de auditoria de vagas (SSE streaming)
- [x] Agendamento automático de coletas (APScheduler)
- [x] Tracking de consumo de tokens por modelo (real-time)
- [x] Alertas de créditos baixos (Dashboard + Configurações)
- [x] Tema Light/Dark mode com CSS variables
- [x] Sidebar retrátil + navegação entre páginas
- [x] Página de Perfil com gestão de skills
- [x] Página de Analytics/Match com gráficos (Recharts)
- [x] Página de Configurações (LinkedIn, URLs, Pesos, IA, Scheduler)
- [x] Deploy no Render (Frontend + Backend)

### 🔄 Em andamento
- [ ] Design System no Figma (planejado, não implementado)
- [ ] Setup do Mac Mini (script criado, aguardando execução)

### 📋 Backlog
- [ ] Code Connect Figma ↔ código
- [ ] Testes automatizados E2E
- [ ] Notificações por email/WhatsApp para novas vagas

---

## 🐛 PROBLEMAS CONHECIDOS E SOLUÇÕES

### Deploy Render falha
**Causa comum:** Dependência usada no código mas não está no `requirements.txt`
**Solução:** Adicionar ao `requirements.txt` e fazer push
**Histórico de fixes:**
- `pdfplumber==0.11.0` — adicionado em 26/02/2026 (estava sendo importado em `profile.py`)
- `requests==2.31.0` — adicionado em 26/02/2026

### Servidor "dorme" no Render (plano gratuito)
**Sintoma:** Site demora ~60s para abrir na primeira visita
**Causa:** Render free tier hiberna serviços sem uso
**Solução:** Aguardar (normal), ou contratar plano pago

### Banco de dados vazio após schema change
**Causa:** Mudanças no modelo SQLAlchemy sem migração
**Solução:** Deletar `/data/vagas.db` e recriar com `Base.metadata.create_all()`

### Conflito de merge entre dispositivos
**Causa:** Editar o mesmo arquivo em notebook e Mac Mini sem sincronizar
**Solução:** Sempre `git pull` antes de começar, sempre `git push` ao terminar

---

## 📅 HISTÓRICO DE DECISÕES

| Data | Decisão | Motivo |
|------|---------|--------|
| Fev/2026 | FastAPI + SQLite/PostgreSQL | Simplicidade + escalabilidade |
| Fev/2026 | Claude API para extração | Melhor qualidade de dados estruturados |
| Fev/2026 | Tailwind + CSS vars | Flexibilidade para dark/light mode |
| Fev/2026 | Render.com para deploy | Plano gratuito, fácil integração com GitHub |
| Fev/2026 | SSE para coleta real-time | Feedback visual durante scraping |
| Fev/2026 | Tracking de tokens por modelo | Controle de gastos com IA |
| Fev/2026 | Figma Dev Mode MCP | Design System sincronizado com código |
| 26/02/2026 | Mac Mini adicionado ao workflow | Trabalho paralelo notebook + Mac Mini |
| 26/02/2026 | pdfplumber adicionado ao requirements | Leitura de CV em PDF no perfil |

---

## 🔧 COMO RODAR LOCALMENTE

### Backend
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload
# Acesso: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm run dev
# Acesso: http://localhost:5173
```

### Variáveis de Ambiente (Backend)
```bash
ANTHROPIC_API_KEY=sua-chave-aqui
DATABASE_URL=postgresql://... (produção) ou sqlite:///./data/vagas.db (dev)
```

### Variáveis de Ambiente (Frontend)
```bash
VITE_API_URL=https://vagas-api-cbar.onrender.com (produção)
# ou vazio para usar http://localhost:8000 (dev)
```

---

## 📝 NOTAS IMPORTANTES

1. **Este arquivo deve ser lido no início de cada sessão** para manter contexto
2. **Sempre atualizar** este arquivo quando uma nova decisão for tomada
3. O projeto usa **SQLite em desenvolvimento** e **PostgreSQL em produção** (Render)
4. O **deploy é automático** a cada push na branch `main`
5. O **Figma token** é pessoal — não commitar no repositório
6. Os **cookies do LinkedIn** podem expirar e precisar de renovação
7. A **API do Claude** tem custo real — monitorar via `/api/config/ia/status`
