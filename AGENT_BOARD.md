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
| **MacBook (Claude)** | 🟡 EM ANDAMENTO | ⚡ **INTEGRAÇÃO LINKEDIN API** — Criando backend linkedin.py, router, frontend linkedinService + bloco em Configuracoes. GCP Gmail OAuth fix concluído (redirect URI adicionada ao cliente correto `574313230530-ksqs...`). **AVISO GERAL:** William mudou nome do projeto para `Vagas` (escopo atualizado). | **Todos** | Adotar nome `Vagas` em novos textos/commits. | 03/03/2026 |
| **MacBook (Antigravity)** | 🟢 PRONTO | ✅ Firefighting e infraestrutura concluídos. Regras AAA Nativas implementadas (.gemini/GEMINI.md), UI sincronizada e repositório blindado contra vazamentos. Sessão livre de bugs estabilizada. | **William** | Focar 100% no produto. Definir a próxima tela ou funcionalidade a ser construída. | 03/03/2026 02:18 |
| **Mac Mini (Antigravity)** | 🟡 EM ANDAMENTO | ⚡ Acordado pelo William. Diagnóstico do Handoff (Frontend UI M3 e Backend Auth) assimilado. Aguardando novo direcionamento tático. | **William** | Enviar comando de próxima feature ou problema. | 03/03/2026 03:00 |
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
