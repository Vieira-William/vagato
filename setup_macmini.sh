#!/bin/bash

# 🚀 Setup Automático - Vagas UX Platform no Mac Mini
# Este script faz tudo automaticamente

echo "🚀 Iniciando setup do Vagas UX Platform no Mac Mini..."
echo "=================================================="

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para verificar sucesso
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 - FALHOU${NC}"
        exit 1
    fi
}

# 1. Verificar se Git está instalado
echo -e "\n${YELLOW}[1/7] Verificando Git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git não encontrado. Instale via Xcode Command Line Tools:${NC}"
    xcode-select --install
fi
check_status "Git verificado"

# 2. Clonar o repositório
echo -e "\n${YELLOW}[2/7] Clonando repositório...${NC}"
cd ~ || exit
if [ -d "Projects/vagato" ]; then
    echo "Repositório já existe. Fazendo pull..."
    cd Projects/vagato
    git pull origin main
else
    mkdir -p Projects
    cd Projects
    git clone https://github.com/Vieira-William/vagato.git
    cd vagato
fi
check_status "Repositório clonado/atualizado"

# 3. Verificar e instalar Node.js
echo -e "\n${YELLOW}[3/7] Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "Node.js não encontrado. Instalando via curl..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || {
        echo "Tentando instalar via Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        brew install node
    }
fi
check_status "Node.js disponível ($(node -v))"

# 4. Verificar e instalar Python
echo -e "\n${YELLOW}[4/7] Verificando Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo "Python3 não encontrado. Instale manualmente via python.org ou brew install python3"
    exit 1
fi
check_status "Python disponível ($(python3 --version))"

# 5. Setup Backend
echo -e "\n${YELLOW}[5/7] Configurando Backend...${NC}"
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
check_status "Backend configurado"

# 6. Setup Frontend
echo -e "\n${YELLOW}[6/7] Configurando Frontend...${NC}"
cd ../frontend
npm install
check_status "Frontend configurado"

# 7. Verificação final
echo -e "\n${YELLOW}[7/7] Verificação final...${NC}"
cd ..
echo -e "${GREEN}✅ Setup completo!${NC}"
echo ""
echo "=================================================="
echo "📊 RESUMO:"
echo "=================================================="
echo -e "📁 Projeto: $(pwd)"
echo -e "📦 Node.js: $(node -v)"
echo -e "🐍 Python: $(python3 --version)"
echo -e "📚 Git: $(git --version | awk '{print $3}')"
echo ""
echo "=================================================="
echo "🚀 PRÓXIMOS PASSOS:"
echo "=================================================="
echo ""
echo "1️⃣  Para rodar o BACKEND:"
echo "   cd ~/Projects/vagato/backend"
echo "   source venv/bin/activate"
echo "   python -m uvicorn app.main:app --reload"
echo ""
echo "2️⃣  Para rodar o FRONTEND (em outro terminal):"
echo "   cd ~/Projects/vagato/frontend"
echo "   npm run dev"
echo ""
echo "3️⃣  Para sincronizar com GitHub:"
echo "   cd ~/Projects/vagato"
echo "   git pull origin main  # antes de começar"
echo "   git add ."
echo "   git commit -m 'sua mensagem'"
echo "   git push origin main"
echo ""
echo "=================================================="
echo "✨ Tudo pronto! Boa sorte! ✨"
echo "=================================================="
