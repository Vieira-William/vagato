# 🚦 Quadro de Status dos Agentes (AGENT_BOARD)

> **⚠️ REGRA CRÍTICA DE SINCRONIZAÇÃO:**
> Para evitar conflitos e o GAP de comunicação assíncrona, este arquivo funciona como nosso **Memory Lock**.
>
> 1. **MÁXIMO DE 1 STATUS POR AGENTE:** A tabela abaixo deve conter SOMENTE o exato status do momento de cada agente. Sem histórico.
> 2. **ANTES DE AGIR (Locking):** Mude seu status para 🟡 `EM ANDAMENTO` e descreva a tarefa exata.
> 3. **DEPOIS DE AGIR (Release):** Mude seu status para 🟢 `CONCLUÍDO` (ou 🔴 `BLOQUEADO` / `ERRO`) e indique o próximo passo e o agente esperado. NUNCA deixe um status em andamento "preso" após terminar.
> 4. **TRANSIÇÃO E CONFLITOS:** Ao iniciar uma nova tarefa, SOBREESCREVA sua linha anterior. Se o outro agente estiver em `EM ANDAMENTO` em um arquivo ou recurso que você precisa, PAUSE e aguarde ou busque outra tarefa que não gere conflitos.
> 5. **HISTÓRICO DE 1 SEMANA:** Cada agente DEVE manter um bloco `## 📋 Histórico (últimos 7 dias)` abaixo da tabela principal com registro das tarefas da semana. Formato: `[DATA] STATUS — Descrição`. Sem esse histórico, o contexto de sessões anteriores se perde.

---

## 🕒 Placar em Tempo Real

| Agente | Status Atual | Tarefa Ativa / Última Ação | Próximo Agente Esperado | Tarefa Sugerida (Próx Passo) | Última Atualização |
|--------|--------------|----------------------------|-------------------------|------------------------------|--------------------|
| **MacBook (Claude)** | 🟡 EM ANDAMENTO | 🔄 **RENAME: vagas-ux-platform → vagato** — Renomeando pasta local, repo GitHub, LaunchAgents e todos os paths hardcoded. Mac Mini: aguardem instruções no AGENT_CHAT após conclusão. | **Mac Mini** | Atualizar SMB mount + cron rsync após rename concluído. | 06/03/2026 |
| **MacBook (Antigravity)** | 🟢 CONCLUÍDO | ✅ Pagamentos E2E concluídos pelo MacBook Claude. SDKs integrados, endpoints funcionais. | **William** | Sem pendências neste agente. | 05/03/2026 |
| **Mac Mini (Antigravity)** | 🟡 AGUARDANDO | ✅ **PRD v17 (Alertas WhatsApp) CODIFICADO.** Backend (Models, Twilio SDK, Routers OTP) e Frontend (Soft UI, integração `whatsappApi.js`, Toggles de Match) implementados e compilados 100%. Aguardando William inserir e testar as credenciais do provedor (Twilio Verify/Messaging) na `.env` local. | **William** | Cadastrar e testar chaves do Twilio na porta 5173 e 8000. | 06/03/2026 |
| **Mac Mini (Claude/SENTINELA)** | 🟢 CONCLUÍDO | ✅ **GOOGLE CALENDAR PKCE FIX.** Resolvido bug crítico de `InvalidGrantError` (google-auth-oauthlib 1.3+ usa PKCE automático; solução: `_pending_flows` dict para preservar Flow entre login→callback). Token salvo, `isConnected: true`. Post-mortem detalhado no AGENT_CHAT. Próximo: commit + push. | **William** | Validar se alguma feature nova está pendente. | 02/03/2026 |

---

## 📋 Histórico Mac Mini (Antigravity) — últimos 7 dias

| Data | Status | Descrição |
|------|--------|-----------|
| 26/02/2026 | 🟢 CONCLUÍDO | Setup do Mac Mini: Homebrew, Python 3.11, Node v22, rsync watchdog. |
| 27/02/2026 | 🟢 CONCLUÍDO | FIGMA BRIDGE ONLINE! Servidor e plugin websocket funcionando. |
| 01/03/2026 | 🟢 CONCLUÍDO | Refinamento Visual v2: Micro-proporções, TopNav h-10, gap-3, shadow-soft imensa. |
| 02/03/2026 | 🟢 CONCLUÍDO | HERO 1:1 CONSOLIDADO! Colisão horizontal total entre pílulas. |
| 02/03/2026 | 🟢 CONCLUÍDO | Sessão iniciada às 12:50. Restauração de infraestrutura (Backend/Frontend) via Keep-Alive v2, ajuste de VITE_API_URL e resolução de conflitos de reinicialização. |
| 02/03/2026 | 🟢 CONCLUÍDO | **SMB MOUNT CONCLUÍDO!** Volume `/Volumes/vagas-ux-platform` montado e ativo. Python consegue acessar projeto. Pronto para desenvolvimento. |
| 02/03/2026 | 🟢 CONCLUÍDO | **SMB PERSISTENTE!** LaunchAgent `com.vagas.mount` instalado. Auto-monta no login, keepalive 30s via osascript. Sem sudo necessário. |
| 02/03/2026 | 🟢 CONCLUÍDO | **GOOGLE CALENDAR OAUTH PKCE FIX.** `_pending_flows` dict resolve `InvalidGrantError`. Token salvo. `isConnected: true`. Usuário de teste adicionado no GCP. |


---

## 📋 Histórico MacBook (Claude) — últimos 7 dias

| Data | Status | Descrição |
|------|--------|-----------|
| 28/02/2026 | 🟢 CONCLUÍDO | DS NATIVO 3.0 PAUSADO. Scripts SDK/CLI consolidados |
| 01/03/2026 | 🟢 CONCLUÍDO | Crextio Soft UI: FASES 1-5 (Layout, TopNav, Cards, Gráficos, Formulários) |
| 01/03/2026 | 🟢 CONCLUÍDO | Correções visuais: Sunbeam CSS puro, bg-white sólido, glassmorphism reduzido |
| 01/03/2026 | 🟢 CONCLUÍDO | Bento Grid Zero-Scroll: Analytics.jsx reconstruído, 7 cards, grid-cols-4, h-screen |
| 01/03/2026 | 🟢 CONCLUÍDO | Fix regressão TopNav: bg-white/70→/60 (5 pills), gap-4→3. Regra histórico AGENT_BOARD |
| 02/03/2026 | 🟢 CONCLUÍDO | CalendarCard Week View Soft UI: grid 1fr, all-day strip, "Semana livre" overlay, navegação semanas, EVT_PALETTES + AVATAR_BG |
| 03/03/2026 | 🟢 CONCLUÍDO | **LAYOUT SWITCHER DINÂMICO!** TopNav ↔ Glass Sidebar toggle com Framer Motion. Novos: NavigationShell.jsx, LogoPill.jsx, LayoutModeContext.jsx, useMediaQuery.js. Deletados: TopNav.jsx, Sidebar.jsx, SidebarContext.jsx. localStorage + mobile guard. |
| 03/03/2026 | 🟢 CONCLUÍDO | **LINKEDIN API COMPLETA.** App "Vagas" (UX Smart) criado no LinkedIn Dev Portal. Backend linkedin.py com OAuth2 full (login/callback/status/profile/share/disconnect). Produtos ativados: Share on LinkedIn + Sign In with OpenID Connect. Redirect URL configurado. .env com credenciais reais. GCP Gmail fix concluído. Build ✅, push 78ca8c0. |
| 05/03/2026 | 🟢 CONCLUÍDO | **ONBOARDING REDESIGN PRD v13.1.** sync_legacy_fields (backend), 5 steps, dots progress bar, slide transitions 300ms, ProfissoesStep (cards clicáveis + NIVEL_CARDS Duolingo), SkillsStep (sugestões contextuais), PreferenciasStep NOVO (ViaCEP + IBGE cascata + toggle pills), RevisaoStep (editável + completude), skeleton pós-onboarding. Fix overflow clip. 4 steps antigos deletados. Build ✅. |
| 05/03/2026 | 🟢 CONCLUÍDO | **CHROME EXTENSION FASE 1 — FUNDAÇÃO.** Backend: JWT auth middleware + 4 endpoints (/extension/*) + ExtensionLog model + CORS. Extension MV3: Vite multi-entry, service-worker, popup React (login + status + perfil), shared modules. npm run build ✅. |
| 05/03/2026 | 🟢 CONCLUÍDO | **CHROME EXTENSION FASE 2 — PIPELINE COMPLETO.** profile-mapper (20+ campos), Layer1 (atributos HTML), Layer2 (labels+proximidade), field-detector, form-filler (React-safe), adaptadores Gupy/LinkedIn/Greenhouse/Lever/Indeed/Generic, overlay Shadow DOM (FloatingBanner+ReviewPanel editável), content/main.ts orquestrador. Build ✅ 63 módulos. |
| 06/03/2026 | 🟢 CONCLUÍDO | **PRD v16 — DARK MODE DO APP PRINCIPAL.** 4 Fases: CSS variables, ThemeContext 3 estados, 8 componentes deglassificados, Layout gradiente condicional. Build ✅ zero erros. Commit e5cef26. |
| 06/03/2026 | 🟢 CONCLUÍDO | **PRD v19 — QA TOTAL: 47 issues.** 6 Fases: JWT Supabase, UX funcional (sliders/dark/mobile), 35+ acentos PT-BR, admin pages, 404, title, DB indexes. 6 builds limpos. Verificação visual completa. Commit 2e79c4e. |
