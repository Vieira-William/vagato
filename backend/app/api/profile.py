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

router = APIRouter(prefix="/profile", tags=["profile"])
logger = logging.getLogger(__name__)


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

    for field, value in update_data.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

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
