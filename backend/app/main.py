from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import engine, Base
from .api import vagas, stats, scraper, config, profile, search_urls

# Criar diretório data se não existir
os.makedirs("data", exist_ok=True)

# Criar tabelas no banco
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vagas UX Platform API",
    description="API para gerenciamento de vagas de UX/Product Design",
    version="1.0.0",
)


@app.on_event("startup")
def startup_scheduler():
    """Inicia o APScheduler e carrega agendamentos salvos."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from .api.config import set_scheduler, reagendar_jobs, _ler_config_agendamento

        sched = BackgroundScheduler(
            job_defaults={"coalesce": True, "max_instances": 1},
            timezone="America/Sao_Paulo"
        )
        sched.start()
        set_scheduler(sched)

        # Carrega configuração salva e agenda os jobs
        cfg = _ler_config_agendamento()
        if cfg.get("habilitado") and cfg.get("horarios"):
            reagendar_jobs(cfg)
            print(f"[Scheduler] Iniciado com {len(cfg['horarios'])} horário(s) agendado(s).")
        else:
            print("[Scheduler] Iniciado (sem agendamentos ativos).")

    except ImportError:
        print("[Scheduler] APScheduler não instalado — agendamento automático desabilitado.")
    except Exception as e:
        print(f"[Scheduler] Erro ao iniciar: {e}")


@app.on_event("shutdown")
def shutdown_scheduler():
    """Para o APScheduler no encerramento."""
    from .api.config import get_scheduler
    sched = get_scheduler()
    if sched and sched.running:
        sched.shutdown(wait=False)
        print("[Scheduler] Encerrado.")

# CORS para permitir frontend local e produção
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:3000",
        "https://vagas-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(vagas.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(scraper.router, prefix="/api")
app.include_router(config.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(search_urls.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Vagas UX Platform API", "docs": "/docs"}


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
