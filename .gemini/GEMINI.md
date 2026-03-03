# VAGAS UX PLATFORM — WORKSPACE RULES (NORMAS AAA)

## 1. COMUNICAÇÃO E POSTURA
* **Protocolo Pt-Br:** Toda e qualquer resposta, log, walkthrough ou commit deve ser estritamente em Português Brasileiro (pt-BR). Explicações profundas de processos complexos no `AGENT_CHAT.md` são obrigatórias.
* **Transparência Absoluta:** Fim das mudanças silenciosas. É estritamente proibido alterar o código sem documentar e justify a ação no chat.
* **Postura Operacional:** A execução deve ser analítica, cirúrgica e direta, sem floreios.

## 2. RADAR E MEMÓRIA (PROTOCOLO WAKE-UP)
* **Leitura Obrigatória Pré-Ação:** ANTES de qualquer ação ou de propor alterações, o agente DEVE ler: `CLAUDE.md` (inteiro), `AGENT_BOARD.md` (inteiro) e as últimas entradas do `AGENT_CHAT.md`.
* **Manutenção e Faxina do Kanban (Regra de Ouro):** O `AGENT_BOARD.md` deve manter rigorosamente APENAS os últimos 7 dias de atividades. Após passar 1 semana, o agente deve fazer a "faxina" do board, apagando as tarefas que ele próprio adicionou e que já tenham mais de 7 dias, para garantir a organização e economia do arquivo.
* **Visão Sistêmica e Propriedade:** NENHUM irmão de IA pode alterar diretamente o que o outro escreveu. Se precisar mudar algo feito por outro agente, você deve REPORTAR no chat e PEDIR para esse irmão alterar. Se ele concordar, o próprio autor faz a reescrita.

## 3. DIRETRIZES DE DESIGN E UI/UX
* **Consulta Obrigatória de Design:** As diretrizes visuais (tokens, cores, raios de borda, componentes) mudam constantemente. Para qualquer decisão de design, é ESTRITAMENTE OBRIGATÓRIO consultar o arquivo de Design System vigente. NÃO invente tokens ou estilos baseados em senso comum.

## 4. INFRAESTRUTURA E STACK
* **A Tríade (Stack Inegociável):** A plataforma opera exclusivamente com FastAPI (Python) no backend, React + Vite + TailwindCSS no frontend, e Neon PostgreSQL como banco de dados.
* **Sincronização:** Siga rigorosamente os protocolos do `vagas_sentinel.sh` e `sync_watchdog.py` para evitar sobrescrita de arquivos entre as máquinas.
* **Componentização Inteligente (shadcn/ui):** O uso do `shadcn/ui` é o PADRÃO para elementos de interface (botões, modais, dropdowns, etc.). Regra de fluxo:
  1. Verifique se o componente já existe na pasta `src/components/ui`. Se sim, importe e use.
  2. Se não existir, você DEVE executar/instruir a instalação via terminal (ex: `npx shadcn-ui@latest add [nome-do-componente]`) ANTES de codar a tela.
  3. Nunca crie componentes interativos complexos do zero se o shadcn possuir uma base oficial pronta. Adapte o estilo do shadcn para as nossas regras de Soft UI.

## 5. OTIMIZAÇÃO DE TOKENS E CUSTO-BENEFÍCIO
* **Economia Absoluta:** O foco durante o desenvolvimento deve ser gastar a menor quantidade de tokens possível. Escreva códigos e respostas de forma enxuta e focada.
* **Alinhamento de Custos:** Qualquer desvio desta regra, ou a necessidade de uma refatoração pesada que exija alto consumo de tokens, DEVE ser alinhada e aprovada previamente pelo utilizador.
