from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import logging
import json
import time
import queue
import threading

from ..database import get_db, SessionLocal
from .. import crud, schemas
from ..scrapers.login_helper import cleanup_chrome_processes
from ..scrapers.coleta_bruta import coletar_e_salvar_posts, coletar_e_salvar_jobs, coletar_e_salvar_indeed
from ..scrapers.analisar_brutos import analisar_arquivo_posts, analisar_arquivo_jobs, analisar_arquivo_indeed
from ..services.ai_extractor import AIExtractor
from ..services.job_matcher import JobMatcher
from .. import models

router = APIRouter(prefix="/scraper", tags=["scraper"])
logger = logging.getLogger(__name__)

# Instancia global do extrator
_extractor = None


def get_extractor() -> AIExtractor:
    """Retorna instancia singleton do AIExtractor."""
    global _extractor
    if _extractor is None:
        _extractor = AIExtractor()
    return _extractor


def _calcular_scores_vagas(db: Session, vagas: list[models.Vaga]) -> int:
    """
    Calcula scores de compatibilidade para vagas recém-criadas.

    Args:
        db: Sessão do banco de dados
        vagas: Lista de vagas criadas

    Returns:
        Quantidade de vagas com destaque (is_destaque=True)
    """
    if not vagas:
        return 0

    # Busca perfil ativo
    perfil = db.query(models.UserProfile).filter(
        models.UserProfile.is_active == True
    ).first()

    if not perfil:
        logger.warning("Nenhum perfil ativo para calcular scores")
        return 0

    # Converte perfil para dict
    perfil_dict = {
        "nome": perfil.nome,
        "cargos_interesse": perfil.cargos_interesse or [],
        "nivel_minimo": perfil.nivel_minimo,
        "experiencia_anos": perfil.experiencia_anos,
        "skills": perfil.skills or [],
        "modalidades_aceitas": perfil.modalidades_aceitas or [],
        "tipos_contrato": perfil.tipos_contrato or [],
        "localizacoes": perfil.localizacoes or [],
        "nivel_ingles": perfil.nivel_ingles,
        "salario_minimo": perfil.salario_minimo,
        "salario_maximo": perfil.salario_maximo,
    }

    matcher = JobMatcher(perfil_dict)
    destaques = 0

    for vaga in vagas:
        vaga_dict = {
            "titulo": vaga.titulo,
            "empresa": vaga.empresa,
            "nivel": vaga.nivel,
            "modalidade": vaga.modalidade,
            "tipo_contrato": vaga.tipo_contrato,
            "localizacao": vaga.localizacao,
            "skills_obrigatorias": vaga.skills_obrigatorias or [],
            "skills_desejaveis": vaga.skills_desejaveis or [],
            "requisito_ingles": vaga.requisito_ingles,
            "salario_min": vaga.salario_min,
            "salario_max": vaga.salario_max,
        }

        resultado = matcher.calcular_score(vaga_dict)

        vaga.score_compatibilidade = resultado["score_total"]
        vaga.score_breakdown = resultado.get("breakdown")
        vaga.is_destaque = resultado["is_destaque"]

        if vaga.is_destaque:
            destaques += 1

    db.commit()
    logger.info(f"Scores calculados para {len(vagas)} vagas, {destaques} destaques")
    return destaques


def _processar_com_ia(vaga_dict: dict, extrator: AIExtractor, fonte: str) -> dict:
    """
    Processa uma vaga com IA para validar e extrair campos estruturados.

    Args:
        vaga_dict: Dados brutos da vaga coletada
        extrator: Instância do AIExtractor
        fonte: Fonte da vaga (indeed, linkedin_jobs, linkedin_posts)

    Returns:
        Dict atualizado com campos da IA ou None se não for vaga UX/Produto
    """
    if not extrator.is_enabled():
        return vaga_dict

    # Montar texto para análise
    texto_partes = []
    if vaga_dict.get("descricao_completa"):
        texto_partes.append(vaga_dict["descricao_completa"])
    if vaga_dict.get("titulo"):
        texto_partes.append(vaga_dict["titulo"])
    if vaga_dict.get("empresa"):
        texto_partes.append(f"Empresa: {vaga_dict['empresa']}")
    if vaga_dict.get("localizacao"):
        texto_partes.append(f"Local: {vaga_dict['localizacao']}")

    texto = " | ".join(texto_partes)

    # Processar com IA (Multimodal Vision se houver imagens, senão Texto Compacto)
    imagens_urls = vaga_dict.get("imagens_urls", [])
    if imagens_urls and extrator.is_enabled():
        dados_ia = extrator.extrair_de_imagem(imagens_urls, texto, fonte=fonte)
    else:
        dados_ia = extrator.extrair_compacto(texto, fonte=fonte)

    if dados_ia is None:
        return None

    # Mesclar dados originais com dados da IA
    vaga_atualizada = {**vaga_dict}

    # Campos que a IA pode atualizar
    campos_ia = [
        "titulo", "empresa", "nivel", "modalidade", "tipo_contrato",
        "localizacao", "carga_horaria", "area_departamento",
        "salario_min", "salario_max", "moeda_salario", "requisito_ingles"
    ]

    for campo in campos_ia:
        valor_ia = dados_ia.get(campo)
        # Só atualiza se IA extraiu algo válido
        if valor_ia and valor_ia != "nao_especificado":
            valor_original = vaga_atualizada.get(campo)
            # Atualiza se original está vazio ou é padrão
            if not valor_original or valor_original == "nao_especificado":
                vaga_atualizada[campo] = valor_ia

    # Título: prefere o da IA se for mais específico
    titulo_ia = dados_ia.get("titulo")
    if titulo_ia and len(titulo_ia) > 5:
        vaga_atualizada["titulo"] = titulo_ia

    # Empresa: usa da IA se não tiver
    empresa_ia = dados_ia.get("empresa")
    if empresa_ia and not vaga_atualizada.get("empresa"):
        vaga_atualizada["empresa"] = empresa_ia

    # PRD v3: Novos campos extraídos pela IA
    # Missão da vaga (pilar 6)
    missao_ia = dados_ia.get("missao_vaga")
    if missao_ia:
        vaga_atualizada["missao_vaga"] = missao_ia

    # Como aplicar (pilar 10)
    como_aplicar_ia = dados_ia.get("como_aplicar")
    if como_aplicar_ia:
        vaga_atualizada["como_aplicar"] = como_aplicar_ia

    # WhatsApp (se extraído pela IA e não existir no original)
    whatsapp_ia = dados_ia.get("whatsapp_contato")
    if whatsapp_ia and not vaga_atualizada.get("whatsapp_contato"):
        vaga_atualizada["whatsapp_contato"] = whatsapp_ia

    # NOVO: Arrays Ultracompactos de Skills e Requisitos
    responsabilidades_ia = dados_ia.get("responsabilidades")
    if responsabilidades_ia and isinstance(responsabilidades_ia, list):
        vaga_atualizada["responsabilidades"] = responsabilidades_ia
        
    requisitos_ia = dados_ia.get("requisitos_obrigatorios")
    if requisitos_ia and isinstance(requisitos_ia, list):
        vaga_atualizada["requisitos_obrigatorios"] = requisitos_ia
        
    skills_ia = dados_ia.get("skills_obrigatorias")
    if skills_ia and isinstance(skills_ia, list):
        vaga_atualizada["skills_obrigatorias"] = skills_ia

    return vaga_atualizada


# =====================
# Endpoints POST legados — DEPRECATED
# Usavam scrapers antigos sem pipeline de 2 etapas.
# Redirecionam para v3 (streaming).
# =====================

@router.post("/indeed")
def executar_scraper_indeed_deprecated():
    """DEPRECATED: Use /stream/v3. Endpoint legado mantido por compatibilidade."""
    logger.warning("⚠ DEPRECATED: POST /api/scraper/indeed chamado. Use GET /stream/v3")
    return {"error": "Endpoint descontinuado. Use GET /api/scraper/stream/v3 para coletar vagas."}


@router.post("/linkedin")
def executar_scraper_linkedin_deprecated():
    """DEPRECATED: Use /stream/v3. Endpoint legado mantido por compatibilidade."""
    logger.warning("⚠ DEPRECATED: POST /api/scraper/linkedin chamado. Use GET /stream/v3")
    return {"error": "Endpoint descontinuado. Use GET /api/scraper/stream/v3 para coletar vagas."}


@router.post("/posts")
def executar_scraper_posts_deprecated():
    """DEPRECATED: Use /stream/v3. Endpoint legado mantido por compatibilidade."""
    logger.warning("⚠ DEPRECATED: POST /api/scraper/posts chamado. Use GET /stream/v3")
    return {"error": "Endpoint descontinuado. Use GET /api/scraper/stream/v3 para coletar vagas."}


@router.post("/all")
def executar_todos_scrapers_deprecated():
    """DEPRECATED: Use /stream/v3. Endpoint legado mantido por compatibilidade."""
    logger.warning("⚠ DEPRECATED: POST /api/scraper/all chamado. Use GET /stream/v3")
    return {"error": "Endpoint descontinuado. Use GET /api/scraper/stream/v3 para coletar vagas."}


@router.post("/test/extrair")
def testar_extracao(texto: str, db: Session = Depends(get_db)):
    """
    Endpoint de teste para extração compacta de uma vaga.
    Útil para debugging e ajuste de prompts.
    """
    extrator = get_extractor()
    if not extrator.is_enabled():
        raise HTTPException(status_code=503, detail="IA não configurada")

    resultado = extrator.extrair_compacto(texto)
    return {"extracao": resultado}


def _send_event(event_type: str, data: dict):
    """Formata um evento SSE."""
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


# =====================
# Helpers legados removidos:
# - _processar_vagas_com_progresso (usada apenas por v1/v2)
# - _executar_scraper_com_timeout (usada apenas por v1)
# - _executar_scraper_com_eventos (usada apenas por v1)
# - _salvar_vagas (usada apenas pelos POST endpoints legados)
# Todo código de coleta agora passa pelo v3 (2 etapas: coleta_bruta → analisar_brutos).
# =====================


@router.get("/stream")
def stream_coleta_v1_deprecated():
    """
    DEPRECATED: Endpoint v1 legado. Redireciona para v3.
    O v3 usa arquitetura de 2 etapas com todas as correções
    (filtro UX por título, limpeza de empresa, dedup cross-source).
    """
    print("⚠ DEPRECATED: /api/scraper/stream (v1) chamado. Redirecionando para v3.")
    return stream_coleta_v3()


@router.get("/stream/v2")
def stream_coleta_v2_deprecated():
    """
    DEPRECATED: Endpoint v2 legado. Redireciona para v3.
    O v3 usa arquitetura de 2 etapas com todas as correções
    (filtro UX por título, limpeza de empresa, dedup cross-source).
    """
    logger.warning("⚠ DEPRECATED: /api/scraper/stream/v2 chamado. Redirecionando para v3.")
    return stream_coleta_v3()


# =====================
# Endpoint v3 — Arquitetura de 2 Etapas (ATIVO)
# Único endpoint de coleta real. v1 e v2 redirecionam para cá.
# =====================

@router.get("/stream/v3")
def stream_coleta_v3():
    """
    Versão 3 com arquitetura de 2 etapas:
    1. Coleta TUDO sem filtro -> salva em arquivo JSON
    2. Analisa arquivo -> extrai vagas de UX/Produto -> salva no banco
    """

    def generate():
        event_queue = queue.Queue()
        resultados = {}
        total_novas = 0
        total_coletadas = 0
        last_event_time = time.time()

        def make_callback(step_id):
            def callback(data):
                event_queue.put(_send_event("step_progress", {
                    "step": step_id,
                    **data
                }))
            return callback

        def wait_with_heartbeat(thread, eq):
            nonlocal last_event_time
            while thread.is_alive():
                while not eq.empty():
                    yield eq.get_nowait()
                    last_event_time = time.time()
                if time.time() - last_event_time > 15:
                    yield _send_event("heartbeat", {"timestamp": time.time()})
                    last_event_time = time.time()
                time.sleep(0.3)
            while not eq.empty():
                yield eq.get_nowait()

        cleanup_chrome_processes()

        # ===== INDEED (2 etapas) =====
        yield _send_event("step_start", {
            "step": "indeed",
            "message": "Etapa 1: Coletando vagas do Indeed...",
            "estimated_time": 30
        })

        result_q_indeed = queue.Queue()
        exc_q_indeed = queue.Queue()

        def run_indeed():
            try:
                dados, arq = coletar_e_salvar_indeed(headless=True, progress_callback=make_callback("indeed"))
                result_q_indeed.put((dados, arq))
            except Exception as e:
                exc_q_indeed.put(e)

        t = threading.Thread(target=run_indeed)
        t.start()
        start = time.time()

        for ev in wait_with_heartbeat(t, event_queue):
            yield ev

        if not exc_q_indeed.empty():
            yield _send_event("step_error", {"step": "indeed", "message": str(exc_q_indeed.get())[:100]})
        elif not result_q_indeed.empty():
            dados, arq = result_q_indeed.get()
            total_indeed = dados.get("total_vagas", 0)
            yield _send_event("step_progress", {"step": "indeed", "message": f"{total_indeed} vagas coletadas. Filtrando...", "total_bruto": total_indeed, "progresso": 50})

            res = analisar_arquivo_indeed(arq)
            vagas = res.get("vagas", [])

            db = SessionLocal()
            try:
                novas, dups = 0, 0
                for v in vagas:
                    try:
                        if crud.check_duplicate(db, v.get("titulo", ""), v.get("empresa"), v.get("link_vaga")):
                            dups += 1
                        else:
                            crud.create_vaga(db, schemas.VagaCreate(**v))
                            novas += 1
                    except Exception as e:
                        print(f"Erro ao inserir vaga indeed: {e}")
                tempo = int(time.time() - start)
                resultados["indeed"] = {"total_bruto": total_indeed, "vagas_ux": len(vagas), "novas": novas, "taxa": res.get("taxa_conversao")}
                total_novas += novas
                total_coletadas += total_indeed
                yield _send_event("step_complete", {"step": "indeed", "stats": {"total_bruto": total_indeed, "vagas_ux": len(vagas), "novas": novas, "tempo": tempo, "taxa": res.get("taxa_conversao")}})
            finally:
                db.close()

        cleanup_chrome_processes()
        time.sleep(1)

        # ===== LINKEDIN POSTS (2 etapas) =====
        yield _send_event("step_start", {
            "step": "linkedin_posts",
            "message": "Etapa 1: Coletando posts...",
            "estimated_time": 60
        })

        result_q = queue.Queue()
        exc_q = queue.Queue()

        def run_posts():
            try:
                dados, arq = coletar_e_salvar_posts(headless=True, progress_callback=make_callback("linkedin_posts"))
                result_q.put((dados, arq))
            except Exception as e:
                exc_q.put(e)

        t = threading.Thread(target=run_posts)
        t.start()
        start = time.time()

        for ev in wait_with_heartbeat(t, event_queue):
            yield ev

        if not exc_q.empty():
            yield _send_event("step_error", {"step": "linkedin_posts", "message": str(exc_q.get())[:100]})
        elif not result_q.empty():
            dados, arq = result_q.get()
            total_posts = dados.get("total_posts", 0)
            yield _send_event("step_progress", {"step": "linkedin_posts", "message": f"{total_posts} posts coletados. Analisando...", "total_bruto": total_posts, "progresso": 50})

            res = analisar_arquivo_posts(arq)
            vagas = res.get("vagas", [])

            db = SessionLocal()
            try:
                novas, dups = 0, 0
                for v in vagas:
                    try:
                        # Processamento com IA (Enriquecimento e OCR se houver imagens)
                        v_processada = _processar_com_ia(v, get_extractor(), "linkedin_posts")
                        if not v_processada:
                            continue # IA descartou
                        v = v_processada

                        if crud.check_duplicate(db, v.get("titulo", ""), v.get("empresa"), v.get("link_vaga"), v.get("perfil_autor")):
                            dups += 1
                        else:
                            crud.create_vaga(db, schemas.VagaCreate(**v))
                            novas += 1
                    except Exception as e:
                        print(f"Erro ao inserir vaga posts: {e}")
                tempo = int(time.time() - start)
                resultados["linkedin_posts"] = {"total_bruto": total_posts, "vagas_ux": len(vagas), "novas": novas, "taxa": res.get("taxa_conversao")}
                total_novas += novas
                total_coletadas += total_posts
                yield _send_event("step_complete", {"step": "linkedin_posts", "stats": {"total_bruto": total_posts, "vagas_ux": len(vagas), "novas": novas, "tempo": tempo, "taxa": res.get("taxa_conversao")}})
            finally:
                db.close()

        cleanup_chrome_processes()
        time.sleep(1)

        # ===== LINKEDIN JOBS (2 etapas) =====
        yield _send_event("step_start", {"step": "linkedin_jobs", "message": "Etapa 1: Coletando vagas...", "estimated_time": 90})

        result_q = queue.Queue()
        exc_q = queue.Queue()

        def run_jobs():
            try:
                dados, arq = coletar_e_salvar_jobs(headless=True, progress_callback=make_callback("linkedin_jobs"))
                result_q.put((dados, arq))
            except Exception as e:
                exc_q.put(e)

        t = threading.Thread(target=run_jobs)
        t.start()
        start = time.time()

        for ev in wait_with_heartbeat(t, event_queue):
            yield ev

        if not exc_q.empty():
            yield _send_event("step_error", {"step": "linkedin_jobs", "message": str(exc_q.get())[:100]})
        elif not result_q.empty():
            dados, arq = result_q.get()
            total_jobs = dados.get("total_vagas", 0)
            yield _send_event("step_progress", {"step": "linkedin_jobs", "message": f"{total_jobs} vagas coletadas. Filtrando...", "total_bruto": total_jobs, "progresso": 50})

            res = analisar_arquivo_jobs(arq)
            vagas = res.get("vagas", [])

            db = SessionLocal()
            try:
                novas, dups = 0, 0
                for v in vagas:
                    try:
                        if crud.check_duplicate(db, v.get("titulo", ""), v.get("empresa"), v.get("link_vaga")):
                            dups += 1
                        else:
                            crud.create_vaga(db, schemas.VagaCreate(**v))
                            novas += 1
                    except Exception as e:
                        print(f"Erro ao inserir vaga jobs: {e}")
                tempo = int(time.time() - start)
                resultados["linkedin_jobs"] = {"total_bruto": total_jobs, "vagas_ux": len(vagas), "novas": novas, "taxa": res.get("taxa_conversao")}
                total_novas += novas
                total_coletadas += total_jobs
                yield _send_event("step_complete", {"step": "linkedin_jobs", "stats": {"total_bruto": total_jobs, "vagas_ux": len(vagas), "novas": novas, "tempo": tempo, "taxa": res.get("taxa_conversao")}})
            finally:
                db.close()

        cleanup_chrome_processes()

        yield _send_event("complete", {"message": "Coleta finalizada!", "stats": {"total_bruto": total_coletadas, "total_novas": total_novas}, "detalhes": resultados})

    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})


# =====================
# Endpoint de Reprocessamento com IA
# Reprocessa vagas existentes para preencher campos faltantes (missao_vaga, como_aplicar, etc.)
# =====================

@router.post("/reprocessar-todas")
def reprocessar_vagas(
    limite: int = 50,
    db: Session = Depends(get_db)
):
    """
    Reprocessa vagas existentes que não possuem campos de IA preenchidos.
    Útil para atualizar vagas coletadas antes da v3 do extrator.
    
    Args:
        limite: Máximo de vagas a reprocessar por chamada (default: 50)
    """
    extrator = get_extractor()
    if not extrator.is_enabled():
        raise HTTPException(status_code=503, detail="IA não configurada")

    # Buscar vagas sem missao_vaga preenchida
    vagas_pendentes = db.query(models.Vaga).filter(
        (models.Vaga.missao_vaga == None) | (models.Vaga.missao_vaga == "")
    ).limit(limite).all()

    if not vagas_pendentes:
        return {
            "message": "Todas as vagas já foram processadas!",
            "total_processadas": 0,
            "total_atualizadas": 0,
            "total_pendentes": 0
        }

    total_pendentes = db.query(models.Vaga).filter(
        (models.Vaga.missao_vaga == None) | (models.Vaga.missao_vaga == "")
    ).count()

    atualizadas = 0
    erros = 0

    for vaga in vagas_pendentes:
        try:
            # Montar texto para análise
            texto_partes = []
            if vaga.descricao_completa:
                texto_partes.append(vaga.descricao_completa)
            if vaga.titulo:
                texto_partes.append(vaga.titulo)
            if vaga.empresa:
                texto_partes.append(f"Empresa: {vaga.empresa}")
            if vaga.localizacao:
                texto_partes.append(f"Local: {vaga.localizacao}")

            texto = " | ".join(texto_partes)
            if not texto or len(texto) < 20:
                continue

            dados_ia = extrator.extrair_compacto(texto, fonte=vaga.fonte or "linkedin_jobs")
            if not dados_ia:
                continue

            # Atualizar apenas campos faltantes
            if dados_ia.get("missao_vaga") and not vaga.missao_vaga:
                vaga.missao_vaga = dados_ia["missao_vaga"]
            if dados_ia.get("como_aplicar") and not vaga.como_aplicar:
                vaga.como_aplicar = dados_ia["como_aplicar"]
            if dados_ia.get("whatsapp_contato") and not vaga.whatsapp_contato:
                vaga.whatsapp_contato = dados_ia["whatsapp_contato"]

            # Atualizar campos genéricos que estavam vazios
            if dados_ia.get("nivel") and (not vaga.nivel or vaga.nivel == "nao_especificado"):
                vaga.nivel = dados_ia["nivel"]
            if dados_ia.get("modalidade") and (not vaga.modalidade or vaga.modalidade == "nao_especificado"):
                vaga.modalidade = dados_ia["modalidade"]
            if dados_ia.get("tipo_contrato") and (not vaga.tipo_contrato or vaga.tipo_contrato == "nao_especificado"):
                vaga.tipo_contrato = dados_ia["tipo_contrato"]

            atualizadas += 1

        except Exception as e:
            logger.error(f"Erro ao reprocessar vaga {vaga.id}: {e}")
            erros += 1

    db.commit()
    logger.info(f"Reprocessamento: {atualizadas}/{len(vagas_pendentes)} atualizadas, {erros} erros")

    return {
        "message": f"{atualizadas} vagas atualizadas com sucesso!",
        "total_processadas": len(vagas_pendentes),
        "total_atualizadas": atualizadas,
        "total_erros": erros,
        "total_pendentes": total_pendentes - len(vagas_pendentes)
    }


# =====================
# Endpoint de Auditoria com SSE
# 3 etapas reais: consolidar gabarito → processar brutos → validar amostra com IA
# =====================

@router.get("/stream/auditoria")
def stream_auditoria():
    """
    Executa auditoria completa com streaming SSE.

    Etapas:
    1. consolidar_gabarito — unifica arquivos brutos em gabarito master
    2. processar_todos — processa registros brutos pendentes com log de transformações
    3. validar_amostra — valida amostra aleatória com IA (Claude Haiku)
    """

    def generate():
        start_total = time.time()

        # ── ETAPA 1: Consolidar Gabarito ──────────────────────────────
        yield _send_event("step_start", {
            "step": "auditoria_gabarito",
            "message": "Consolidando arquivos brutos em gabarito master...",
            "estimated_time": 15,
        })

        try:
            from ..audit.consolidador_gabarito import consolidar_gabarito
            start = time.time()

            result_q: queue.Queue = queue.Queue()
            exc_q: queue.Queue = queue.Queue()

            def run_gabarito():
                try:
                    r = consolidar_gabarito(output_format="json", salvar_banco=True)
                    result_q.put(r)
                except Exception as e:
                    exc_q.put(e)

            t = threading.Thread(target=run_gabarito)
            t.start()

            # heartbeat enquanto aguarda
            last_hb = time.time()
            while t.is_alive():
                if time.time() - last_hb > 15:
                    yield _send_event("heartbeat", {"timestamp": time.time()})
                    last_hb = time.time()
                time.sleep(0.3)

            if not exc_q.empty():
                err = str(exc_q.get())
                yield _send_event("step_error", {
                    "step": "auditoria_gabarito",
                    "message": f"Erro ao consolidar: {err[:120]}",
                })
            else:
                r = result_q.get() if not result_q.empty() else {}
                total_reg = r.get("total_registros", 0)
                banco = r.get("banco", {})
                inseridos = banco.get("inseridos", 0)
                duplicados = banco.get("duplicados", 0)
                por_fonte = r.get("por_fonte", {})
                tempo = int(time.time() - start)

                msg_partes = [f"{total_reg} registros consolidados"]
                if por_fonte:
                    partes_fonte = [f"{v} {k.replace('linkedin_', '').replace('_', ' ')}" for k, v in por_fonte.items()]
                    msg_partes.append("(" + ", ".join(partes_fonte) + ")")
                msg_partes.append(f"· {inseridos} novos no banco")

                yield _send_event("step_complete", {
                    "step": "auditoria_gabarito",
                    "stats": {
                        "total_registros": total_reg,
                        "inseridos_banco": inseridos,
                        "duplicados": duplicados,
                        "por_fonte": por_fonte,
                        "tempo": tempo,
                    },
                    "message": " ".join(msg_partes),
                })

        except Exception as e:
            yield _send_event("step_error", {
                "step": "auditoria_gabarito",
                "message": f"Módulo de gabarito indisponível: {str(e)[:100]}",
            })

        # ── ETAPA 2: Processar brutos pendentes ───────────────────────
        yield _send_event("step_start", {
            "step": "auditoria_processamento",
            "message": "Processando registros brutos com rastreabilidade...",
            "estimated_time": 20,
        })

        try:
            from ..audit.processar_com_auditoria import processar_todos
            start = time.time()

            result_q2: queue.Queue = queue.Queue()
            exc_q2: queue.Queue = queue.Queue()

            def run_processar():
                try:
                    r = processar_todos()
                    result_q2.put(r)
                except Exception as e:
                    exc_q2.put(e)

            t2 = threading.Thread(target=run_processar)
            t2.start()

            last_hb = time.time()
            while t2.is_alive():
                if time.time() - last_hb > 15:
                    yield _send_event("heartbeat", {"timestamp": time.time()})
                    last_hb = time.time()
                time.sleep(0.3)

            if not exc_q2.empty():
                err = str(exc_q2.get())
                yield _send_event("step_error", {
                    "step": "auditoria_processamento",
                    "message": f"Erro no processamento: {err[:120]}",
                })
            else:
                r2 = result_q2.get() if not result_q2.empty() else {}
                total = r2.get("total", 0)
                processados = r2.get("processado", 0)
                descartados = r2.get("descartado", 0)
                motivos = r2.get("motivos_descarte", {})
                tempo = int(time.time() - start)

                msg = f"{total} registros · {processados} processados · {descartados} descartados"
                yield _send_event("step_complete", {
                    "step": "auditoria_processamento",
                    "stats": {
                        "total": total,
                        "processados": processados,
                        "descartados": descartados,
                        "motivos_descarte": motivos,
                        "tempo": tempo,
                    },
                    "message": msg,
                })

        except Exception as e:
            yield _send_event("step_error", {
                "step": "auditoria_processamento",
                "message": f"Módulo de processamento indisponível: {str(e)[:100]}",
            })

        # ── ETAPA 3: Validar amostra com IA ───────────────────────────
        yield _send_event("step_start", {
            "step": "auditoria_validacao",
            "message": "Validando amostra com IA (Claude Haiku)...",
            "estimated_time": 30,
        })

        try:
            from ..audit.validar_amostra import validar_amostra
            start = time.time()

            result_q3: queue.Queue = queue.Queue()
            exc_q3: queue.Queue = queue.Queue()

            def run_validar():
                try:
                    # 5% das vagas, máximo 30 para não demorar demais
                    r = validar_amostra(percentual=0.05, max_amostras=30, salvar_banco=True)
                    result_q3.put(r)
                except Exception as e:
                    exc_q3.put(e)

            t3 = threading.Thread(target=run_validar)
            t3.start()

            last_hb = time.time()
            while t3.is_alive():
                if time.time() - last_hb > 15:
                    yield _send_event("heartbeat", {"timestamp": time.time()})
                    last_hb = time.time()
                time.sleep(0.3)

            if not exc_q3.empty():
                err = str(exc_q3.get())
                yield _send_event("step_error", {
                    "step": "auditoria_validacao",
                    "message": f"Erro na validação: {err[:120]}",
                })
            else:
                r3 = result_q3.get() if not result_q3.empty() else {}

                if "erro" in r3:
                    yield _send_event("step_error", {
                        "step": "auditoria_validacao",
                        "message": r3["erro"],
                    })
                else:
                    amostras = r3.get("total_amostras", 0)
                    corretas = r3.get("vagas_corretas", 0)
                    discrepancias = r3.get("vagas_com_discrepancia", 0)
                    score = r3.get("score_medio", 0)
                    taxa = r3.get("taxa_acerto", 0)
                    tempo = int(time.time() - start)

                    msg = f"{amostras} vagas validadas · score médio {score:.0%} · taxa de acerto {taxa:.0%}"
                    yield _send_event("step_complete", {
                        "step": "auditoria_validacao",
                        "stats": {
                            "total_amostras": amostras,
                            "vagas_corretas": corretas,
                            "vagas_com_discrepancia": discrepancias,
                            "score_medio": round(score, 3),
                            "taxa_acerto": round(taxa, 3),
                            "tempo": tempo,
                        },
                        "message": msg,
                    })

        except Exception as e:
            yield _send_event("step_error", {
                "step": "auditoria_validacao",
                "message": f"Módulo de validação indisponível: {str(e)[:100]}",
            })

        tempo_total = int(time.time() - start_total)
        yield _send_event("auditoria_complete", {
            "message": "Auditoria concluída!",
            "tempo_total": tempo_total,
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
