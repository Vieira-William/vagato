# PRD v7 — Observabilidade: Setup Completo

## Data: 04 de março de 2026
## Status: ✅ CONCLUÍDO

---

## Serviços Configurados

| Serviço | Projeto | URL |
|---------|---------|-----|
| Sentry (Frontend) | vagas-frontend | https://ux-smart.sentry.io/projects/vagas-frontend/ |
| Sentry (Backend) | vagas-backend | https://ux-smart.sentry.io/projects/vagas-backend/ |
| PostHog | Vagas UX | https://app.posthog.com |
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
- [x] Backend: `/health/deep` endpoint criado
- [x] Backend: `/debug-sentry` endpoint criado (remover após confirmar em prod)
- [x] DSN Frontend configurado em `frontend/.env`
- [x] DSN Backend configurado em `backend/.env`
- [ ] Teste de erro: confirmar no Sentry dashboard após deploy em prod

---

## PostHog

- [x] SDK `posthog-js` instalado
- [x] `src/lib/posthog.js` criado
- [x] `initPostHog()` chamado em `main.jsx`
- [x] `identifyUser()` / `resetPostHog()` integrados em `AuthContext.jsx`
- [x] `trackEvent` inserido em `MatchPage.jsx` (vagas_carregadas, vagas_scraping_iniciado, vagas_scraping_concluido)
- [x] `trackEvent` inserido em `vaga-card.jsx` (vaga_status_alterado, vaga_favorito_alterado, vaga_aplicar_clicado)
- [x] `trackEvent` inserido em `CopyRow.jsx` (arsenal_campo_vazio_clicado, arsenal_campo_copiado, arsenal_link_aberto)
- [x] `VITE_POSTHOG_KEY` configurado em `frontend/.env`
- [ ] Teste: verificar eventos no PostHog Activity após deploy em prod

---

## BetterStack (Uptime)

- [x] Conta criada — team: t510878
- [x] Monitor 1 — Frontend: https://vagas-frontend.onrender.com (ID: 4131366)
- [x] Monitor 2 — API Health: https://vagas-api-cbar.onrender.com/health (ID: 4131394)
- [x] Monitor 3 — DB Health: https://vagas-api-cbar.onrender.com/health/deep (ID: 4131400)
- [x] Todos: check interval 3 min, alerta por e-mail
- [x] Status Page criada: https://vagas-ux.betteruptime.com (ID: 239533)
- [x] Status Page com os 3 monitores na estrutura

---

## Variáveis de Ambiente para o Render (Produção — PENDENTE DO USUÁRIO)

Adicionar manualmente no Render Dashboard (Settings > Environment):

```
# ── Backend (Web Service: vagas-api-cbar) ──
SENTRY_DSN=<copiar de backend/.env>
SENTRY_AUTH_TOKEN=<copiar de backend/.env>
ENVIRONMENT=production
APP_VERSION=0.1.0

# ── Frontend (Static Site: vagas-frontend) ──
VITE_SENTRY_DSN=<copiar de frontend/.env>
SENTRY_AUTH_TOKEN=<copiar de backend/.env>
VITE_POSTHOG_KEY=<copiar de frontend/.env>
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

---

## Arquivos Criados/Modificados

| Arquivo | Ação |
|---------|------|
| `docs/OBSERVABILITY_SETUP.md` | CRIADO |
| `frontend/src/lib/sentry.js` | CRIADO |
| `frontend/src/lib/posthog.js` | CRIADO |
| `frontend/src/main.jsx` | MODIFICADO |
| `frontend/src/components/common/ErrorBoundary.jsx` | MODIFICADO |
| `frontend/src/contexts/AuthContext.jsx` | MODIFICADO |
| `frontend/vite.config.js` | MODIFICADO |
| `frontend/.env` | MODIFICADO (DSNs reais) |
| `frontend/.env.example` | CRIADO |
| `backend/requirements.txt` | MODIFICADO |
| `backend/app/main.py` | MODIFICADO |
| `backend/app/middleware/sentry_middleware.py` | CRIADO |
| `backend/.env` | MODIFICADO (DSNs reais) |
| `backend/.env.example` | MODIFICADO |

---

## TODOs Pós-Deploy

- [ ] Adicionar variáveis no Render Dashboard (backend + frontend)
- [ ] Confirmar que `GET /debug-sentry` retorna 500 e aparece no Sentry dashboard
- [ ] Verificar eventos no PostHog Activity
- [ ] Confirmar 3 monitors verdes no BetterStack
- [ ] Remover endpoint `/debug-sentry` do `backend/app/main.py`
