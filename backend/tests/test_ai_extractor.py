import pytest
import json
from unittest.mock import MagicMock
from app.services.ai_extractor import AIExtractor

@pytest.fixture
def mock_anthropic_client(mocker):
    # Cria os mocks do Anthropic para evitar chamadas reais
    mock_client = MagicMock()
    mock_messages = MagicMock()
    mock_create = MagicMock()
    
    mock_client.messages = mock_messages
    mock_messages.create = mock_create
    
    # Substitui a class Anthropic real pelo mock ANTES do extractor ser inicializado
    mocker.patch('app.services.ai_extractor.anthropic.Anthropic', return_value=mock_client)
    mocker.patch('app.services.ai_extractor.settings.ANTHROPIC_API_KEY', 'dummy_key')
    return mock_create

@pytest.fixture
def extractor(mock_anthropic_client):
    # Ao instanciar aqui, o mock_anthropic_client ja fez o patch
    extractor = AIExtractor()
    return extractor

def test_extrair_compacto_sucesso(extractor, mock_anthropic_client):
    """Testa a extração de uma vaga válida perfeitamente estruturada."""
    
    mock_response = MagicMock()
    # Mock do JSON de retorno da API
    mock_content = '{"v": 1, "t": "Senior Product Designer", "e": "Nubank", "n": "sr", "m": "rem", "c": "clt", "l": "Sao Paulo", "h": "int", "s": [12000, 15000], "a": "des", "i": "en", "ms": "Revolucionar o sistema financeiro", "ap": "link_aqui", "wpp": null, "rp": ["Criar jornadas de usuario", "Prototipagem em Figma"], "rq": ["5 anos de exp", "Ingles Avancado"], "st": ["Figma", "Miro"]}'
    
    mock_response.content = [MagicMock(text=mock_content)]
    
    # Simular o usage object para o registro de custo não quebrar
    mock_usage = MagicMock()
    mock_usage.input_tokens = 50
    mock_usage.output_tokens = 200
    mock_response.usage = mock_usage
    
    # Configurar o mock de gravação de custo para ignorar DB real
    extractor._registrar_custo = MagicMock()
    
    mock_anthropic_client.return_value = mock_response

    texto_post = "Temos uma vaga para Senior Product Designer..."
    resultado = extractor.extrair_compacto(texto_post, "linkedin")

    assert mock_anthropic_client.called
    assert resultado is not None
    assert resultado["titulo"] == "Senior Product Designer"
    assert resultado["empresa"] == "Nubank"
    assert resultado["nivel"] == "senior"
    assert resultado["modalidade"] == "remoto"
    assert resultado["tipo_contrato"] == "clt"
    assert resultado["salario_min"] == 12000
    assert resultado["salario_max"] == 15000
    assert len(resultado["responsabilidades"]) == 2
    assert "Figma" in resultado["skills_obrigatorias"]

def test_extrair_compacto_rejeitado(extractor, mock_anthropic_client):
    """Testa como o sistema lida com uma vaga que não é de UX (ex: Developer)."""
    
    mock_response = MagicMock()
    # v=0 significa que a IA rejeitou a vaga pois não é do nicho
    mock_content = """{"v": 0}"""
    mock_response.content = [MagicMock(text=mock_content)]
    mock_anthropic_client.return_value = mock_response

    texto_post = "Vaga para Desenvolvedor Backend Golang..."
    resultado = extractor.extrair_compacto(texto_post)

    assert resultado is None

def test_extrair_compacto_json_quebrado(extractor, mock_anthropic_client):
    """Testa a resiliência caso a IA retorne algo que não é JSON."""
    
    mock_response = MagicMock()
    # Simula a IA devolvendo texto cru em vez de JSON ou algo corrompido
    mock_content = "Vaga interessante, mas não consegui parsear o JSON"
    mock_response.content = [MagicMock(text=mock_content)]
    mock_anthropic_client.return_value = mock_response

    resultado = extractor.extrair_compacto("Qualquer texto")

    # Deve tratar o erro silenciosamente e retornar None
    assert resultado is None

def test_decodificacao_salario_incompleto(extractor):
    """Testa os casos extremos do array de salário onde apenas 1 valor ou tipos estranhos chegam."""
    
    # 1. Array com apenas 1 item
    data1 = {"t": "Designer", "s": [10000]}
    res1 = extractor._decodificar_compacto(data1)
    assert res1["salario_min"] is None
    assert res1["salario_max"] is None

    # 2. Inteiro limpo passado incorretamente fora do array pela IA
    data2 = {"t": "Designer", "s": 5000}
    res2 = extractor._decodificar_compacto(data2)
    assert res2["salario_min"] == 5000
    assert res2["salario_max"] == 5000
