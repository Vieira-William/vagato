# ARCHITECTURE_SAAS.md — Arquitetura Escalável do Vagato

> ⚠️ **LEITURA OBRIGATÓRIA PARA TODOS OS AGENTES**
> Este arquivo é o mapa vivo da arquitetura SaaS do Vagato.
> Deve ser lido no início de toda sessão (junto com CLAUDE.md e AGENT_BOARD.md).
> **REGRA DE OURO:** Qualquer agente que avançar um item do checklist deve:
> 1. Marcar `[ ]` → `[x]` neste arquivo
> 2. Registrar o que fez no AGENT_CHAT.md com Post-Mortem técnico
> Nenhuma feature de infra/multi-tenancy/scraping deve ser implementada sem antes consultar este documento.

---

## 🎯 VISÃO DO PRODUTO

**Vagato** é uma plataforma SaaS de agregação e inteligência de vagas de emprego para **qualquer profissional**, em qualquer área de atuação. O produto agrega vagas de múltiplas fontes (scrapers + APIs públicas + extensão Chrome), classifica com IA e entrega um feed personalizado baseado no perfil de cada usuário.

> ⚠️ **ATENÇÃO AGENTES — ERRO RECORRENTE:**
> O produto **NÃO É e NUNCA FOI um nicho de UX/Design**. Não referenciar "UX Designer", "Product Designer" ou qualquer profissão específica como público-alvo. O usuário William corrigiu este erro múltiplas vezes. O produto serve **qualquer pessoa** buscando emprego.

**Target atual:** 5 → 10 → 50 → 100 usuários (crescimento progressivo)
**Modelo:** Free + Pro + Ultimate (já implementado no DB)
**Filosofia de custo:** Gastar zero agora, reinvestir receita em infra conforme crescimento

---

## 🔑 DECISÕES ARQUITETURAIS FIXADAS

> Estas decisões não devem ser questionadas ou revertidas sem aprovação explícita do William.

| Decisão | Detalhe |
|---------|---------|
| **Pool de vagas GLOBAL** | Uma coleta serve todos. Vagas são compartilhadas. Scoring é calculado individualmente por perfil. |
| **Produto GERAL** | Qualquer profissão, qualquer usuário. Sem nicho. |
| **Multi-tenancy via Supabase JWT** | `_user["sub"]` (UUID Supabase) → `UserProfile.supabase_user_id` |
| **Scraping multi-fonte** | Selenium (Indeed) + APIs gratuitas (Jooble, Adzuna) + Apify (estágio 3) + Chrome Extension (estágio 3) |
| **Queue assíncrona** | RQ/Celery + Redis (apenas estágio 2+). Estágio 1 usa APScheduler síncrono |
| **Economia máxima** | Cada estágio usa o mínimo de infra. Só escala quando a receita justificar |

---

## 🏗️ DIAGRAMA DE COMPONENTES

### Estágio 1 (Atual → 5-10 users)
```
[Frontend React — Render Static]
        ↓ Bearer JWT (Supabase)
[API FastAPI — Render Free (hiberna)]
        ↓
[APScheduler — coleta global síncrona]
   ├─ Indeed (Selenium)
   ├─ Jooble API (gratuito)
   └─ Adzuna API (gratuito)
        ↓
[PostgreSQL Neon Free]
```

### Estágio 2 (10-50 users)
```
[Frontend React — Render Static]
        ↓ Bearer JWT
[API FastAPI — Render Starter (sempre ligado)]
        ↓ enqueue
[Redis (Upstash Free)]
        ↓ consume
[Worker Celery — Render Starter]
   ├─ Indeed (Selenium)
   ├─ Jooble API
   ├─ Adzuna API
   ├─ JSearch / RapidAPI (free tier)
   └─ SerpApi (100 searches/mês grátis)
        ↓
[PostgreSQL Neon Launch]
```

### Estágio 3 (50-100 users)
```
[Frontend React] + [Chrome Extension]
        ↓ Bearer JWT
[API FastAPI — Render Standard]
        ↓ enqueue
[Redis (Upstash Pro)]
        ↓ consume
[Worker Celery — Render Standard]
   ├─ Indeed (Selenium)
   ├─ LinkedIn Jobs (Apify Actor)
   ├─ LinkedIn Posts (Chrome Extension → POST /api/extension/vagas)
   ├─ Jooble API
   ├─ Adzuna API
   ├─ JSearch RapidAPI
   └─ SerpApi
        ↓
[PostgreSQL Neon Pro]
        ↑
[Rate Limiting por Plano (Free/Pro/Ultimate)]
```

---

## 💰 TABELA DE CUSTOS POR ESTÁGIO

| Serviço | Estágio 1 | Estágio 2 | Estágio 3 |
|---------|-----------|-----------|-----------|
| Render (API) | Free ($0) | Starter ($7) | Standard ($25) |
| Render (Worker) | — | Starter ($7) | Standard ($25) |
| Redis (Upstash) | — | Free ($0) | Pro ($7) |
| PostgreSQL (Neon) | Free ($0) | Launch ($19) | Pro ($69) |
| Supabase Auth | Free ($0) | Free ($0) | Pro ($25) |
| Apify (LinkedIn) | — | — | ~$10-20 |
| JSearch (RapidAPI) | — | Free ($0) | Basic ($10) |
| SerpApi | — | Free ($0) | Hobby ($50) |
| **TOTAL** | **$0/mês** | **~$33/mês** | **~$130-170/mês** |

> 💡 **Trigger de upgrade:** Só avançar de estágio quando houver receita suficiente pagando o próximo nível.
> Estágio 1 → 2: quando tiver 5+ usuários ativos pagando qualquer plano
> Estágio 2 → 3: quando tiver 20+ usuários ativos ou scraping falhando por carga

---

## 🔐 MULTI-TENANCY — MAPA DE MUDANÇAS

### Estado Atual (SINGLE-TENANT)
```
candidaturas.py  → FIXED_USER_ID = 2 (11 endpoints)   🔴
mensagens.py     → FIXED_USER_ID = 2 (50+ linhas)     🔴
whatsapp.py      → FIXED_USER_ID = 2 (6 endpoints)    🔴
profile.py       → is_active flag (sem user_id)        🟡
vagas.py         → sem filtro (global — OK ✅)         ✅
search_urls.py   → sem user_id (global — mudar)        🟡
match_weights.py → sem user_id (global — mudar)        🟡
```

### Estado Alvo (MULTI-TENANT)

#### 1. Migração de banco (Alembic)
```sql
-- Adicionar campo em UserProfile
ALTER TABLE user_profiles ADD COLUMN supabase_user_id VARCHAR UNIQUE;
-- Adicionar user_id em SearchUrl e MatchWeights (opcional estágio 2)
ALTER TABLE search_urls ADD COLUMN user_id INTEGER REFERENCES user_profiles(id);
ALTER TABLE match_weights ADD COLUMN user_id INTEGER REFERENCES user_profiles(id);
```

#### 2. Helper central (criar: `backend/app/api/_auth_helpers.py`)
```python
from app.models import UserProfile
from sqlalchemy.orm import Session

def get_profile_id(db: Session, user: dict) -> int:
    """Resolve Supabase UUID → UserProfile.id. Cria perfil se não existir."""
    sub = user["sub"]
    profile = db.query(UserProfile).filter(
        UserProfile.supabase_user_id == sub
    ).first()
    if not profile:
        profile = UserProfile(
            supabase_user_id=sub,
            email=user.get("email", ""),
            is_active=True,
            onboarding_completed=False,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile.id
```

#### 3. Padrão de uso nos endpoints
```python
# ANTES (errado)
FIXED_USER_ID = 2
candidaturas = db.query(Candidatura).filter(Candidatura.user_id == FIXED_USER_ID).all()

# DEPOIS (correto)
from app.api._auth_helpers import get_profile_id
user_profile_id = get_profile_id(db, _user)
candidaturas = db.query(Candidatura).filter(Candidatura.user_id == user_profile_id).all()
```

---

## 🕷️ FONTES DE SCRAPING — DETALHES

### Fontes Gratuitas (disponíveis desde o estágio 1)

#### Jooble API
- **Docs:** https://br.jooble.org/api/
- **Custo:** Gratuito (precisa solicitar API key)
- **Retorno:** JSON com título, empresa, localização, descrição, link, salário
- **Rate limit:** Não documentado, conservador: 10 req/min
- **Arquivo a criar:** `backend/app/scrapers/jooble.py`

#### Adzuna API
- **Docs:** https://developer.adzuna.com/
- **Custo:** Gratuito (app_id + app_key)
- **Endpoint:** `GET https://api.adzuna.com/v1/api/jobs/br/search/1?app_id=X&app_key=Y&what=...&where=...`
- **Retorno:** JSON com 20 resultados por página
- **Rate limit:** 250 req/dia (free)
- **Arquivo a criar:** `backend/app/scrapers/adzuna.py`

### Fontes Estágio 2+

#### JSearch via RapidAPI
- **Docs:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- **Custo:** Free (10 req/min, 200 req/mês) → Basic $10/mês (500/mês)
- **Vantagem:** Agrega Indeed + LinkedIn + Glassdoor em 1 endpoint
- **Arquivo a criar:** `backend/app/scrapers/jsearch.py`

#### SerpApi
- **Docs:** https://serpapi.com/google-jobs-api
- **Custo:** Free (100 searches/mês) → Hobby $50/mês (5000/mês)
- **Vantagem:** Google Jobs — enorme cobertura
- **Arquivo a criar:** `backend/app/scrapers/serpapi_jobs.py`

### Fontes Estágio 3

#### Apify — LinkedIn Jobs
- **Actor:** `curious_coder/linkedin-jobs-scraper`
- **SDK:** `pip install apify-client`
- **Custo:** ~$0.002/resultado (pay-per-use)
- **Vantagem:** Sem manutenção de Selenium, sem ban de IP
- **Arquivo a criar:** `backend/app/scrapers/apify_linkedin.py`

#### Chrome Extension — LinkedIn Posts
- **Router existente:** `/api/extension/` (já tem infraestrutura básica)
- **Fluxo:** Usuário instala extensão → faz login com Supabase → extensão lê posts do feed → POST /api/extension/vagas com JWT
- **Arquivo a criar:** `frontend-extension/` (novo diretório, Manifest V3)
- **Autenticação:** Supabase JS SDK dentro da extensão

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

> Legenda: `[ ]` Pendente | `[~]` Em progresso | `[x]` Concluído | `[!]` Bloqueado

---

### 🔴 FASE 1 — Multi-Tenancy (Crítico — Estágio 1)

**Objetivo:** Qualquer usuário que criar conta vê seus próprios dados, isolados dos demais.

#### 1.1 Banco de Dados
- [ ] Criar migração Alembic: `add_supabase_user_id_to_profiles`
- [ ] Adicionar `supabase_user_id VARCHAR UNIQUE` em `UserProfile`
- [ ] Rodar migração em desenvolvimento (SQLite)
- [ ] Rodar migração em produção (Neon PostgreSQL)

#### 1.2 Helper de Auth
- [ ] Criar `backend/app/api/_auth_helpers.py`
- [ ] Implementar `get_profile_id(db, user_dict) → int`
- [ ] Testar criação automática de perfil para novo Supabase user

#### 1.3 candidaturas.py
- [ ] Remover `FIXED_USER_ID = 2`
- [ ] Substituir em `get_board()` (linha ~108)
- [ ] Substituir em `get_stats()` (linha ~127)
- [ ] Substituir em `obter_candidatura()` (linha ~146)
- [ ] Substituir em `criar_candidatura()` (linha ~177)
- [ ] Substituir em `mover_candidatura()` (linha ~218)
- [ ] Substituir em `atualizar_candidatura()` (linha ~252)
- [ ] Substituir em `arquivar_candidatura()` (linha ~276)
- [ ] Substituir em `get_timeline()` (linha ~305)
- [ ] Substituir em `adicionar_nota()` (linha ~329)
- [ ] Testar isolamento: user A não vê candidaturas de user B

#### 1.4 mensagens.py
- [ ] Remover `FIXED_USER_ID = 2`
- [ ] Substituir em `_seed_email_templates()`
- [ ] Substituir em todos os endpoints de EmailSignature
- [ ] Substituir em todos os endpoints de UserEmailTemplate
- [ ] Substituir em todos os endpoints de EmailDraft
- [ ] Substituir em todos os endpoints de MensagemConversa
- [ ] Testar isolamento: user A não vê emails de user B

#### 1.5 whatsapp.py
- [ ] Remover `FIXED_USER_ID = 2`
- [ ] Substituir em `_get_or_create_prefs()`
- [ ] Substituir em `/verify/send`
- [ ] Substituir em `/verify/confirm`
- [ ] Substituir em `/disconnect`
- [ ] Testar com 2 usuários distintos

#### 1.6 profile.py
- [ ] Mudar lógica de busca de `is_active == True` → `supabase_user_id == _user["sub"]`
- [ ] Garantir que PATCH /profile/ salva no perfil correto do usuário logado

#### 1.7 Teste de Integração E2E
- [ ] Criar 2 contas Supabase de teste
- [ ] Verificar que candidaturas, mensagens, preferências WhatsApp são 100% isoladas
- [ ] Documentar resultado no AGENT_CHAT.md

---

### 🟡 FASE 2 — Fontes de Vagas Gratuitas (Estágio 1)

**Objetivo:** Ampliar base de vagas sem custo adicional.

#### 2.1 Jooble API
- [ ] Solicitar API key em https://br.jooble.org/api/
- [ ] Adicionar `JOOBLE_API_KEY` no .env e Render dashboard
- [ ] Criar `backend/app/scrapers/jooble.py`
- [ ] Integrar em `coletar_tudo.py` como nova fonte
- [ ] Testar: retornar ≥ 50 vagas por coleta
- [ ] Adicionar fonte='jooble' no model Vaga

#### 2.2 Adzuna API
- [ ] Criar conta em https://developer.adzuna.com/
- [ ] Adicionar `ADZUNA_APP_ID` e `ADZUNA_APP_KEY` no .env
- [ ] Criar `backend/app/scrapers/adzuna.py`
- [ ] Integrar em `coletar_tudo.py`
- [ ] Testar: retornar ≥ 30 vagas por coleta (250 req/dia limite free)
- [ ] Adicionar fonte='adzuna' no model Vaga

---

### 🟡 FASE 3 — Queue Assíncrona (Estágio 2 — 10-50 users)

**Trigger:** Começar quando ≥ 5 usuários ativos pagantes ou scraping travando API.

#### 3.1 Setup Celery + Redis
- [ ] Adicionar ao requirements.txt: `celery[redis]`, `redis`
- [ ] Criar conta Upstash Redis (free tier): https://upstash.com
- [ ] Adicionar `REDIS_URL` no .env e Render dashboard
- [ ] Criar `backend/app/workers/__init__.py`
- [ ] Criar `backend/app/workers/celery_app.py` (config + autodiscover)
- [ ] Criar `backend/app/workers/tasks/__init__.py`

#### 3.2 Migrar Scraping para Tasks
- [ ] Criar `backend/app/workers/tasks/scraping.py`
  - [ ] Task `coletar_indeed()` (migrado de APScheduler)
  - [ ] Task `coletar_jooble()`
  - [ ] Task `coletar_adzuna()`
  - [ ] Task `coletar_jsearch()`
- [ ] Criar `backend/app/workers/tasks/scoring.py`
  - [ ] Task `recalcular_scores_usuario(user_id)`
- [ ] Criar `backend/app/workers/beat_schedule.py` (Celery Beat — horários)

#### 3.3 Migrar APScheduler
- [ ] Remover APScheduler do startup de main.py
- [ ] Substituir por publicação de tasks no Redis ao iniciar
- [ ] Criar `render.yaml` Worker service apontando para Celery worker

#### 3.4 Adicionar JSearch e SerpApi
- [ ] Criar conta RapidAPI + assinar JSearch free
- [ ] Adicionar `RAPIDAPI_KEY` no .env
- [ ] Criar `backend/app/scrapers/jsearch.py`
- [ ] Criar conta SerpApi free
- [ ] Adicionar `SERPAPI_KEY` no .env
- [ ] Criar `backend/app/scrapers/serpapi_jobs.py`
- [ ] Integrar ambos como tasks Celery

---

### 🔵 FASE 4 — Scoring por Usuário (Estágio 2)

**Objetivo:** Cada usuário vê scores baseados no seu próprio perfil, não no perfil padrão.

- [ ] Modificar `GET /vagas/` para receber `_user` e carregar perfil do usuário logado
- [ ] Calcular `score_compatibilidade` on-the-fly usando `JobMatcher(perfil_usuario)`
- [ ] Remover score hard-coded no banco para vagas (ou manter como cache — avaliar perf)
- [ ] Garantir que `POST /config/recalcular-scores` aplica apenas para o usuário logado
- [ ] Testar: user A (Dev) e user B (Marketing) veem scores diferentes para a mesma vaga

---

### 🔵 FASE 5 — Rate Limiting por Plano (Estágio 2-3)

- [ ] Instalar `slowapi` (`pip install slowapi`)
- [ ] Criar middleware de verificação de plano em `backend/app/middleware/plan_check.py`
- [ ] Regras por plano:
  - [ ] Free: máx 5 coletas manuais/dia, 50 vagas visíveis, sem cold messages
  - [ ] Pro: coletas ilimitadas, todas as vagas, cold messages incluídas
  - [ ] Ultimate: tudo do Pro + alertas WhatsApp + prioridade na fila de scraping
- [ ] Retornar 402 com mensagem de upgrade quando limite atingido
- [ ] Frontend: capturar 402 e exibir modal de upgrade

---

### 🔵 FASE 6 — Apify + Chrome Extension (Estágio 3)

**Trigger:** Começar quando ≥ 20 usuários ativos ou LinkedIn sendo bloqueado.

#### 6.1 Apify — LinkedIn Jobs
- [ ] Criar conta Apify + adicionar créditos ($10 inicial)
- [ ] Adicionar `APIFY_API_TOKEN` no .env
- [ ] Instalar `apify-client` no requirements.txt
- [ ] Criar `backend/app/scrapers/apify_linkedin.py`
- [ ] Integrar como task Celery com fonte='apify_linkedin'
- [ ] Monitorar custo: max $20/mês em Apify

#### 6.2 Chrome Extension — LinkedIn Posts
- [ ] Criar `frontend-extension/` (novo diretório na raiz)
- [ ] Manifest V3 com permissões: `tabs`, `activeTab`, `scripting`, `storage`
- [ ] Content script para ler posts do feed LinkedIn
- [ ] Background service worker: autenticação Supabase + POST /api/extension/vagas
- [ ] Expandir `/api/extension/vagas` endpoint para receber payload de vagas
- [ ] Instrução de instalação: link direto (sem Chrome Web Store inicialmente)

---

### 🔵 FASE 7 — Observabilidade + Admin (Estágio 3)

- [ ] Criar tabela `ScrapingJob` (job_id, fonte, status, vagas_novas, vagas_dup, erro, duration, created_at)
- [ ] Registrar cada coleta em ScrapingJob
- [ ] Exibir histórico de coletas no Admin Dashboard
- [ ] Alertas de falha de scraping: se 3 coletas seguidas falharem → email admin
- [ ] Métricas Celery no admin dashboard (tasks enfileiradas, workers ativos, etc.)
- [ ] Sentry já ativo ✅ — verificar alertas por email configurados

---

## 📅 ROADMAP DE EXECUÇÃO

```
AGORA (Estágio 1 — $0/mês)
├── FASE 1: Multi-tenancy (CRÍTICO — sem isso não existe produto multi-user)
└── FASE 2: Jooble + Adzuna (ampliar vagas sem custo)

COM 5+ USERS PAGANTES (Estágio 2 — ~$33/mês)
├── FASE 3: Celery + Redis + JSearch + SerpApi
└── FASE 4: Scoring por usuário

COM 20+ USERS ATIVOS (Estágio 3 — ~$130-170/mês)
├── FASE 5: Rate limiting por plano
├── FASE 6: Apify + Chrome Extension
└── FASE 7: Observabilidade completa
```

---

## 🛑 VARIÁVEIS DE AMBIENTE NECESSÁRIAS (por estágio)

### Estágio 1 (adicionar ao .env agora)
```
JOOBLE_API_KEY=<solicitar em br.jooble.org/api>
ADZUNA_APP_ID=<criar em developer.adzuna.com>
ADZUNA_APP_KEY=<criar em developer.adzuna.com>
```

### Estágio 2 (adicionar quando migrar para queue)
```
REDIS_URL=<Upstash Redis URL>
RAPIDAPI_KEY=<criar em rapidapi.com>
SERPAPI_KEY=<criar em serpapi.com>
```

### Estágio 3 (adicionar quando escalar)
```
APIFY_API_TOKEN=<criar em apify.com>
```

---

## 📌 NOTAS PARA AGENTES

1. **Prioridade absoluta:** FASE 1 (Multi-tenancy) antes de qualquer outra feature. Sem isso, o produto não é SaaS.

2. **Não implementar Celery antes de ter 5 users pagantes.** APScheduler global é suficiente para o estágio 1 e não custa nada.

3. **Não contratar Apify antes de ter 20 users.** Selenium/APIs gratuitas cobrem a necessidade inicial.

4. **Ao completar qualquer item do checklist:**
   - Marque `[ ]` → `[x]` neste arquivo
   - Registre no AGENT_CHAT.md com: o que fez, como testou, armadilhas encontradas

5. **Nunca alterar decisões arquiteturais sem aprovação explícita do William.** Dúvidas → perguntar no chat.

6. **O nicho é GERAL.** Não citar "UX", "Design" ou qualquer profissão específica como público-alvo em nenhum arquivo do projeto.

---

*Última atualização: 08/03/2026 — Antigravity (IA)*
*Próxima ação prioritária: FASE 1 — Multi-Tenancy (remover FIXED_USER_ID)*

---

## 🗣️ DISCUSSÃO DOS AGENTES (Post-Mortem & Análise Crítica)

> **Antigravity (08/03/2026):** Após revisão profunda da arquitetura SaaS frente ao código em máquina local, trago as minhas certezas e alertas (RED FLAGS) sobre o estado atual do software para debater com o William e demais IAs.

### ✅ Certezas Arquiteturais (O que está muito bem feito)
1. **Scraping Global vs Per-User:** A decisão de manter o `pool` de vagas global (uma coleta serve a todos, `vagas.py` sem filtro de `user_id`) é a fundação da escalabilidade. Evita banimentos de API, poupa o banco (Neon) e ciclo de CPU. O cálculo de pontuação (Match Score) individual (`scoring`) garante personalização mantendo infra centralizada.
2. **Escalonamento por Trigger Financeiro:** A filosofia de custo listada (Estágio 1 a 3) é brilhante para *bootstrapping*. Rodar FastAPI no Render Free/Starter e reter o enfileiramento por Celery até os primeiros 5-10 usuários pagantes poupará $20-$30/mês na decolagem.
3. **Múltiplos Motores de Crawl:** Intercalar APIs orgânicas (Jooble/Adzuna) com Selenium (Indeed) e estruturar endpoints para Apify/Chrome Ext. reduz bruscamente a dependência em um único funil que bloqueie CAPTCHA repentinamente.

### 🔴 Problemas e Riscos Críticos "Escondidos" na Estrutura
1. **O Risco Explícito de Transbordamento de Dados (`FIXED_USER_ID = 2` e `is_active == True`):**
   - **O Problema:** Os controllers em `candidaturas.py`, `mensagens.py` e `whatsapp.py` interceptam registros injetando o `user_id = 2` (provavelmente do William). Se outro usuário entrar no app, não só ele lerá as vagas preferidas, recados e rascunhos de email do William, como terá o poder de **ALTERÁ-LAS**. O controller `profile.py` baseia-se unicamente em `is_active == True`, logo o primeiro usuário no loop monopoliza as respostas do JSON no back-end.
   - **Providência Imutável:** A **Fase 1 (1.1, 1.2 e 1.3)** listada no Checklist precisa ocorrer **agora**. Em nenhuma circunstância o produto deve escalar o UX do Dashboard antes da autoridade por JWT Token (campo `sub` do Supabase).

2. **Cronjob Dormente no Render Free:**
   - **O Problema:** A arquitetura do Estágio 1 aponta um APScheduler **síncrono** na FastAPI de pé na Render. Todavia, contêineres grátis ou *web services* padrão "adormecem/hibernam" em 15 minutos sem tráfego HTTP. O agendamento morrerá junto com ele toda madrugada ou tarde e o site estagnará.
   - **Ação:** Converter uma rota da API em endpoint webhook (Ex: `/api/scraper/cron-trigger`) para ser acionada externamente (por ex., via `cron-job.org` ou Uptime Robot), forçando o contêiner do Render a se manter em *Wake-Up* enquanto deflagra o scraping *background task*.

3. **Parâmetros Universais Invadindo Outros Inquilinos:**
   - **O Problema:** Tabelas como `search_urls.py` e `match_weights.py` formatam pesos métricos do *ranking* da Inteligência Artificial. Elas não têm a FK `user_id`. Se eu configuro `Skills Mínimas = Peso 10`, esmago o ranking de quem não queria peso naquelas palavras. A tabela de parâmetros é única para todos.
   - **Ação:** Expandir a migração do Alembic da **Fase 1.1** exigindo não apenas a inserção do UUID do Supabase em `UserProfile`, mas a injeção da FK nas tabelas de config para isolamento completo do *tuning* da Plataforma.

4. **Autenticação "Ateísta" vs Nicho Universal (Onboarding Pela Metade):**
   - **O Problema:** Decidiu-se que a plataforma não tem nicho e agrupa qualquer profissão. Todavia, a captação universal é pautada por palavras-chave inseridas pelo usuário (Search Urls). Quando o Dev, o Contador e a Dentista criarem conta, eles terão o Dashboard vazio ou verão termos generalistas até entenderem como operar as _Search URLs_. Falta um fluxo declarativo onde ao se registrar: "Insira seu cargo". E no back-end a API cria o `UserProfile` e insere os registros base preenchidos na tabela de buscas para eles.
   - **Ação:** Modificar/Complementar a função do item **1.2 do Checklist `get_profile_id`**, passando a instanciar _Dummy/Base Configurations_ na criação remota para dar _kickstart_ de dados pro novo ocupante.
