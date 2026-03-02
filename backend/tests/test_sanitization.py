import pytest
from pydantic import ValidationError
from app.schemas import VagaCreate, NivelEnum, ModalidadeEnum, InglesEnum

def test_vaga_sanitization_valid_data():
    """Testa a criação de uma vaga com dados perfeitamente limpos"""
    vaga_data = {
        "titulo": "Product Designer Pleno",
        "empresa": "TechCorp",
        "nivel": "pleno",
        "modalidade": "remoto",
        "salario_min": 8000.0,
        "skills_obrigatorias": ["Figma", "UX Research"],
        "data_coleta": "2026-02-27"
    }
    vaga = VagaCreate(**vaga_data)
    assert vaga.titulo == "Product Designer Pleno"
    assert vaga.nivel == NivelEnum.pleno
    assert vaga.modalidade == ModalidadeEnum.remoto
    assert len(vaga.skills_obrigatorias) == 2

def test_vaga_sanitization_dirty_enums():
    """Testa como o Pydantic lida com Enums sujos vindo do scraper/IA"""
    # Nivel invalido deve cair pro default (nao_especificado) via validator _safe_enum
    vaga_data = {
        "titulo": "Designer",
        "nivel": "super_avancado", # Invalido
        "modalidade": "home_office", # Invalido
        "requisito_ingles": "fluente", # Valido
        "data_coleta": "2026-02-27"
    }
    vaga = VagaCreate(**vaga_data)
    
    # Nosso validator safe_enum garante que nao quebra, mas reseta pro default
    assert vaga.nivel == NivelEnum.nao_especificado
    assert vaga.modalidade == ModalidadeEnum.nao_especificado
    assert vaga.requisito_ingles == InglesEnum.fluente

def test_vaga_sanitization_dirty_arrays():
    """Testa sanitizacao de arrays (skills, responsabilidades) recebendo strings JSON ou nulos"""
    vaga_data = {
        "titulo": "UX/UI",
        "skills_obrigatorias": '["Figma", "Miro"]', # Stringify JSON ao inves de list
        "responsabilidades": None, # Null literal
        "beneficios": "Plano de saude", # Passando string simples em vez de lista
        "data_coleta": "2026-02-27"
    }

    # Pydantic v2 vai tentar forcar as listas baseadas nas anotacoes
    vaga = VagaCreate(**vaga_data)
    
    # Nosso safe_list converte strings json validas em arrays
    assert isinstance(vaga.skills_obrigatorias, list)
    assert len(vaga.skills_obrigatorias) == 2
    
    # Nulls sao convertidos em listas vazias
    assert isinstance(vaga.responsabilidades, list)
    assert len(vaga.responsabilidades) == 0

def test_vaga_truncation_limits():
    """Testa os limites de max_length de strings maliciosas/gigantes"""
    nome_gigante = "T" * 500
    
    vaga_data = {
        "titulo": nome_gigante, # field validator string length
        "data_coleta": "2026-02-27"
    }
    
    with pytest.raises(ValidationError) as exc_info:
        VagaCreate(**vaga_data)
    
    assert "String should have at most 200 characters" in str(exc_info.value)
