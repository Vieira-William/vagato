"""
API para configurações do sistema.
Gerencia credenciais de login para scrapers, pesos de matching e agendamento automático.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
import json
import os
import threading

from ..database import get_db
from ..models import MatchWeights as MatchWeightsModel, ConfiguracaoIA as ConfiguracaoIAModel
from ..schemas import MatchWeightsUpdate, MatchWeightsResponse
from ..config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/config", tags=["config"])

# Diretório para armazenar configurações
CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "scrapers", "config")
os.makedirs(CONFIG_DIR, exist_ok=True)

# =====================================================================
# SCHEDULER — Estado global (gerenciado por main.py via init_scheduler)
# =====================================================================
_scheduler = None        # instância BackgroundScheduler
_coleta_lock = threading.Lock()  # Lock thread-safe para evitar coletas simultâneas
_coleta_rodando = False  # flag: coleta automática em andamento agora

# ThreadPoolExecutor para execução isolada da coleta.
# Prepara a arquitetura para futura migração para Celery/Redis.
# Quando migrar: substituir executor.submit() por celery_task.delay()
from concurrent.futures import ThreadPoolExecutor
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="coleta_worker")


def get_scheduler():
    """Retorna a instância global do scheduler."""
    return _scheduler


def set_scheduler(sched):
    """Define a instância global do scheduler (chamado pelo main.py)."""
    global _scheduler
    _scheduler = sched


class LinkedInCredentials(BaseModel):
    """Credenciais do LinkedIn."""
    email: str
    password: str


class ConfigStatus(BaseModel):
    """Status das configurações."""
    linkedin_configured: bool
    indeed_configured: bool


def get_config_path(site: str) -> str:
    """Retorna o caminho do arquivo de configuração."""
    return os.path.join(CONFIG_DIR, f"{site}_credentials.json")


class IAStatusResponse(BaseModel):
    saldo_inicial_usd: float
    gasto_acumulado_usd: float
    saldo_atual_usd: float
    alerta_limite_usd: float
    ultima_atualizacao: datetime
    percentual_restante: float

    class Config:
        from_attributes = True


class ConsumoDetalhado(BaseModel):
    """Detalhes de consumo por modelo."""
    haiku_calls: int = 0
    sonnet_calls: int = 0
    vision_calls: int = 0
    gasto_haiku_usd: float = 0.0
    gasto_sonnet_usd: float = 0.0
    gasto_vision_usd: float = 0.0


class IAConsumoResponse(BaseModel):
    """Response completo com consumo detalhado."""
    saldo_inicial_usd: float
    gasto_acumulado_usd: float
    saldo_disponivel_usd: float
    saldo_percentual_restante: float
    saldo_percentual_gasto: float
    alerta_limite_usd: float
    em_alerta: bool
    ultima_atualizacao: datetime
    detalhes: ConsumoDetalhado

    class Config:
        from_attributes = True


class IAConfigUpdate(BaseModel):
    saldo_inicial_usd: Optional[float] = None
    alerta_limite_usd: Optional[float] = None


@router.get("/status", response_model=ConfigStatus)
def get_config_status():
    """Retorna o status das configurações."""
    linkedin_path = get_config_path("linkedin")
    indeed_path = get_config_path("indeed")

    return ConfigStatus(
        linkedin_configured=os.path.exists(linkedin_path),
        indeed_configured=os.path.exists(indeed_path),
    )


@router.post("/linkedin")
def save_linkedin_credentials(credentials: LinkedInCredentials):
    """Salva credenciais do LinkedIn."""
    filepath = get_config_path("linkedin")

    try:
        with open(filepath, "w") as f:
            json.dump({
                "email": credentials.email,
                "password": credentials.password,
            }, f)

        return {"message": "Credenciais do LinkedIn salvas com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar: {str(e)}")


@router.delete("/linkedin")
def delete_linkedin_credentials():
    """Remove credenciais do LinkedIn."""
    filepath = get_config_path("linkedin")

    if os.path.exists(filepath):
        os.remove(filepath)
        return {"message": "Credenciais do LinkedIn removidas"}

    return {"message": "Nenhuma credencial encontrada"}


def get_linkedin_credentials():
    """Retorna credenciais do LinkedIn (para uso interno)."""
    filepath = get_config_path("linkedin")

    if not os.path.exists(filepath):
        return None

    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except:
        return None


@router.post("/linkedin/test")
def test_linkedin_login():
    """Testa o login do LinkedIn com as credenciais salvas."""
    from ..scrapers.login_helper import criar_driver_com_perfil, fazer_login_linkedin

    credentials = get_linkedin_credentials()

    if not credentials:
        raise HTTPException(status_code=400, detail="Nenhuma credencial configurada")

    driver = None
    try:
        driver = criar_driver_com_perfil(headless=True)

        # Tenta fazer login
        success = fazer_login_linkedin(driver, credentials)

        if success:
            return {
                "success": True,
                "message": "Login realizado com sucesso!"
            }
        else:
            return {
                "success": False,
                "message": "Falha no login. Verifique suas credenciais ou se há verificação de segurança."
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao testar login: {str(e)}")

    finally:
        if driver:
            driver.quit()


# ===================================
# GESTÃO DE CUSTOS IA
# ===================================

@router.get("/ia/status", response_model=IAConsumoResponse)
def obter_status_ia(db: Session = Depends(get_db)):
    """Retorna o saldo e estatísticas completas de uso da IA."""
    config = db.query(ConfiguracaoIAModel).first()
    if not config:
        # Cria registro inicial se não existir
        config = ConfiguracaoIAModel(saldo_inicial_usd=10.0, gasto_acumulado_usd=0.0)
        db.add(config)
        db.commit()
        db.refresh(config)

    saldo_disponivel = config.saldo_disponivel
    percentual_restante = (saldo_disponivel / config.saldo_inicial_usd * 100) if config.saldo_inicial_usd > 0 else 0
    percentual_gasto = config.percentual_gasto

    return {
        "saldo_inicial_usd": config.saldo_inicial_usd,
        "gasto_acumulado_usd": config.gasto_acumulado_usd,
        "saldo_disponivel_usd": saldo_disponivel,
        "saldo_percentual_restante": percentual_restante,
        "saldo_percentual_gasto": percentual_gasto,
        "alerta_limite_usd": config.alerta_limite_usd,
        "em_alerta": config.em_alerta,
        "ultima_atualizacao": config.ultima_atualizacao,
        "detalhes": {
            "haiku_calls": config.haiku_calls,
            "sonnet_calls": config.sonnet_calls,
            "vision_calls": config.vision_calls,
            "gasto_haiku_usd": config.gasto_haiku_usd,
            "gasto_sonnet_usd": config.gasto_sonnet_usd,
            "gasto_vision_usd": config.gasto_vision_usd,
        }
    }


@router.post("/ia/config")
def atualizar_config_ia(dados: IAConfigUpdate, db: Session = Depends(get_db)):
    """Atualiza limites ou recarrega saldo da IA."""
    config = db.query(ConfiguracaoIAModel).first()
    if not config:
        config = ConfiguracaoIAModel()
        db.add(config)

    if dados.saldo_inicial_usd is not None:
        # Se o usuário está enviando um novo saldo, somamos ao saldo inicial
        # (simulando uma recarga) ou apenas definimos o novo total.
        # Aqui, vamos definir o total acumulado comprado.
        config.saldo_inicial_usd = dados.saldo_inicial_usd

    if dados.alerta_limite_usd is not None:
        config.alerta_limite_usd = dados.alerta_limite_usd

    db.commit()
    return {"message": "Configurações de IA atualizadas com sucesso"}


@router.post("/ia/sincronizar")
def sincronizar_saldo_anthropic(db: Session = Depends(get_db)):
    """
    Sincroniza o saldo com a API da Anthropic.
    Faz um request de teste para obter informações de consumo real da Anthropic.
    """
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Faz um request mínimo para obter informações de consumo
        # Usamos um prompt bem curto para minimizar custos
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=10,
            messages=[{"role": "user", "content": "OK"}]
        )

        # Obtém informações de uso real da Anthropic
        if hasattr(response, 'usage'):
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens

            # Calcula custo dessa chamada teste
            taxa_in_haiku = settings.COST_PER_1K_INPUT_HAIKU
            taxa_out_haiku = settings.COST_PER_1K_OUTPUT_HAIKU
            custo_teste = (input_tokens * taxa_in_haiku / 1000) + (output_tokens * taxa_out_haiku / 1000)

            # Registra essa chamada no banco
            config = db.query(ConfiguracaoIAModel).first()
            if not config:
                config = ConfiguracaoIAModel(saldo_inicial_usd=10.0, gasto_acumulado_usd=0.0)
                db.add(config)

            config.gasto_acumulado_usd += custo_teste
            config.haiku_calls += 1
            config.gasto_haiku_usd += custo_teste
            db.commit()

            return {
                "mensagem": "✅ Sincronização com Anthropic concluída",
                "consumo_teste": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "custo_usd": round(custo_teste, 6)
                },
                "saldo_atualizado": round(config.saldo_disponivel, 4)
            }
        else:
            raise Exception("Nenhuma informação de uso retornada")

    except ImportError:
        return {"erro": "Biblioteca 'anthropic' não instalada"}
    except Exception as e:
        logger.error(f"Erro ao sincronizar com Anthropic: {e}")
        return {"erro": f"Erro ao sincronizar: {str(e)}"}


# ===================================
# MATCH WEIGHTS (Pesos de Matching)
# ===================================

DEFAULT_WEIGHTS = {
    "skills": 0.35,
    "nivel": 0.20,
    "modalidade": 0.15,
    "tipo_contrato": 0.10,
    "salario": 0.10,
    "ingles": 0.05,
    "localizacao": 0.05,
}


@router.get("/match-weights", response_model=MatchWeightsResponse)
def obter_pesos(db: Session = Depends(get_db)):
    """Retorna os pesos de matching ativos."""
    pesos = db.query(MatchWeightsModel).filter(MatchWeightsModel.is_active == True).first()

    if not pesos:
        # Criar pesos padrão
        pesos = MatchWeightsModel(**DEFAULT_WEIGHTS, is_active=True)
        db.add(pesos)
        db.commit()
        db.refresh(pesos)

    return pesos


@router.post("/match-weights", response_model=MatchWeightsResponse)
def salvar_pesos(dados: MatchWeightsUpdate, db: Session = Depends(get_db)):
    """Salva os pesos de matching."""
    # Valida que a soma dos pesos é 1.0 (100%)
    total = (
        (dados.skills or 0) +
        (dados.nivel or 0) +
        (dados.modalidade or 0) +
        (dados.tipo_contrato or 0) +
        (dados.salario or 0) +
        (dados.ingles or 0) +
        (dados.localizacao or 0)
    )

    if abs(total - 1.0) > 0.01:  # Tolerância de 1%
        raise HTTPException(
            status_code=400,
            detail=f"A soma dos pesos deve ser 100%. Atual: {round(total * 100)}%"
        )

    # Busca pesos ativos ou cria novos
    pesos = db.query(MatchWeightsModel).filter(MatchWeightsModel.is_active == True).first()

    if not pesos:
        pesos = MatchWeightsModel(is_active=True)
        db.add(pesos)

    # Atualiza campos
    for field, value in dados.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(pesos, field, value)

    db.commit()
    db.refresh(pesos)

    return pesos


@router.post("/match-weights/reset", response_model=MatchWeightsResponse)
def resetar_pesos(db: Session = Depends(get_db)):
    """Reseta os pesos para os valores padrão."""
    pesos = db.query(MatchWeightsModel).filter(MatchWeightsModel.is_active == True).first()

    if not pesos:
        pesos = MatchWeightsModel(**DEFAULT_WEIGHTS, is_active=True)
        db.add(pesos)
    else:
        for field, value in DEFAULT_WEIGHTS.items():
            setattr(pesos, field, value)

    db.commit()
    db.refresh(pesos)

    return pesos


@router.post("/recalcular-scores")
def recalcular_scores(db: Session = Depends(get_db)):
    """Recalcula todos os scores de compatibilidade com os pesos atuais."""
    from ..models import Vaga, UserProfile
    from ..services.job_matcher import JobMatcher

    # Busca perfil ativo
    perfil = db.query(UserProfile).filter(UserProfile.is_active == True).first()
    if not perfil:
        raise HTTPException(status_code=404, detail="Nenhum perfil ativo encontrado")

    # Busca pesos ativos
    pesos = db.query(MatchWeightsModel).filter(MatchWeightsModel.is_active == True).first()

    # Converte perfil para dict
    profile_dict = {
        "skills": perfil.skills or [],
        "nivel_minimo": perfil.nivel_minimo,
        "modalidades_aceitas": perfil.modalidades_aceitas or ["remoto"],
        "tipos_contrato": perfil.tipos_contrato or ["clt", "pj"],
        "localizacoes": perfil.localizacoes or ["Brasil"],
        "nivel_ingles": perfil.nivel_ingles or "intermediario",
        "salario_minimo": perfil.salario_minimo,
        "salario_maximo": perfil.salario_maximo,
    }

    # Cria matcher com pesos customizados
    matcher = JobMatcher(profile_dict)
    if pesos:
        matcher.weights.skills = pesos.skills
        matcher.weights.nivel = pesos.nivel
        matcher.weights.modalidade = pesos.modalidade
        matcher.weights.tipo_contrato = pesos.tipo_contrato
        matcher.weights.salario = pesos.salario
        matcher.weights.ingles = pesos.ingles
        matcher.weights.localizacao = pesos.localizacao

    # Recalcula para todas as vagas pendentes
    vagas = db.query(Vaga).filter(Vaga.status == "pendente").all()
    recalculadas = 0

    for vaga in vagas:
        vaga_dict = {
            "skills_obrigatorias": vaga.skills_obrigatorias,
            "skills_desejaveis": vaga.skills_desejaveis,
            "nivel": vaga.nivel,
            "modalidade": vaga.modalidade,
            "tipo_contrato": vaga.tipo_contrato,
            "localizacao": vaga.localizacao,
            "requisito_ingles": vaga.requisito_ingles,
            "salario_min": vaga.salario_min,
            "salario_max": vaga.salario_max,
        }

        resultado = matcher.calcular_score(vaga_dict)
        vaga.score_compatibilidade = resultado["score_total"]
        vaga.score_breakdown = resultado["breakdown"]
        vaga.is_destaque = resultado["is_destaque"]
        recalculadas += 1

    db.commit()

    return {
        "message": f"{recalculadas} vagas recalculadas com sucesso",
        "total": recalculadas
    }


# =====================================================================
# AGENDAMENTO AUTOMÁTICO DE COLETA
# =====================================================================

AGENDAMENTO_CONFIG_PATH = os.path.join(CONFIG_DIR, "agendamento.json")


class AgendamentoHorario(BaseModel):
    hora: int = Field(..., ge=0, le=23)
    minuto: int = Field(..., ge=0, le=59)
    ativo: bool = True
    auditar: bool = False  # auditoria individual por horário


class AgendamentoConfig(BaseModel):
    habilitado: bool = False
    horarios: List[AgendamentoHorario] = []
    auditar_apos_coleta: bool = False

    @validator("horarios")
    def max_tres_horarios(cls, v):
        if len(v) > 3:
            raise ValueError("Máximo de 3 horários permitidos")
        return v


def _ler_config_agendamento() -> dict:
    """Lê configuração de agendamento do arquivo JSON."""
    if not os.path.exists(AGENDAMENTO_CONFIG_PATH):
        return {"habilitado": False, "horarios": [], "auditar_apos_coleta": False}
    try:
        with open(AGENDAMENTO_CONFIG_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return {"habilitado": False, "horarios": [], "auditar_apos_coleta": False}


def _salvar_config_agendamento(config: dict):
    """Salva configuração de agendamento no arquivo JSON."""
    with open(AGENDAMENTO_CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


def _coleta_worker(auditar: bool = False):
    """
    Worker isolado que executa a coleta de vagas.
    
    Executado dentro do ThreadPoolExecutor para não bloquear a thread do scheduler.
    Futuramente, esta função pode ser convertida em uma Celery task:
        @celery_app.task
        def coleta_worker(auditar=False): ...
    """
    import subprocess
    script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scrapers", "coletar_tudo.py")
    venv_python = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "venv", "bin", "python"
    )
    python_exec = venv_python if os.path.exists(venv_python) else "python3"

    result = subprocess.run(
        [python_exec, script_path, "--headless"],
        capture_output=True,
        text=True,
        timeout=1800  # 30 minutos máximo
    )
    print(result.stdout[-2000:] if result.stdout else "")
    if result.stderr:
        print("[Scheduler] Stderr:", result.stderr[-500:])

    if auditar and result.returncode == 0:
        print("[Scheduler] Coleta concluída. Auditoria não implementada via CLI ainda.")

    return result.returncode


def _executar_coleta_automatica(auditar: bool = False):
    """
    Executa coleta automática (chamada pelo APScheduler).
    
    Usa threading.Lock para garantir single-instance mesmo com
    múltiplas threads do APScheduler ou múltiplos workers.
    A coleta é despachada para o ThreadPoolExecutor isolado.
    """
    global _coleta_rodando
    
    acquired = _coleta_lock.acquire(blocking=False)
    if not acquired:
        print("[Scheduler] Lock não adquirido — coleta já em andamento, pulando.")
        return

    _coleta_rodando = True
    print("[Scheduler] Lock adquirido. Iniciando coleta automática...")

    try:
        future = _executor.submit(_coleta_worker, auditar)
        returncode = future.result(timeout=1860)  # 31 min (30 da subprocess + margem)
        print(f"[Scheduler] Coleta automática concluída! (exit code: {returncode})")
    except Exception as e:
        print(f"[Scheduler] Erro na coleta automática: {e}")
    finally:
        _coleta_rodando = False
        _coleta_lock.release()
        print("[Scheduler] Lock liberado.")


def reagendar_jobs(config: dict):
    """Remove todos os jobs e recria com base na config atual."""
    sched = get_scheduler()
    if sched is None:
        return

    # Remove todos os jobs de coleta existentes
    for job in sched.get_jobs():
        if job.id.startswith("coleta_auto_"):
            sched.remove_job(job.id)

    if not config.get("habilitado"):
        return

    auditar_global = config.get("auditar_apos_coleta", False)
    for h in config.get("horarios", []):
        if not h.get("ativo", True):
            continue
        hora = h["hora"]
        minuto = h["minuto"]
        # Auditoria: flag individual do horário OU flag global (legado)
        auditar_este = h.get("auditar", False) or auditar_global
        job_id = f"coleta_auto_{hora:02d}_{minuto:02d}"
        sched.add_job(
            _executar_coleta_automatica,
            trigger="cron",
            hour=hora,
            minute=minuto,
            id=job_id,
            kwargs={"auditar": auditar_este},
            replace_existing=True,
            misfire_grace_time=300,  # 5 min de tolerância
        )
        print(f"[Scheduler] Job agendado: {hora:02d}:{minuto:02d} (auditar={auditar_este})")


@router.get("/agendamento")
def obter_agendamento():
    """Retorna configuração atual de agendamento automático."""
    return _ler_config_agendamento()


@router.post("/agendamento")
def salvar_agendamento(config: AgendamentoConfig):
    """Salva configuração de agendamento e reinicia os jobs do scheduler."""
    config_dict = config.dict()
    _salvar_config_agendamento(config_dict)
    reagendar_jobs(config_dict)

    sched = get_scheduler()
    jobs_ativos = []
    if sched:
        for job in sched.get_jobs():
            if job.id.startswith("coleta_auto_"):
                next_run = job.next_run_time
                jobs_ativos.append({
                    "id": job.id,
                    "proxima_execucao": next_run.isoformat() if next_run else None
                })

    return {
        "message": "Agendamento salvo com sucesso",
        "config": config_dict,
        "jobs_ativos": jobs_ativos
    }


@router.get("/agendamento/status")
def status_agendamento():
    """Retorna status atual do scheduler: se está ativo, rodando e próxima execução."""
    config = _ler_config_agendamento()
    sched = get_scheduler()

    jobs = []
    if sched and config.get("habilitado"):
        for job in sched.get_jobs():
            if job.id.startswith("coleta_auto_"):
                next_run = job.next_run_time
                jobs.append({
                    "id": job.id,
                    "proxima_execucao": next_run.isoformat() if next_run else None,
                })

    # Próxima execução mais próxima
    proxima = None
    if jobs:
        prox_list = [j["proxima_execucao"] for j in jobs if j["proxima_execucao"]]
        if prox_list:
            proxima = min(prox_list)

    return {
        "habilitado": config.get("habilitado", False),
        "rodando_agora": _coleta_rodando,
        "proxima_execucao": proxima,
        "auditar_apos_coleta": config.get("auditar_apos_coleta", False),
        "horarios": config.get("horarios", []),
        "jobs": jobs,
    }
