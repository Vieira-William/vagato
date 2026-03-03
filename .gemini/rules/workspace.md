# 📋 VAGAS UX PLATFORM — WORKSPACE RULES (NORMAS AAA)

**Atenção:** Estas regras são nativas do Workspace (Antigravity). Elas se sobrepõem e guiam a postura de todos os agentes que operam neste repositório.

## 1. COMUNICAÇÃO E POSTURA
* **Protocolo Pt-Br:** Toda e qualquer resposta, log, walkthrough ou commit deve ser estritamente em Português Brasileiro (pt-BR). Explicações profundas de processos complexos no chat são obrigatórias.
* **Transparência Absoluta:** Fim das mudanças silenciosas. É estritamente proibido alterar o código (especialmente de UI) sem documentar e justificar a ação.
* **Postura Operacional:** A execução deve ser analítica, cirúrgica e direta, sem floreios.

## 2. RADAR E MEMÓRIA (PROTOCOLO WAKE-UP)
* **PULL Obrigatório:** O `git pull origin main` DEVE ser o primeiro passo antes de alterar qualquer código local (vitão para evitar quebra de UI refatorada por outros agentes).
* **Leitura Obrigatória Pré-Ação:** ANTES de qualquer ação ou de propor alterações, o agente DEVE ler: `CLAUDE.md` (inteiro), `AGENT_BOARD.md` (inteiro) e os últimos eventos do `AGENT_CHAT.md`.
* **Lock de Tarefas:** No `AGENT_BOARD.md`, marque seu status como `🟡 EM ANDAMENTO` e logo ao fim para `🟢 CONCLUÍDO`. Nenhuma tarefa pode ficar travada. 
* **Visão Sistêmica e Propriedade:** NENHUM irmão de IA pode alterar diretamente a arquitetura ou design em progresso do outro no meio do fluxo sem prévio PULL e validação. Identificamos choque grave no TopNav/Calendar.

## 3. DESIGN SYSTEM E IDENTIDADE VISUAL
* **A Bíblia do Design Crextio/M3:** O design evolui rápido. Para QUALQUER alteração visual ou criação de componente, não adivinhe classes. Consulte OBRIGATORIAMENTE:
    1. `FIGMA_IMPLEMENTATION_GUIDE.md` (Especificações técnicas e tokens ativos)
    2. `FIGMA_BUILD_CHECKLIST.md` (Fluxo de construção de componentes)
    3. `frontend/src/index.css` (Variáveis e tokens de Soft UI do Modo Escuro e Claro já aplicados)
* **Integridade do Soft UI:** Use `shadow-soft`, cantos arredondados, pílulas e fontes sem serifa (Outfit) conformes com a estética Crextio 3.0 definida.

## 4. INFRAESTRUTURA E STACK
* **A Tríade (Stack Inegociável):** Backend: FastAPI (Python 3.11.0) | Frontend: React + Vite + TailwindCSS | DB: Neon PostgreSQL.
* **Ambiente Dual (MacBook + Mac Mini):** O projeto flui entre dois macs através do SMB ou `origin main`. O Backend no Mac Mini roda na :8000 e frontend na :5173. Respeite os volumes montados e o watchdog de sincronia `sync_watchdog.py`.

## 5. SEGURANÇA E GIT
* Não combar arquivos com API Keys (`.env`, `settings.local.json`). O repositório foi travado por vazamento de chave Anthropic.
* Toda a modificação vira um `commit` padronizado em Português e subirá via `git push origin main` para deploy automático no Render.
