#!/usr/bin/env python3
"""
Scheduler para coleta automática de vagas.
Pode ser rodado standalone (CLI) ou via APScheduler integrado no FastAPI.

Uso CLI:
    python -m app.scrapers.scheduler                    # Carrega horários do JSON
    python -m app.scrapers.scheduler --hora 9 --hora 18 # Horários avulsos
    python -m app.scrapers.scheduler --agora             # Executa imediatamente
"""
import sys
import os
import time
import subprocess
import json
from datetime import datetime, timedelta

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config", "agendamento.json")


def log(msg: str):
    """Log com timestamp."""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def executar_coleta(auditar: bool = False):
    """Executa o script de coleta (coletar_tudo.py)."""
    log("Iniciando coleta automática...")

    script_path = os.path.join(os.path.dirname(__file__), "coletar_tudo.py")
    venv_python = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "venv", "bin", "python"
    )
    python_exec = venv_python if os.path.exists(venv_python) else "python3"

    try:
        result = subprocess.run(
            [python_exec, script_path, "--headless"],
            capture_output=False,  # Exibe em tempo real
            text=True,
            timeout=1800,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        )
        if result.returncode == 0:
            log("Coleta concluída com sucesso!")
        else:
            log(f"Coleta terminou com código {result.returncode}")
    except subprocess.TimeoutExpired:
        log("TIMEOUT: coleta demorou mais de 30 minutos")
    except Exception as e:
        log(f"Erro na coleta: {e}")


def proxima_execucao(hora: int, minuto: int) -> tuple:
    """Calcula próxima execução para um horário dado. Retorna (datetime, segundos)."""
    agora = datetime.now()
    prox = agora.replace(hour=hora, minute=minuto, second=0, microsecond=0)
    if prox <= agora:
        prox += timedelta(days=1)
    return prox, (prox - agora).total_seconds()


def proxima_de_lista(horarios: list) -> tuple:
    """
    Dada uma lista de {'hora': int, 'minuto': int, 'ativo': bool},
    retorna (hora, minuto, datetime_prox, segundos) para o próximo horário ativo.
    """
    candidatos = []
    for h in horarios:
        if not h.get("ativo", True):
            continue
        prox, secs = proxima_execucao(h["hora"], h["minuto"])
        candidatos.append((secs, h["hora"], h["minuto"], prox))

    if not candidatos:
        return None

    candidatos.sort()
    secs, hora, minuto, prox = candidatos[0]
    return hora, minuto, prox, secs


def carregar_horarios_config() -> list:
    """Carrega horários do arquivo JSON de configuração."""
    if not os.path.exists(CONFIG_PATH):
        return []
    try:
        with open(CONFIG_PATH) as f:
            cfg = json.load(f)
        if not cfg.get("habilitado"):
            return []
        return cfg.get("horarios", [])
    except Exception:
        return []


def rodar_scheduler(horarios: list):
    """
    Roda o scheduler em loop infinito para múltiplos horários.

    Args:
        horarios: lista de {'hora': int, 'minuto': int, 'ativo': bool}
    """
    ativos = [h for h in horarios if h.get("ativo", True)]
    if not ativos:
        log("Nenhum horário ativo configurado. Encerrando.")
        return

    nomes = ", ".join(f"{h['hora']:02d}:{h['minuto']:02d}" for h in ativos)
    log(f"Scheduler iniciado. Horários: {nomes}")

    while True:
        resultado = proxima_de_lista(horarios)
        if not resultado:
            log("Sem horários ativos. Encerrando.")
            break

        hora, minuto, prox, segundos = resultado
        log(f"Próxima coleta: {prox.strftime('%d/%m/%Y %H:%M')} ({segundos/3600:.1f}h)")

        time.sleep(segundos)
        executar_coleta()
        time.sleep(60)  # Pausa antes de recalcular próximo


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scheduler de coleta automática de vagas")
    parser.add_argument("--hora", type=int, action="append", default=[],
                        help="Hora(s) da coleta (0-23), pode repetir para múltiplos")
    parser.add_argument("--minuto", type=int, action="append", default=[],
                        help="Minuto(s) correspondente(s) (0-59)")
    parser.add_argument("--agora", action="store_true", help="Executar coleta imediatamente")
    parser.add_argument("--auditar", action="store_true", help="Auditar após coleta")

    args = parser.parse_args()

    if args.agora:
        executar_coleta(auditar=args.auditar)
        sys.exit(0)

    # Horários passados via CLI têm prioridade; senão carrega do JSON
    if args.hora:
        horas = args.hora
        minutos = args.minuto or [0] * len(horas)
        if len(minutos) < len(horas):
            minutos += [0] * (len(horas) - len(minutos))
        horarios = [{"hora": h, "minuto": m, "ativo": True} for h, m in zip(horas, minutos)]
    else:
        horarios = carregar_horarios_config()
        if not horarios:
            log("Nenhum horário configurado. Use --hora ou configure via UI.")
            log("Exemplo: python scheduler.py --hora 9 --hora 18 --minuto 0 --minuto 30")
            sys.exit(1)

    rodar_scheduler(horarios)
