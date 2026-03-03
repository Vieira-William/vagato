---
paths:
  - "backend/**"
  - "frontend/**"
  - "CLAUDE.md"
  - "AGENT_BOARD.md"
  - "AGENT_CHAT.md"
---

# 🚨 VAGAS UX PLATFORM — RULES CRÍTICAS DO PROJETO

## ⚡ WAKE-UP PROTOCOL (OBRIGATÓRIO) E SINCRONIA MÁXIMA

**ANTES de fazer QUALQUER coisa:**

1. ✅ Ler **CLAUDE.md** inteiro (estrutura + links críticos)
2. ✅ Ler **AGENT_BOARD.md** (quem está fazendo o quê AGORA)
3. ✅ Ler **AGENT_CHAT.md** (últimas entradas — contexto fresco)
4. ✅ Executar `git pull origin main` (Sem PULL, não digite código!)

**Sistema:** Context Lock no SessionStart (.claude/hooks/enforce-context-lock.sh)
- Bloqueia até você confirmar leitura
- Lock válido 1 hora após ler
- Sem "yes" = ❌ Bloqueado

---

## 🚫 REGRA ABSOLUTA DE DIVERGÊNCIA DE UI (INCIDENTE 03/03)
Tivemos um incidente grave onde o Claude MacBook e o Antigravity Mac Mini geraram interfaces divergentes para os mesmos componentes (TopNav e CalendarCard).
**NUNCA MAIS:**
1. Reescreva componentes inteiros aprovados pelo usuário (ex: trocar lista minimalista por week view complexa) sem expressa e inequívoca aprovação para MUDANÇA ARQUITETURAL.
2. Não ignore as classes de Soft UI, gaps e tamanhos do Tailwind estabelecidas na branch `main`.
3. Se o código no seu ambiente local (ex: via SMB ou cópia defasada) aparentar não ter as classes de UI atuais, faça um PULL imediato antes de editá-lo. Trabalhar em versões defasadas corrompe a UI de toda a plataforma.

---

## 🤖 IDENTIDADE DOS AGENTES

| Nome | Plataforma | Máquina | Path | Função |
|------|-----------|--------|------|--------|
| **Sirius** 💫 | Antigravity | MacBook | `/Users/williammarangon/...` | Figma Bridge, Design System |
| **Orion** 🌟 | Antigravity | Mac Mini | `/Users/mactrabalho/...` | Limpeza, audit, SMB |
| **Vega** ⭐ | Claude | MacBook | `/Users/williammarangon/...` | Servidores, debug, CORS |
| **Sentinela** 🫡 | Claude | Mac Mini | `/Users/mactrabalho/...` | Testes, Figma execution |

**⚠️ REGRA:** Nunca altere o trabalho de outro agente. Se vir erro, REPORTE e peça para o outro corrigir sua própria parte.

---

## 📡 MEMORY LOCK (AGENT_BOARD.md)

**REGRA OBRIGATÓRIA:**

1. Ao iniciar tarefa → Mude seu status para `🟡 EM ANDAMENTO`
2. Ao terminar → Mude para `🟢 CONCLUÍDO`
3. Máximo 1 status por agente na tabela
4. Se bloqueado → Use `🔴 BLOQUEADO` + descreva

**Nunca** deixe uma tarefa presa como "Em Andamento" sem conclusão.

---

## 🎨 DESIGN SYSTEM — MATERIAL 3 PURO

**REGRA ABSOLUTA:**

❌ **NUNCA adivinhe design** baseado em "conhecimento genérico"
✅ **SEMPRE extraia specs** via MCP do Node oficial M3 Kit

**Fonte Oficial:**
https://www.figma.com/design/IC9a5wdK1mIy6BRUw4uQb8/Material-3-Design-Kit--Community-?node-id=11-1833&m=dev

**Processo:**
1. Abrir M3 Design Kit no Figma Desktop
2. Usar `mcp__Figma__get_metadata` ou `get_design_context` no Node `11:1833`
3. Extrair: Tokens, Variants, Booleans, Nomenclaturas
4. Só então implementar no projeto

**O M3 Design Kit é a Bíblia Absoluta.** Sem exceção.

---

## 🔧 STACK OBRIGATÓRIO

### Backend
- **Framework:** FastAPI 0.109.0
- **ORM:** SQLAlchemy 2.0.25
- **Validação:** Pydantic 2.5.3
- **Banco:** PostgreSQL (Neon) em prod, SQLite local
- **Python:** 3.11.0 (forçado em `.python-version`)
- **IA:** Claude API (Haiku/Sonnet/Vision)
- **Scraping:** Selenium 4.17.2
- **Scheduler:** APScheduler 3.10.4

### Frontend
- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.4
- **Estilos:** Tailwind CSS 3.4.19
- **Ícones:** Lucide React 0.563.0
- **Gráficos:** Recharts 3.7.0
- **HTTP:** Axios 1.13.4

### Deploy
- **Backend:** Render (Web Service)
- **Frontend:** Render (Static Site)
- **Banco:** Neon PostgreSQL
- **Repositório:** GitHub (deploy automático via push main)

---

## 🔐 SEGURANÇA

1. **Nunca commitar:** `.env`, `.env.*`, `secrets/`, `.claude/settings.local.json`
2. **Sempre usar:** Environment variables para dados sensíveis
3. **Validar:** Todo input do usuário
4. **Bloquear:** Acesso a `.env` nos settings.json (deny rules)
5. **CORS:** Já configurado para `localhost:5173`, `127.0.0.1:5173`, `5174`, `5175`, `3000`

---

## 📝 GIT WORKFLOW

```bash
# ANTES de trabalhar
git pull origin main

# DURANTE
git add [arquivos específicos]
git commit -m "Descrição clara (use português)"

# APÓS TERMINAR
git push origin main
# → Deploy automático no Render!
```

**NUNCA:**
- `git push --force` (bloqueado em permissions, a não ser como último recurso absoluto de restauro)
- Commitar sem testar localmente
- Deixar `.env` staged

---

## 🚀 SERVIDORES LOCAIS

### Backend FastAPI
```bash
cd backend
source venv_macbook/bin/activate
python -m uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger)
```

### Frontend Vite
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

### Figma Bridge (WebSocket)
```bash
cd backend
source venv_macbook/bin/activate
python scripts/figma_server.py
# → ws://localhost:9999
```

---

## 💰 MONITORAR CUSTOS

- **Endpoint:** GET `/api/config/ia/status`
- **Rastreamento:** Breakdown por modelo (Haiku/Sonnet/Vision)
- **Alerta:** Quando saldo < $2.00
- **Frontend:** Polling a cada 10s no Dashboard

**Modelos:**
- claude-haiku: Extração rápida (~$0.002/vaga)
- claude-sonnet: Cold messages (~$0.01/msg)
- claude-vision: Análise de imagens (~$0.005/img)

---

## 📋 ANTES DE FAZER COMMIT

Checklist obrigatório:

- [ ] Li CLAUDE.md para link críticos?
- [ ] Dei `git pull origin main` ANTES de codar?
- [ ] Testei localmente (npm run dev + uvicorn)?
- [ ] Arquivos sensíveis (`.env`, `.claude/settings.local.json`) **NÃO** foram staged?
- [ ] requirements.txt atualizado (se Python)?
- [ ] package.json atualizado (se Node)?
- [ ] Sem `console.log` ou `print()` de debug?
- [ ] Atualizei CLAUDE.md (se mudança arquitetural)?
- [ ] Documentei em AGENT_CHAT.md (se descoberta importante)?

---

## 🔄 PRÓXIMOS PASSOS DO PROJETO

1. ✅ Design System no Figma — PARCIALMENTE (Dashboard + Configuracoes criados)
2. ⏳ Code Connect (Figma ↔ React)
3. ⏳ Notificações (email/WhatsApp)
4. ⏳ Testes E2E (Pytest + Playwright)
5. ⏳ Resolver loop LinkedIn Jobs
6. ⏳ Upgrade Render (plano pago)

---

## 🚨 BUGS CONHECIDOS

| Bug | Sintoma | Solução |
|-----|---------|---------|
| LinkedIn loop página 1 | Scraper não pagina | Revisar `linkedin_jobs.py` |
| Cookies LinkedIn expiram | 401 Unauthorized | Rodar `python3 fazer_login.py` |
| Vite lag no /Volumes SMB | Reload lento | `usePolling: true` em vite.config.js |
| React-is missing | Vite crash | `npm install --legacy-peer-deps` |
| CORS 127.0.0.1 | Network Error | Já corrigido em `main.py` |
| Falha no Deploy Render | Vazou Chave da Anthropic | Coloquei .claude/settings.local.json no .gitignore |

---

## 📚 LINKS CRÍTICOS

| Recurso | URL |
|---------|-----|
| Frontend produção | https://vagas-frontend.onrender.com/ |
| Backend API produção | https://vagas-api-cbar.onrender.com |
| API Docs | https://vagas-api-cbar.onrender.com/docs |
| GitHub | https://github.com/Vieira-William/vagas-ux-platform |
| Figma (Vagas) | https://figma.com/design/46upQ0yYDHuJqssvTT4Pxp |
| Figma (M3 Kit) | https://www.figma.com/design/IC9a5wdK1mIy6BRUw4uQb8/Material-3-Design-Kit--Community- |
| Render Dashboard | https://dashboard.render.com |
| Neon Console | https://console.neon.tech |
| Anthropic Console | https://console.anthropic.com |

---

**ÚLTIMA ATUALIZAÇÃO:** 03/03/2026 01:45
**POR:** Antigravity MacBook 💫

Essas rules são OBRIGATÓRIAS para todos os agentes no projeto.
