"""
API para gerenciamento do perfil do usuário.
Permite CRUD do perfil e configuração de preferências para matching.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional
import logging
import io
import pdfplumber
import uuid
from datetime import datetime

from ..database import get_db
from .. import models, schemas
from ..services.default_profile import WILLIAM_PROFILE
from ..services.ai_extractor import AIExtractor
from ..services.linkedin_parser import parse_linkedin_zip
from ..services.linkedin_pdf_parser import parse_linkedin_profile_pdf

router = APIRouter(prefix="/profile", tags=["profile"])
logger = logging.getLogger(__name__)


def sync_legacy_fields(update_data: dict) -> dict:
    """
    Sincroniza campos novos → legados para o JobMatcher.

    O onboarding v13.1 grava em campos estruturados (profissoes_interesse,
    modelos_trabalho, idiomas, pais/estado/cidade). O JobMatcher lê campos
    legados (nivel_minimo, modalidades_aceitas, nivel_ingles, localizacoes).
    Esta função deriva os legados automaticamente para manter o score correto.
    """
    # profissoes_interesse[0].nivel → nivel_minimo
    profs = update_data.get("profissoes_interesse")
    if profs and len(profs) > 0:
        primeiro_nivel = profs[0].get("nivel", "") if isinstance(profs[0], dict) else ""
        if primeiro_nivel:
            update_data["nivel_minimo"] = primeiro_nivel

    # modelos_trabalho → modalidades_aceitas
    modelos = update_data.get("modelos_trabalho")
    if modelos:
        update_data["modalidades_aceitas"] = modelos

    # idiomas (Inglês).proficiencia → nivel_ingles
    idiomas = update_data.get("idiomas")
    if idiomas:
        for idioma in idiomas:
            if isinstance(idioma, dict):
                nome = (idioma.get("idioma") or "").lower()
                if nome in ["inglês", "ingles", "english"]:
                    update_data["nivel_ingles"] = idioma.get("proficiencia", "")
                    break

    # pais + estado + cidade → localizacoes (lista)
    loc_parts = []
    for key in ["cidade", "estado", "pais"]:
        val = update_data.get(key)
        if val and isinstance(val, str) and val.strip():
            loc_parts.append(val.strip())
    if loc_parts:
        update_data["localizacoes"] = [", ".join(loc_parts)]

    return update_data


def get_or_create_profile(db: Session) -> models.UserProfile:
    """Retorna o perfil ativo ou cria um novo baseado no perfil padrão."""
    # Busca perfil ativo
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.is_active == True
    ).first()

    if profile:
        return profile

    # Cria perfil padrão
    logger.info("Criando perfil padrão baseado em WILLIAM_PROFILE...")
    profile = models.UserProfile(
        nome=WILLIAM_PROFILE.get("nome", "Usuário"),
        email=WILLIAM_PROFILE.get("email"),
        cargos_interesse=WILLIAM_PROFILE.get("cargos_interesse", []),
        nivel_minimo=WILLIAM_PROFILE.get("nivel_minimo", "senior"),
        experiencia_anos=WILLIAM_PROFILE.get("experiencia_anos"),
        skills=WILLIAM_PROFILE.get("skills", []),
        modalidades_aceitas=WILLIAM_PROFILE.get("modalidades_aceitas", ["remoto", "hibrido"]),
        tipos_contrato=WILLIAM_PROFILE.get("tipos_contrato", ["clt", "pj"]),
        localizacoes=WILLIAM_PROFILE.get("localizacoes", []),
        nivel_ingles=WILLIAM_PROFILE.get("nivel_ingles", "intermediario"),
        salario_minimo=WILLIAM_PROFILE.get("salario_minimo"),
        salario_maximo=WILLIAM_PROFILE.get("salario_maximo"),
        onboarding_completed=False,
        onboarding_step=0,
        is_active=True
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/", response_model=schemas.UserProfileResponse)
def obter_perfil(db: Session = Depends(get_db)):
    """
    Retorna o perfil ativo do usuário.
    Se não existir, cria um perfil padrão.
    """
    profile = get_or_create_profile(db)
    return profile


@router.patch("/", response_model=schemas.UserProfileResponse)
def atualizar_perfil(
    perfil_update: schemas.UserProfileUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza campos específicos do perfil ativo.
    """
    profile = get_or_create_profile(db)

    # Atualiza apenas campos fornecidos
    update_data = perfil_update.model_dump(exclude_unset=True)
    update_data = sync_legacy_fields(update_data)

    for field, value in update_data.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

    # Derivar nome completo das partes quando qualquer parte for atualizada
    name_fields = {'primeiro_nome', 'nome_meio', 'ultimo_nome'}
    if name_fields & set(update_data.keys()):
        parts = [
            profile.primeiro_nome,
            profile.nome_meio,
            profile.ultimo_nome,
        ]
        computed = ' '.join(p for p in parts if p and p.strip())
        if computed:
            profile.nome = computed

    db.commit()
    db.refresh(profile)

    logger.info(f"Perfil atualizado: {update_data.keys()}")
    return profile


@router.post("/", response_model=schemas.UserProfileResponse)
def criar_ou_substituir_perfil(
    perfil: schemas.UserProfileCreate,
    db: Session = Depends(get_db)
):
    """
    Cria um novo perfil ou substitui o existente.
    Desativa todos os perfis anteriores.
    """
    # Desativa perfis anteriores
    db.query(models.UserProfile).update({"is_active": False})

    # Cria novo perfil
    novo_perfil = models.UserProfile(
        **perfil.model_dump(),
        is_active=True
    )
    db.add(novo_perfil)
    db.commit()
    db.refresh(novo_perfil)

    logger.info(f"Novo perfil criado: {novo_perfil.nome}")
    return novo_perfil


@router.delete("/")
def deletar_perfil(db: Session = Depends(get_db)):
    """
    Deleta o perfil ativo.
    Um novo perfil padrão será criado na próxima requisição GET.
    """
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.is_active == True
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Nenhum perfil ativo encontrado")

    db.delete(profile)
    db.commit()

    logger.info("Perfil ativo deletado")
    return {"message": "Perfil deletado com sucesso"}


@router.post("/upload-curriculo")
async def upload_curriculo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload de currículo PDF para extração de dados com IA usando PDFPlumber.
    O arquivo é SEMPRE salvo no perfil. A extração com IA é um bônus.
    """
    logger.info(f"[UPLOAD] Início - arquivo: {file.filename}, content_type: {file.content_type}")
    
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Por favor, envie o currículo em PDF."
        )

    # Ler conteúdo
    content = await file.read()
    file_size = len(content)
    logger.info(f"[UPLOAD] Arquivo lido: {file_size} bytes")

    if file_size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Arquivo muito grande. Máximo 5MB."
        )

    if file_size < 100:
        raise HTTPException(
            status_code=400,
            detail="Arquivo muito pequeno ou vazio."
        )

    # Registrar arquivo no perfil PRIMEIRO (antes de qualquer processamento IA)
    profile = get_or_create_profile(db)
    
    arquivos_atuais = list(profile.arquivos_curriculo or [])
    if len(arquivos_atuais) >= 3:
        raise HTTPException(status_code=400, detail="Você já atingiu o limite de 3 currículos. Remova um para adicionar outro.")

    novo_arquivo = {
        "id": str(uuid.uuid4()),
        "nome": file.filename,
        "data_upload": datetime.now().isoformat(),
        "tamanho": file_size
    }
    
    arquivos_atuais.append(novo_arquivo)
    profile.arquivos_curriculo = arquivos_atuais
    flag_modified(profile, "arquivos_curriculo")
    
    # Tentar extração com IA (bônus — não bloqueia o upload)
    resultado_ia = None
    try:
        # Extrair texto do PDF na memória
        texto_cv = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    texto_cv += text + "\n"
        
        logger.info(f"[UPLOAD] Texto extraído: {len(texto_cv)} chars")
        
        if texto_cv.strip() and len(texto_cv) >= 50:
            extractor = AIExtractor()
            if extractor.is_enabled():
                resultado_ia = extractor.analisar_curriculo(texto_cv)
                logger.info(f"[UPLOAD] IA retornou: {resultado_ia}")
            else:
                logger.warning("[UPLOAD] IA não configurada, pulando extração")
        else:
            logger.warning(f"[UPLOAD] Texto insuficiente ({len(texto_cv)} chars), pulando IA")
            
    except Exception as e:
        logger.error(f"[UPLOAD] Erro na extração/IA (não-bloqueante): {str(e)}")
    
    # Se a IA retornou dados, mergear no perfil
    if resultado_ia:
        novas_skills = set(profile.skills or [])
        if resultado_ia.get("skills"):
            novas_skills.update(resultado_ia["skills"])
        profile.skills = list(novas_skills)
        flag_modified(profile, "skills")
        
        if resultado_ia.get("experiencia_anos"):
            profile.experiencia_anos = int(resultado_ia["experiencia_anos"])
        if resultado_ia.get("nivel_minimo"):
            profile.nivel_minimo = resultado_ia["nivel_minimo"]
        if resultado_ia.get("nivel_ingles"):
            profile.nivel_ingles = resultado_ia["nivel_ingles"]

    db.commit()
    db.refresh(profile)

    logger.info(f"[UPLOAD] Sucesso! Total de arquivos: {len(profile.arquivos_curriculo)}")

    return {
        "message": "Currículo salvo com sucesso!" + (" Skills extraídas com IA." if resultado_ia else ""),
        "dados_extraidos": resultado_ia,
        "arquivos": profile.arquivos_curriculo,
        "filename": file.filename
    }

@router.post("/import-linkedin-zip")
async def import_linkedin_zip(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Recebe .zip do LinkedIn Data Export, parseia CSVs e mergeia dados no perfil.
    LinkedIn > Settings > Privacy > Get a copy of your data
    """
    logger.info(f"[LINKEDIN-ZIP] Início - arquivo: {file.filename}")

    if not file.filename or not file.filename.lower().endswith('.zip'):
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie o arquivo .zip exportado do LinkedIn."
        )

    content = await file.read()
    file_size = len(content)
    logger.info(f"[LINKEDIN-ZIP] Arquivo lido: {file_size} bytes")

    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 50MB.")

    if file_size < 100:
        raise HTTPException(status_code=400, detail="Arquivo muito pequeno ou corrompido.")

    # Parsear .zip
    try:
        dados = parse_linkedin_zip(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[LINKEDIN-ZIP] Erro ao parsear: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar arquivo do LinkedIn.")

    # Mergear no perfil (sem sobrescrever dados existentes que já tenham valor)
    profile = get_or_create_profile(db)

    if dados.get("nome") and not profile.nome:
        profile.nome = dados["nome"]
    elif dados.get("nome"):
        profile.nome = dados["nome"]  # LinkedIn override: nome sempre atualiza

    if dados.get("pais"):
        profile.pais = dados["pais"]
    if dados.get("estado"):
        profile.estado = dados["estado"]
    if dados.get("cidade"):
        profile.cidade = dados["cidade"]

    # Skills: merge (union)
    if dados.get("skills"):
        novas_skills = list(set((profile.skills or []) + dados["skills"]))
        profile.skills = novas_skills
        flag_modified(profile, "skills")

    # Profissões de interesse
    if dados.get("profissoes_interesse"):
        profile.profissoes_interesse = dados["profissoes_interesse"]
        flag_modified(profile, "profissoes_interesse")

        # Inferir experiencia_anos da posição mais recente
        primeiro = dados["profissoes_interesse"][0]
        if primeiro.get("anos_exp") and not profile.experiencia_anos:
            profile.experiencia_anos = primeiro["anos_exp"]
        if primeiro.get("nivel"):
            profile.nivel_minimo = primeiro["nivel"]

    # Formações
    if dados.get("formacoes"):
        profile.formacoes = dados["formacoes"]
        flag_modified(profile, "formacoes")

    # Idiomas
    if dados.get("idiomas"):
        profile.idiomas = dados["idiomas"]
        flag_modified(profile, "idiomas")

        # Inferir nivel_ingles do idioma inglês, se presente
        for idioma in dados["idiomas"]:
            nome_idioma = (idioma.get("idioma") or "").lower()
            if nome_idioma in ("english", "inglês", "ingles"):
                profile.nivel_ingles = idioma.get("proficiencia", "intermediario")
                break

    # Marcar método de importação
    profile.import_method = "linkedin_zip"

    db.commit()
    db.refresh(profile)

    campos = dados.get("_campos_preenchidos", 0)
    logger.info(f"[LINKEDIN-ZIP] Sucesso! {campos} campos preenchidos")

    return {
        "success": True,
        "dados_importados": {
            "nome": dados.get("nome"),
            "profissoes_interesse": dados.get("profissoes_interesse", []),
            "skills": dados.get("skills", []),
            "formacoes": dados.get("formacoes", []),
            "idiomas": dados.get("idiomas", []),
            "pais": dados.get("pais"),
            "estado": dados.get("estado"),
            "cidade": dados.get("cidade"),
        },
        "campos_preenchidos": campos,
    }


@router.post("/import-linkedin-pdf")
async def import_linkedin_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Recebe o PDF do perfil LinkedIn (Perfil → Mais → Salvar em PDF),
    extrai dados estruturados e mergeia no perfil do usuário.
    """
    logger.info(f"[LINKEDIN-PDF] Início - arquivo: {file.filename}")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie o PDF do seu perfil LinkedIn.",
        )

    content = await file.read()
    file_size = len(content)
    logger.info(f"[LINKEDIN-PDF] Arquivo lido: {file_size} bytes")

    if file_size > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 20MB.")

    if file_size < 500:
        raise HTTPException(status_code=400, detail="Arquivo muito pequeno ou corrompido.")

    # Parsear PDF
    try:
        dados = parse_linkedin_profile_pdf(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[LINKEDIN-PDF] Erro ao parsear: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar o PDF. Verifique se é um PDF de perfil do LinkedIn.")

    # Verificar se extraiu alguma coisa
    campos = dados.get("_campos_preenchidos", 0)
    if campos == 0 and not dados.get("nome") and not dados.get("skills"):
        raise HTTPException(
            status_code=422,
            detail="Não foi possível extrair dados do PDF. Verifique se é um PDF de perfil do LinkedIn."
        )

    # Mergear no perfil
    profile = get_or_create_profile(db)

    if dados.get("nome"):
        profile.nome = dados["nome"]

    if dados.get("pais"):
        profile.pais = dados["pais"]
    if dados.get("estado"):
        profile.estado = dados["estado"]
    if dados.get("cidade"):
        profile.cidade = dados["cidade"]

    # Skills: merge (union)
    if dados.get("skills"):
        novas_skills = list(set((profile.skills or []) + dados["skills"]))
        profile.skills = novas_skills
        flag_modified(profile, "skills")

    # Profissões de interesse
    if dados.get("profissoes_interesse"):
        profile.profissoes_interesse = dados["profissoes_interesse"]
        flag_modified(profile, "profissoes_interesse")

        primeiro = dados["profissoes_interesse"][0]
        if primeiro.get("anos_exp") and not profile.experiencia_anos:
            profile.experiencia_anos = primeiro["anos_exp"]
        if primeiro.get("nivel"):
            profile.nivel_minimo = primeiro["nivel"]

    # Formações
    if dados.get("formacoes"):
        profile.formacoes = dados["formacoes"]
        flag_modified(profile, "formacoes")

    # Idiomas
    if dados.get("idiomas"):
        profile.idiomas = dados["idiomas"]
        flag_modified(profile, "idiomas")

        for idioma in dados["idiomas"]:
            nome_idioma = (idioma.get("idioma") or "").lower()
            if nome_idioma in ("english", "inglês", "ingles"):
                profile.nivel_ingles = idioma.get("proficiencia", "intermediario")
                break

    # Marcar método de importação
    profile.import_method = "linkedin_pdf"

    db.commit()
    db.refresh(profile)

    logger.info(f"[LINKEDIN-PDF] Sucesso! {campos} campos preenchidos")

    return {
        "success": True,
        "dados_importados": {
            "nome": dados.get("nome"),
            "profissoes_interesse": dados.get("profissoes_interesse", []),
            "skills": dados.get("skills", []),
            "formacoes": dados.get("formacoes", []),
            "idiomas": dados.get("idiomas", []),
            "pais": dados.get("pais"),
            "estado": dados.get("estado"),
            "cidade": dados.get("cidade"),
        },
        "campos_preenchidos": campos,
    }


@router.delete("/curriculo/{arquivo_id}")
async def delete_curriculo(
    arquivo_id: str,
    db: Session = Depends(get_db)
):
    """Remove um currículo da lista do perfil."""
    profile = get_or_create_profile(db)
    arquivos_atuais = list(profile.arquivos_curriculo or [])
    
    filtro = [a for a in arquivos_atuais if a["id"] != arquivo_id]
    
    if len(filtro) == len(arquivos_atuais):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
        
    profile.arquivos_curriculo = filtro
    flag_modified(profile, "arquivos_curriculo")
    db.commit()
    db.refresh(profile)
    
    return {"message": "Currículo removido com sucesso", "arquivos": profile.arquivos_curriculo}


@router.post("/recalcular-scores")
def recalcular_scores_perfil(db: Session = Depends(get_db)):
    """
    Recalcula os scores de todas as vagas baseado no perfil atual.
    """
    from ..services.job_matcher import JobMatcher

    profile = get_or_create_profile(db)

    # Converte para dict para o matcher
    profile_dict = {
        "nome": profile.nome,
        "cargos_interesse": profile.cargos_interesse or [],
        "nivel_minimo": profile.nivel_minimo,
        "experiencia_anos": profile.experiencia_anos,
        "skills": profile.skills or [],
        "modalidades_aceitas": profile.modalidades_aceitas or [],
        "tipos_contrato": profile.tipos_contrato or [],
        "localizacoes": profile.localizacoes or [],
        "nivel_ingles": profile.nivel_ingles,
        "salario_minimo": profile.salario_minimo,
        "salario_maximo": profile.salario_maximo,
    }

    matcher = JobMatcher(profile_dict)

    # Busca todas as vagas pendentes
    vagas = db.query(models.Vaga).filter(
        models.Vaga.status == "pendente"
    ).all()

    atualizadas = 0
    for vaga in vagas:
        vaga_dict = {
            "titulo": vaga.titulo,
            "empresa": vaga.empresa,
            "nivel": vaga.nivel,
            "modalidade": vaga.modalidade,
            "tipo_contrato": vaga.tipo_contrato,
            "localizacao": vaga.localizacao,
            "skills_obrigatorias": vaga.skills_obrigatorias or [],
            "requisito_ingles": vaga.requisito_ingles,
            "salario_min": vaga.salario_min,
            "salario_max": vaga.salario_max,
        }

        resultado = matcher.calcular_score(vaga_dict)

        vaga.score_compatibilidade = resultado["score_total"]
        vaga.score_breakdown = resultado.get("breakdown")
        vaga.is_destaque = resultado["is_destaque"]
        atualizadas += 1

    db.commit()

    logger.info(f"Scores recalculados para {atualizadas} vagas")
    return {
        "message": f"Scores recalculados para {atualizadas} vagas",
        "total": atualizadas
    }
