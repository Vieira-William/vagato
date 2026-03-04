# PRD v7 — Observabilidade: Setup Completo

## Data: 04 de março de 2026
## Status: ✅ CONCLUÍDO E VERIFICADO EM PRODUÇÃO

---

## Serviços Configurados

| Serviço | Projeto | URL |
|---------|---------|-----|
| Sentry (Frontend) | vagas-frontend | https://ux-smart.sentry.io/projects/vagas-frontend/ |
| Sentry (Backend) | vagas-backend | https://ux-smart.sentry.io/projects/vagas-backend/ |
| PostHog | Default project | https://us.posthog.com/project/330868 |
| BetterStack | vagas-ux | https://uptime.betterstack.com/team/t510878 |
| Status Page pública | vagas-ux | https://vagas-ux.betteruptime.com |

---

## Sentry

- [x] Frontend: SDK `@sentry/react@10.42.0` já estava instalado
- [x] Frontend: `@sentry/vite-plugin` instalado
- [x] Frontend: `src/lib/sentry.js` criado
- [x] Frontend: `initSentry()` chamado em `main.jsx`
- [x] Frontend: `ErrorBoundary.jsx` integrado (`Sentry.captureException`)
- [x] Frontend: `AuthContext.jsx` integrado (`setSentryUser` / `clearSentryUser`)
- [x] Frontend: `vite.config.js` atualizado (sourcemap + sentryVitePlugin)
- [x] Backend: `sentry-sdk[fastapi]` adicionado ao `requirements.txt`
- [x] Backend: `main.py` refatorado (FastApiIntegration + environment + release)
- [x] Backend: `middleware/sentry_middleware.py` criado e registrado
- [x] Backend: `/health/deep` endpoint criado e funcionando
- [x] Backend: `/debug-sentry` endpoint criado, testado e **REMOVIDO** após confirmação
- [x] DSN Frontend configurado em `frontend/.env`
- [x] DSN Backend configurado em `backend/.env`
- [x] **CONFIRMADO em prod**: `ZeroDivisionError` capturado como `VAGAS-BACKEND-1` no Sentry

---

## PostHog

- [x] SDK `posthog-js` instalado
- [x] `src/lib/posthog.js` criado
- [x] `initPostHog()` chamado em `main.jsx` (antes do React)
- [x] `identifyUser()` / `resetPostHog()` integrados em `AuthContext.jsx`
- [x] `trackEvent` inserido em `MatchPage.jsx` (vagas_carregadas, vagas_scraping_iniciado, vagas_scraping_concluido)
- [x] `trackEvent` inserido em `vaga-card.jsx` (vaga_status_alterado, vaga_favorito_alterado, vaga_aplicar_clicado)
- [x] `trackEvent` inserido em `CopyRow.jsx` (arsenal_campo_vazio_clicado, arsenal_campo_copiado, arsenal_link_aberto)
- [x] `VITE_POSTHOG_KEY` e `VITE_POSTHOG_HOST` configurados no Render Frontend
- [x] Eventos de desenvolvimento confirmados no PostHog Activity (localhost)
- [x] Frontend rebuild com `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` adicionados → PostHog ativo em prod

---

## BetterStack (Uptime)

- [x] Conta criada — team: t510878
- [x] Monitor 1 — Frontend: https://vagas-frontend.onrender.com (ID: 4131366) 🟢 Up
- [x] Monitor 2 — API Health: https://vagas-api-cbar.onrender.com/health (ID: 4131394) 🟢 Up
- [x] Monitor 3 — DB Health: https://vagas-api-cbar.onrender.com/health/deep (ID: 4131400) 🟢 Recovering
- [x] Todos: check interval 3 min, alerta por e-mail
- [x] Status Page criada: https://vagas-ux.betteruptime.com (ID: 239533)
- [x] Status Page com os 3 monitores na estrutura

---

## Variáveis de Ambiente — Render (CONFIGURADAS EM PRODUÇÃO)

### Backend (Web Service: vagas-api-cbar)
| Variável | Status |
|----------|--------|
| `SENTRY_DSN` | ✅ configurado |
| `SENTRY_AUTH_TOKEN` | ✅ configurado |
| `ENVIRONMENT` | ✅ `production` |
| `APP_VERSION` | ✅ `0.1.0` |

### Frontend (Static Site: vagas-frontend)
| Variável | Status |
|----------|--------|
| `VITE_SENTRY_DSN` | ✅ configurado |
| `SENTRY_AUTH_TOKEN` | ✅ configurado |
| `VITE_POSTHOG_KEY` | ✅ configurado |
| `VITE_POSTHOG_HOST` | ✅ `https://us.i.posthog.com` |
| `VITE_SUPABASE_URL` | ✅ configurado (adicionado pós-deploy) |
| `VITE_SUPABASE_ANON_KEY` | ✅ configurado (adicionado pós-deploy) |

---

## Fixes de Produção Aplicados (pós-implementação)

Durante o deploy foram identificados e corrigidos:

| Commit | Fix |
|--------|-----|
| `86d09b8` | `frontend/.npmrc` com `legacy-peer-deps=true` (peer deps React 19) |
| `344f148` | `Badge.jsx` → `badge.jsx` (case-sensitive no Linux/Render) |
| `a9025a9` | `gunicorn` adicionado ao `requirements.txt` |
| `1e7738a` | `selenium` import condicional em `login_helper.py` |
| `aa0a60a` | `selenium` import condicional em `coleta_bruta.py` |
| `4ee15ed` | `pdfplumber` adicionado ao `requirements.txt` |
| `803d1bd` | Removido argumento `enabled=` inválido do `sentry_sdk.init()` |
| `372f399` | Removido endpoint `/debug-sentry` após confirmação |

---

## Arquivos Criados/Modificados

| Arquivo | Ação |
|---------|------|
| `docs/OBSERVABILITY_SETUP.md` | CRIADO |
| `frontend/.npmrc` | CRIADO (`legacy-peer-deps=true`) |
| `frontend/src/lib/sentry.js` | CRIADO |
| `frontend/src/lib/posthog.js` | CRIADO |
| `frontend/src/main.jsx` | MODIFICADO |
| `frontend/src/components/common/ErrorBoundary.jsx` | MODIFICADO |
| `frontend/src/contexts/AuthContext.jsx` | MODIFICADO |
| `frontend/vite.config.js` | MODIFICADO |
| `frontend/.env` | MODIFICADO (DSNs reais) |
| `frontend/.env.example` | CRIADO |
| `frontend/src/components/ui/badge.jsx` | RENOMEADO (era Badge.jsx) |
| `backend/requirements.txt` | MODIFICADO (gunicorn + pdfplumber) |
| `backend/app/main.py` | MODIFICADO (Sentry init + endpoints health) |
| `backend/app/middleware/sentry_middleware.py` | CRIADO |
| `backend/app/scrapers/login_helper.py` | MODIFICADO (selenium condicional) |
| `backend/app/scrapers/coleta_bruta.py` | MODIFICADO (selenium condicional) |
| `backend/.env` | MODIFICADO (DSNs reais) |
| `backend/.env.example` | MODIFICADO |

---

## Verificação Final (04/03/2026)

- [x] ✅ Backend Live em produção: `https://vagas-api-cbar.onrender.com/health` → `{"status":"healthy"}`
- [x] ✅ `/health/deep` → `{"status":"healthy","database":"connected","version":"0.1.0","environment":"production"}`
- [x] ✅ Sentry Backend: `VAGAS-BACKEND-1` capturado (ZeroDivisionError de /debug-sentry)
- [x] ✅ Sentry release `0.1.0` visível no dashboard
- [x] ✅ BetterStack: 2 monitores verdes, 1 em recovery
- [x] ✅ Frontend Live: `https://vagas-frontend.onrender.com`
- [x] ✅ PostHog: eventos de dev confirmados; prod ativo após rebuild com Supabase vars
