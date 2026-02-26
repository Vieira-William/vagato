import os
import sys
import base64
import requests
from typing import Optional

import logging

# Configura logging para aparecer no console durante o teste
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Adiciona o path do backend para importar os módulos
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.ai_extractor import AIExtractor
from app.config import settings

def test_cost_simulation():
    print("=== TESTE DE CUSTO: CLAUDE VISION (OCR) ===")
    extractor = AIExtractor()
    
    if not extractor.is_enabled():
        print("Erro: API Key não configurada.")
        return

    # Usaremos uma imagem de exemplo pública (ou simularemos se necessário)
    test_image_url = "https://media.licdn.com/dms/image/v2/D4D12AQF-8H-pL_yJ8Q/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1691157144510?e=2147483647&v=beta&t=UeN0O0P_L0P8Zp-S_X0_0_0_0" 
    # Disclaimer: Essa URL é apenas para teste de download.
    
    texto_contexto = "Vaga de Product Designer na empresa X. Veja detalhes na imagem."
    
    print(f"1. Testando Filtro Heurístico Local...")
    is_relevant = extractor._is_relevant_for_ocr(texto_contexto, [test_image_url])
    print(f"   Relevante para OCR? {'SIM' if is_relevant else 'NÃO'}")
    
    print(f"\n2. Executando extração real visual (via Claude Haiku)...")
    try:
        # Nota: O uso de tokens é retornado pela API da Anthropic
        # Vamos monkeypatch o client temporariamente para capturar o uso se o log não mostrar
        
        vaga = extractor.extrair_de_imagem([test_image_url], texto_contexto)
        
        if vaga:
            print("\n   [RESULTADO DA EXTRAÇÃO]")
            print(f"   Título: {vaga.get('titulo')}")
            print(f"   Empresa: {vaga.get('empresa')}")
            print(f"   Como Aplicar: {vaga.get('como_aplicar')}")
            
            # Cálculo estimado baseado em Haiku (Input: $0.25/M, Output: $1.25/M)
            # Imagem ~1600 tokens, Prompt ~400 tokens, Out ~200 tokens
            input_tokens = 2000 # Estimativa média para 1 imagem + prompt
            output_tokens = 250
            cost = (input_tokens * 0.00025 / 1000) + (output_tokens * 0.00125 / 1000)
            
            print(f"\n   [MÉTRICAS ESTIMADAS]")
            print(f"   Tokens Entrada (est): {input_tokens}")
            print(f"   Tokens Saída (est): {output_tokens}")
            print(f"   Custo Estimado: ${cost:.5f} USD (aprox. R$ {cost*5.1:.4f})")
            print(f"   Economia vs Sonnet: ~12x mais barato")
        else:
            print("   IA descartou o post ou falhou na extração.")
            
    except Exception as e:
        print(f"Erro no teste real: {e}")

if __name__ == "__main__":
    test_cost_simulation()
