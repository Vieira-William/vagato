# Observability Setup Log

## Data: 04 de março de 2026
## Status: Em andamento

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
- [x] Backend: `middleware/sentry_middleware.py` criado
- [x] Backend: `/health/deep` endpoint criado
- [x] Backend: `/debug-sentry` endpoint criado (REMOVER APÓS CONFIRMAR)
- [ ] DSN Frontend: [PENDENTE — preencher após criar conta Sentry]
- [ ] DSN Backend: [PENDENTE — preencher após criar conta Sentry]
- [ ] Teste de erro: [PENDENTE — verificar no dashboard Sentry]

---

## PostHog

- [x] SDK `posthog-js` instalado
- [x] `src/lib/posthog.js` criado
- [x] `initPostHog()` chamado em `main.jsx`
- [x] `identifyUser()` / `resetPostHog()` integrados em `AuthContext.jsx`
- [x] `trackEvent` inserido em pontos-chave (Match, Arsenal, Calendar)
- [ ] API Key: [PENDENTE — preencher após criar conta PostHog]
- [ ] Teste: eventos aparecendo no dashboard PostHog

---

## BetterUptime

- [ ] Conta criada
- [ ] Monitor 1 — Frontend: https://vagas-frontend.onrender.com (status: pendente)
- [ ] Monitor 2 — API Backend: https://vagas-api-cbar.onrender.com/health (status: pendente)
- [ ] Monitor 3 — Database: https://vagas-api-cbar.onrender.com/health/deep (status: pendente)
- [ ] Alertas configurados: email
- [ ] Status page criada: https://vagas-ux.betteruptime.com (pendente)

---

## Variáveis de Ambiente para o Render (Produção)

Copiar e colar no Render Dashboard (Settings > Environment):

```
# ── Backend (Web Service: vagas-api) ──
SENTRY_DSN=[PREENCHER COM DSN REAL DO BACKEND]
ENVIRONMENT=production
APP_VERSION=0.1.0

# ── Frontend (Static Site: vagas-frontend) ──
VITE_SENTRY_DSN=[PREENCHER COM DSN REAL DO FRONTEND]
SENTRY_AUTH_TOKEN=[PREENCHER COM AUTH TOKEN DO SENTRY]
VITE_POSTHOG_KEY=[PREENCHER COM API KEY DO POSTHOG]
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
| `frontend/.env` | MODIFICADO (placeholders) |
| `frontend/.env.example` | CRIADO |
| `backend/requirements.txt` | MODIFICADO |
| `backend/app/main.py` | MODIFICADO |
| `backend/app/middleware/sentry_middleware.py` | CRIADO |
| `backend/.env` | MODIFICADO (placeholders) |
| `backend/.env.example` | MODIFICADO |

---

## TODOs Pendentes

1. Preencher `VITE_SENTRY_DSN` no `frontend/.env` com o DSN real do projeto vagas-frontend no Sentry
2. Preencher `SENTRY_DSN` no `backend/.env` com o DSN real do projeto vagas-backend no Sentry
3. Preencher `VITE_POSTHOG_KEY` no `frontend/.env` com a API key do PostHog
4. Adicionar todas as variáveis acima no Render Dashboard para produção
5. Confirmar que `/debug-sentry` retorna 500 e aparece no Sentry, depois remover o endpoint
6. Verificar eventos no PostHog Activity após navegar na app
7. Confirmar 3 monitors verdes no BetterUptime
