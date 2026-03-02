import pytest
from app.services.job_matcher import JobMatcher

@pytest.fixture
def user_profile():
    return {
        "skills": ["Python", "React", "Figma", "UI Design"],
        "nivel_minimo": "pleno",
        "modalidades_aceitas": ["remoto", "hibrido"],
        "tipos_contrato": ["clt", "pj"],
        "salario_minimo": 8000,
        "salario_maximo": 12000,
        "nivel_ingles": "intermediario",
        "localizacoes": ["sao paulo", "brasil"]
    }

def test_match_skills_perfect(user_profile):
    matcher = JobMatcher(user_profile)
    vaga = {
        "skills_obrigatorias": ["Python", "Figma"],
        "skills_desejaveis": ["React"]
    }
    score = matcher._match_skills(vaga)
    assert score == 1.0

def test_match_skills_partial(user_profile):
    matcher = JobMatcher(user_profile)
    vaga = {
        "skills_obrigatorias": ["Python", "Java"], # Match 50%
        "skills_desejaveis": ["React", "AWS"]      # Match 50%
    }
    score = matcher._match_skills(vaga)
    # 70% * 0.5 + 30% * 0.5 = 0.5
    assert score == 0.5

def test_match_nivel(user_profile):
    matcher = JobMatcher(user_profile)
    
    # Exato
    assert matcher._match_nivel({"nivel": "pleno"}) == 1.0
    # Um acima
    assert matcher._match_nivel({"nivel": "senior"}) == 0.9
    # Um abaixo
    assert matcher._match_nivel({"nivel": "junior"}) == 0.7
    # Dois acima
    assert matcher._match_nivel({"nivel": "lead"}) == 0.6
    # Muito distante
    assert matcher._match_nivel({"nivel": "head"}) == 0.3

def test_match_modalidade(user_profile):
    matcher = JobMatcher(user_profile)
    assert matcher._match_modalidade({"modalidade": "remoto"}) == 1.0
    assert matcher._match_modalidade({"modalidade": "hibrido"}) == 1.0
    assert matcher._match_modalidade({"modalidade": "presencial"}) == 0.3

def test_match_salario(user_profile):
    matcher = JobMatcher(user_profile)
    
    # Exatamente no range do usuario
    assert matcher._match_salario({"salario_min": 9000}) == 1.0
    # Acima do esperado, mas dentro da margem de 1.5x (12000 * 1.5 = 18000)
    assert matcher._match_salario({"salario_min": 15000}) == 1.0
    # Muito acima (acima de 18000), o sistema dá 0.9 por cautela de ser muito sênior ou fora do fit
    assert matcher._match_salario({"salario_min": 20000}) == 0.9
    # Um pouco abaixo (10% abaixo de 8000) -> ration 7200/8000
    assert matcher._match_salario({"salario_min": 7200}) == 0.9
    # Muito abaixo (60%)
    assert matcher._match_salario({"salario_max": 4800}) == 0.6

def test_calcular_score_destaque(user_profile):
    matcher = JobMatcher(user_profile)
    vaga_perfeita = {
        "skills_obrigatorias": ["Python", "React"],
        "nivel": "pleno",
        "modalidade": "remoto",
        "tipo_contrato": "pj",
        "salario_min": 10000,
        "requisito_ingles": "intermediario",
        "localizacao": "remoto"
    }
    
    resultado = matcher.calcular_score(vaga_perfeita)
    
    assert resultado["score_total"] > 0.8
    assert resultado["is_destaque"] is True
    assert "Alta compatibilidade de skills" in resultado["motivos_destaque"]
    assert "Modalidade preferida" in resultado["motivos_destaque"]
