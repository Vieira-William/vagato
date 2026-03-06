#!/bin/bash
# Script rápido para executar coleta de vagas
cd ~/Projects/vagato/backend
source venv/bin/activate
python app/scrapers/coletar_tudo.py
