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





def _send_event(event_type: str, data: dict):
    """Formata um evento SSE."""
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"





# =====================
# Endpoint v3 — Arquitetura de 2 Etapas (ATIVO)
# Único endpoint de coleta real. v1 e v2 redirecionam para cá.
# =====================

@router.get("/stream/v3")
def stream_coleta_v3(ids: str = None, db: Session = Depends(get_db)):
    """
    Versão 3 com arquitetura de 2 etapas:
    1. Coleta TUDO sem filtro -> salva em arquivo JSON
    2. Analisa arquivo -> extrai vagas de UX/Produto -> salva no banco
    
    Se 'ids' for fornecido (CSV), processa apenas essas buscas.
    Se não, processa todas as buscas ativas no banco.
    """

    def generate():
        event_queue = queue.Queue()
        resultados = {}
        total_novas = 0
        total_coletadas = 0
        last_event_time = time.time()

        # Busca as URLs no banco
        query = db.query(models.SearchUrl).filter(models.SearchUrl.ativo == True)
        if ids:
            id_list = [int(i.strip()) for i in ids.split(",") if i.strip().isdigit()]
            if id_list:
                query = query.filter(models.SearchUrl.id.in_(id_list))
        
        buscas = query.order_by(models.SearchUrl.ordem).all()
        
        if not buscas:
            yield _send_event("complete", {"message": "Nenhuma busca ativa encontrada.", "stats": {"total_bruto": 0, "total_novas": 0}, "detalhes": {}})
            return

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

        for busca in buscas:
            fonte = busca.fonte
            nome_busca = busca.nome
            url_custom = busca.url
            step_id = f"busca_{busca.id}" # ID único para o frontend mapear se quiser

            yield _send_event("step_start", {
                "step": step_id,
                "message": f"Iniciando: {nome_busca} ({fonte})...",
                "estimated_time": 45
            })

            result_q = queue.Queue()
            exc_q = queue.Queue()

            def run_coleta(f=fonte, u=url_custom, sid=step_id):
                try:
                    if f == "indeed":
                        dados, arq = coletar_e_salvar_indeed(headless=True, progress_callback=make_callback(sid), custom_url=u)
                    elif f == "linkedin_posts":
                        dados, arq = coletar_e_salvar_posts(headless=True, progress_callback=make_callback(sid), custom_url=u)
                    elif f == "linkedin_jobs":
                        dados, arq = coletar_e_salvar_jobs(headless=True, progress_callback=make_callback(sid), custom_url=u)
                    else:
                        raise ValueError(f"Fonte desconhecida: {f}")
                    result_q.put((f, dados, arq))
                except Exception as e:
                    exc_q.put(e)

            t = threading.Thread(target=run_coleta)
            t.start()
            start_step = time.time()

            for ev in wait_with_heartbeat(t, event_queue):
                yield ev

            if not exc_q.empty():
                error_msg = str(exc_q.get())
                yield _send_event("step_error", {"step": step_id, "message": error_msg[:100]})
                continue
            
            if not result_q.empty():
                f_type, dados, arq = result_q.get()
                total_bruto_step = dados.get("total_vagas" if f_type != "linkedin_posts" else "total_posts", 0)
                yield _send_event("step_progress", {"step": step_id, "message": f"{total_bruto_step} coletados. Analisando...", "total_bruto": total_bruto_step, "progresso": 50})

                # Etapa 2: Analisar
                if f_type == "indeed":
                    res = analisar_arquivo_indeed(arq)
                elif f_type == "linkedin_posts":
                    res = analisar_arquivo_posts(arq)
                else: # linkedin_jobs
                    res = analisar_arquivo_jobs(arq)
                
                vagas = res.get("vagas", [])
                
                # Inserção no banco
                db_step = SessionLocal()
                try:
                    novas, dups = 0, 0
                    for v in vagas:
                        try:
                            # Posts precisam de enriquecimento de IA
                            if f_type == "linkedin_posts":
                                v_proc = _processar_com_ia(v, get_extractor(), f_type)
                                if not v_proc: continue
                                v = v_proc

                            if crud.check_duplicate(db_step, v.get("titulo", ""), v.get("empresa"), v.get("link_vaga"), v.get("perfil_autor")):
                                dups += 1
                            else:
                                crud.create_vaga(db_step, schemas.VagaCreate(**v))
                                novas += 1
                        except Exception as e:
                            logger.error(f"Erro ao inserir vaga: {e}")
                    
                    tempo = int(time.time() - start_step)
                    resultados[step_id] = {"total_bruto": total_bruto_step, "vagas_ux": len(vagas), "novas": novas, "taxa": res.get("taxa_conversao")}
                    total_novas += novas
                    total_coletadas += total_bruto_step
                    
                    yield _send_event("step_complete", {
                        "step": step_id, 
                        "stats": {
                            "total_bruto": total_bruto_step, 
                            "vagas_ux": len(vagas), 
                            "novas": novas, 
                            "tempo": tempo, 
                            "taxa": res.get("taxa_conversao")
                        }
                    })
                finally:
                    db_step.close()
            
            cleanup_chrome_processes()
            time.sleep(0.5)

        yield _send_event("complete", {"message": "Coleta finalizada!", "stats": {"total_bruto": total_coletadas, "total_novas": total_novas}, "detalhes": resultados})

    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})

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
# A coleta v3 já cria as vagas. A auditoria apenas:
# 1. Limpa duplicatas cross-source
# 2. Valida amostra com IA
# =====================

def _remover_duplicatas_cross_source(progress_callback=None) -> dict:
    """
    Remove vagas duplicatas entre fontes (posts, jobs, indeed).
    Mantém a vaga com mais dados preenchidos.
    """
    from sqlalchemy import func as sqlfunc
    db = SessionLocal()
    
    try:
        todas_vagas = db.query(models.Vaga).order_by(models.Vaga.id).all()
        total = len(todas_vagas)
        
        if progress_callback:
            progress_callback({
                "message": f"Verificando {total} vagas para duplicatas...",
                "progresso": 10,
            })
        
        # Agrupa por título normalizado + empresa normalizada
        def normalizar(texto):
            if not texto:
                return ""
            import re
            texto = texto.lower().strip()
            texto = re.sub(r'[^\w\s]', '', texto)
            texto = re.sub(r'\s+', ' ', texto)
            return texto
        
        grupos = {}
        for vaga in todas_vagas:
            titulo_norm = normalizar(vaga.titulo)
            empresa_norm = normalizar(vaga.empresa) if vaga.empresa else ""
            
            # Chave de agrupamento: título + empresa
            chave = f"{titulo_norm}|{empresa_norm}"
            if chave not in grupos:
                grupos[chave] = []
            grupos[chave].append(vaga)
        
        # Para cada grupo com mais de 1 vaga, manter a melhor
        ids_remover = []
        for chave, vagas_grupo in grupos.items():
            if len(vagas_grupo) <= 1:
                continue
            
            # Score de completude: mais campos preenchidos = melhor
            def score_completude(v):
                score = 0
                if v.link_vaga: score += 3
                if v.empresa: score += 2
                if v.descricao_completa: score += 2
                if v.missao_vaga: score += 1
                if v.localizacao: score += 1
                if v.email_contato: score += 1
                if v.contato_nome: score += 1
                if v.perfil_autor: score += 1
                if v.skills_obrigatorias: score += 1
                if v.responsabilidades: score += 1
                if v.salario_min or v.salario_max: score += 1
                if v.score_compatibilidade: score += 1
                return score
            
            # Ordena por score (melhor primeiro), depois por id (mais antigo primeiro)
            vagas_ordenadas = sorted(vagas_grupo, key=lambda v: (-score_completude(v), v.id))
            
            # Mantém o primeiro, remove o resto
            for vaga_duplicada in vagas_ordenadas[1:]:
                ids_remover.append(vaga_duplicada.id)
        
        if progress_callback:
            progress_callback({
                "message": f"Encontradas {len(ids_remover)} duplicatas para remover...",
                "progresso": 60,
            })
        
        # Remove duplicatas associadas na auditoria e depois a Vaga original
        if ids_remover:
            # Apaga referencias filhas para evitar ForeignKeyViolation
            db.query(models.ProcessamentoAuditoria).filter(
                models.ProcessamentoAuditoria.vaga_id.in_(ids_remover)
            ).delete(synchronize_session=False)
            
            db.query(models.ValidacaoAuditoria).filter(
                models.ValidacaoAuditoria.vaga_id.in_(ids_remover)
            ).delete(synchronize_session=False)

            # Apaga as vagas duplicadas
            db.query(models.Vaga).filter(
                models.Vaga.id.in_(ids_remover)
            ).delete(synchronize_session=False)
            
            db.commit()
        
        if progress_callback:
            progress_callback({
                "message": f"Limpeza concluída: {len(ids_remover)} duplicatas removidas",
                "progresso": 100,
            })
        
        return {
            "total_vagas": total,
            "duplicatas_removidas": len(ids_remover),
            "vagas_restantes": total - len(ids_remover),
            "grupos_duplicados": sum(1 for v in grupos.values() if len(v) > 1),
        }
    
    finally:
        db.close()


@router.get("/stream/auditoria")
def stream_auditoria():
    """
    Executa auditoria pós-coleta com streaming SSE.

    Etapas (simplificadas — coleta v3 já salva as vagas):
    1. Limpeza de duplicatas cross-source
    2. Validação de amostra com IA (Claude Haiku)
    """

    def generate():
        start_total = time.time()

        # ── ETAPA 1: Limpeza de duplicatas ────────────────────────────
        yield _send_event("step_start", {
            "step": "auditoria_gabarito",
            "message": "Limpando duplicatas entre fontes...",
            "estimated_time": 5,
        })

        try:
            start = time.time()

            result_q: queue.Queue = queue.Queue()
            exc_q: queue.Queue = queue.Queue()
            prog_q: queue.Queue = queue.Queue()

            def run_dedup():
                try:
                    def my_progress(data):
                        prog_q.put({"step": "auditoria_gabarito", **data})
                    r = _remover_duplicatas_cross_source(progress_callback=my_progress)
                    result_q.put(r)
                except Exception as e:
                    exc_q.put(e)

            t = threading.Thread(target=run_dedup)
            t.start()

            last_hb = time.time()
            while t.is_alive() or not prog_q.empty():
                while not prog_q.empty():
                    p_data = prog_q.get()
                    yield _send_event("step_progress", p_data)
                    last_hb = time.time()
                if time.time() - last_hb > 15:
                    yield _send_event("heartbeat", {"timestamp": time.time()})
                    last_hb = time.time()
                time.sleep(0.2)

            if not exc_q.empty():
                err = str(exc_q.get())
                yield _send_event("step_error", {
                    "step": "auditoria_gabarito",
                    "message": f"Erro na limpeza: {err[:120]}",
                })
            else:
                r = result_q.get() if not result_q.empty() else {}
                dups = r.get("duplicatas_removidas", 0)
                restantes = r.get("vagas_restantes", 0)
                tempo = int(time.time() - start)

                msg = f"{restantes} vagas únicas · {dups} duplicatas removidas"
                yield _send_event("step_complete", {
                    "step": "auditoria_gabarito",
                    "stats": {
                        "total_registros": r.get("total_vagas", 0),
                        "duplicatas_removidas": dups,
                        "vagas_restantes": restantes,
                        "tempo": tempo,
                    },
                    "message": msg,
                })

        except Exception as e:
            yield _send_event("step_error", {
                "step": "auditoria_gabarito",
                "message": f"Erro na limpeza de duplicatas: {str(e)[:100]}",
            })

        # ── ETAPA 2 (skip): Processamento já feito pela coleta v3 ──
        yield _send_event("step_start", {
            "step": "auditoria_processamento",
            "message": "Verificando vagas processadas...",
            "estimated_time": 2,
        })

        try:
            db_check = SessionLocal()
            total_vagas = db_check.query(models.Vaga).count()
            db_check.close()

            yield _send_event("step_complete", {
                "step": "auditoria_processamento",
                "stats": {
                    "total": total_vagas,
                    "processados": total_vagas,
                    "descartados": 0,
                    "tempo": 0,
                },
                "message": f"{total_vagas} vagas já processadas pela coleta v3",
            })
        except Exception as e:
            yield _send_event("step_error", {
                "step": "auditoria_processamento",
                "message": f"Erro ao verificar vagas: {str(e)[:100]}",
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
            prog_q3: queue.Queue = queue.Queue()

            def run_validar():
                try:
                    def my_progress(data):
                        prog_q3.put({"step": "auditoria_validacao", **data})
                        
                    # 5% das vagas, máximo 30 para não demorar demais
                    r = validar_amostra(percentual=0.05, max_amostras=30, salvar_banco=True, progress_callback=my_progress)
                    result_q3.put(r)
                except Exception as e:
                    exc_q3.put(e)

            t3 = threading.Thread(target=run_validar)
            t3.start()

            last_hb = time.time()
            while t3.is_alive() or not prog_q3.empty():
                while not prog_q3.empty():
                    p_data = prog_q3.get()
                    yield _send_event("step_progress", p_data)
                    last_hb = time.time()
                    
                if time.time() - last_hb > 15:
                    yield _send_event("heartbeat", {"timestamp": time.time()})
                    last_hb = time.time()
                time.sleep(0.2)

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
