#!/bin/bash
# Script para configurar coleta automática diária no macOS

PROJETO_DIR="$HOME/Projects/vagato"
PLIST_FILE="$HOME/Library/LaunchAgents/com.vagas.ux.collector.plist"

echo "=================================================="
echo "CONFIGURAÇÃO DE COLETA AUTOMÁTICA"
echo "=================================================="

# Cria o diretório se não existir
mkdir -p "$HOME/Library/LaunchAgents"

# Cria o arquivo plist
cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.vagas.ux.collector</string>

    <key>ProgramArguments</key>
    <array>
        <string>$PROJETO_DIR/backend/venv/bin/python</string>
        <string>$PROJETO_DIR/backend/app/scrapers/coletar_tudo.py</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$PROJETO_DIR/backend</string>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>14</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>$PROJETO_DIR/backend/logs/coleta.log</string>

    <key>StandardErrorPath</key>
    <string>$PROJETO_DIR/backend/logs/coleta_error.log</string>

    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

# Cria diretório de logs
mkdir -p "$PROJETO_DIR/backend/logs"

# Carrega o agente
launchctl unload "$PLIST_FILE" 2>/dev/null
launchctl load "$PLIST_FILE"

echo ""
echo "✓ Coleta automática configurada!"
echo ""
echo "A coleta será executada todos os dias às 14:00"
echo ""
echo "Comandos úteis:"
echo "  - Executar agora:    cd $PROJETO_DIR/backend && source venv/bin/activate && python app/scrapers/coletar_tudo.py"
echo "  - Ver logs:          tail -f $PROJETO_DIR/backend/logs/coleta.log"
echo "  - Desativar:         launchctl unload $PLIST_FILE"
echo "  - Reativar:          launchctl load $PLIST_FILE"
echo ""
