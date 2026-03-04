from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sqlalchemy import text, inspect

from .database import engine, Base, SessionLocal
from .api import vagas, stats, scraper, config, profile, search_urls, calendar, gmail, linkedin
from .middleware.sentry_middleware import SentryUserMiddleware


def _scrub_sensitive_headers(event, hint):
    """Remove dados sensíveis (tokens, cookies) antes de enviar ao Sentry."""
    try:
        headers = event.get("request", {}).get("headers", {})
        if isinstance(headers, dict):
            if "authorization" in headers:
                headers["authorization"] = "[FILTERED]"
            if "cookie" in headers:
                headers["cookie"] = "[FILTERED]"
            if "x-api-key" in headers:
                headers["x-api-key"] = "[FILTERED]"
    except Exception:
        pass
    return event


# ── Inicializar Sentry para observabilidade do Backend ──
SENTRY_DSN = os.getenv("SENTRY_DSN")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=ENVIRONMENT,
        release=f"vagas-backend@{APP_VERSION}",
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
        ],
        # Performance: 20% em prod, 100% em dev
        traces_sample_rate=0.2 if ENVIRONMENT == "production" else 1.0,
        # Não enviar em desenvolvimento local
        enabled=ENVIRONMENT != "development",
        # Remover dados sensíveis antes de enviar
        before_send=_scrub_sensitive_headers,
    )
    print(f"[Sentry] Inicializado — env={ENVIRONMENT} release=vagas-backend@{APP_VERSION}")

# Criar diretório data se não existir
os.makedirs("data", exist_ok=True)

# Criar tabelas novas (não afeta tabelas já existentes)
Base.metadata.create_all(bind=engine)

# ── Migração automática: adiciona colunas que faltam nas tabelas existentes ──
def _migrar_colunas():
    """Detecta e adiciona colunas novas sem destruir dados existentes."""
    inspector = inspect(engine)
    is_sqlite = "sqlite" in str(engine.url)

    for table in Base.metadata.sorted_tables:
        nome_tabela = table.name
        try:
            colunas_existentes = {c["name"] for c in inspector.get_columns(nome_tabela)}
        except Exception:
            continue  # tabela ainda não existe, create_all vai criar

        for col in table.columns:
            if col.name in colunas_existentes:
                continue  # já existe, pula

            # Monta tipo SQL compatível
            try:
                tipo = col.type.compile(engine.dialect)
            except Exception:
                tipo = "TEXT"

            default_sql = ""
            if col.default is not None and col.default.is_scalar:
                val = col.default.arg
                if isinstance(val, bool):
                    default_sql = f" DEFAULT {'1' if val else '0'}" if is_sqlite else f" DEFAULT {str(val).upper()}"
                elif isinstance(val, str):
                    default_sql = f" DEFAULT '{val}'"
                elif val is not None:
                    default_sql = f" DEFAULT {val}"

            nullable_sql = "" if col.nullable else " NOT NULL" if not default_sql else ""
            ddl = f'ALTER TABLE "{nome_tabela}" ADD COLUMN "{col.name}" {tipo}{default_sql}{nullable_sql}'

            try:
                with engine.begin() as conn:
                    conn.execute(text(ddl))
                print(f"[Migração] ✅ {nome_tabela}.{col.name} adicionado")
            except Exception as e:
                # Ignora erros de "coluna já existe" (race condition)
                if "already exists" not in str(e).lower() and "duplicate column" not in str(e).lower():
                    print(f"[Migração] ⚠️  {nome_tabela}.{col.name}: {e}")

_migrar_colunas()


# ── Migração: Limpa valores inválidos de fonte (gerados por migração anterior incorreta) ──
def _corrigir_fonte_invalida():
    """Remove valores inválidos de 'fonte' que não existem no FonteEnum.
    'fonte' é Optional na schema, então NULL é aceito. Só 'indeed', 'linkedin_jobs'
    e 'linkedin_posts' são válidos. Qualquer outro valor causa 500 no Pydantic.
    """
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE "vagas"
                SET fonte = NULL
                WHERE fonte NOT IN ('indeed', 'linkedin_jobs', 'linkedin_posts')
                  AND fonte IS NOT NULL
            """))
            print("[Migração] ✅ Valores inválidos de 'fonte' revertidos para NULL")
    except Exception as e:
        print(f"[Migração] ℹ️  Migração fonte: {e}")

_corrigir_fonte_invalida()


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

# SentryUserMiddleware ANTES do CORS (propaga identidade do usuário para eventos Sentry)
app.add_middleware(SentryUserMiddleware)

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
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
        "http://192.168.1.16:5173",
        "http://192.168.1.16:5174",
        "http://192.168.1.16:5175",
        "http://192.168.1.22:5173",
        "http://192.168.1.22:5174",
        "http://192.168.1.22:5175",
        "http://Williams-Mac-mini.local:5173",
        "http://Williams-Mac-mini.local:5174",
        "http://MacBook-Air-de-William.local:5173",
        "http://MacBook-Air-de-William.local:5174",
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
app.include_router(calendar.router, prefix="/api")
app.include_router(gmail.router, prefix="/api")
app.include_router(linkedin.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Vagas UX Platform API", "docs": "/docs"}


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": APP_VERSION, "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/health/deep")
@app.get("/api/health/deep")
def deep_health_check():
    """Health check completo — testa conexão real com o banco de dados."""
    db_status = "unknown"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    overall = "healthy" if db_status == "connected" else "degraded"
    return {
        "status": overall,
        "database": db_status,
        "version": APP_VERSION,
        "environment": ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/debug-sentry")
def trigger_sentry_error():
    """Endpoint temporário para testar integração Sentry. REMOVER APÓS CONFIRMAR."""
    raise ZeroDivisionError("Sentry test error from vagas-backend — pode apagar este endpoint")

