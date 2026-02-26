"""
Analisa posts coletados usando Claude API para extrair dados de aplicação.
"""
import anthropic
import json
import os
from datetime import date

# Prompt otimizado para mínimo de tokens
PROMPT_TEMPLATE = """Analise posts de vaga UX/Product. Para cada, extraia:
- eh_vaga_ux: true se for vaga de UX/Product Design, false se não
- titulo: cargo da vaga
- aplicar: "link"|"email"|"contato"|"indefinido"
- url: link para aplicar (escolha do array links o mais relevante)
- email: email para aplicar (se tiver no texto)
- perfil: URL perfil linkedin (SÓ se texto pedir para entrar em contato)
- empresa: nome da empresa (se mencionada)
- modalidade: remoto/hibrido/presencial/indefinido

Posts: {posts}
Responda APENAS JSON array."""


def analisar_posts_com_ia(posts_raw, api_key=None):
    """
    Analisa lista de posts brutos com Claude API.

    Args:
        posts_raw: Lista de dicts com {id, texto, links}
        api_key: Anthropic API key (ou usa env var)

    Returns:
        Lista de vagas processadas
    """
    if not api_key:
        api_key = os.environ.get("ANTHROPIC_API_KEY")

    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY não configurada")

    client = anthropic.Anthropic(api_key=api_key)

    # Processa em batches de 20 posts
    BATCH_SIZE = 20
    todas_vagas = []

    for i in range(0, len(posts_raw), BATCH_SIZE):
        batch = posts_raw[i:i + BATCH_SIZE]

        # Prepara dados para o prompt (texto resumido + links)
        posts_resumidos = []
        for p in batch:
            posts_resumidos.append({
                "id": p["id"],
                "texto": p["texto"][:300],  # Limita texto
                "links": p.get("links", [])[:5]  # Limita links
            })

        prompt = PROMPT_TEMPLATE.format(posts=json.dumps(posts_resumidos, ensure_ascii=False))

        try:
            response = client.messages.create(
                model="claude-3-haiku-20240307",  # Modelo mais barato
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse da resposta (tenta extrair JSON mesmo se tiver texto extra)
            resposta_texto = response.content[0].text.strip()

            # Tenta encontrar o array JSON na resposta
            if resposta_texto.startswith("["):
                json_str = resposta_texto
            else:
                # Procura por [ ... ] na resposta
                start = resposta_texto.find("[")
                end = resposta_texto.rfind("]") + 1
                if start != -1 and end > start:
                    json_str = resposta_texto[start:end]
                else:
                    print(f"  Batch {i//BATCH_SIZE + 1}: Resposta sem JSON válido")
                    continue

            vagas_batch = json.loads(json_str)

            # Filtra apenas vagas UX válidas
            for vaga in vagas_batch:
                if vaga.get("eh_vaga_ux") and vaga.get("aplicar") != "indefinido":
                    # Mapeia forma de contato para valores válidos do enum
                    forma_contato = vaga.get("aplicar", "mensagem")
                    if forma_contato == "contato":
                        forma_contato = "mensagem"

                    # Mapeia modalidade para valores válidos
                    modalidade = vaga.get("modalidade", "nao_especificado")
                    if modalidade not in ["remoto", "hibrido", "presencial"]:
                        modalidade = "nao_especificado"

                    todas_vagas.append({
                        "titulo": vaga.get("titulo", "Vaga UX"),
                        "empresa": vaga.get("empresa"),
                        "tipo_vaga": "UX/UI Designer",
                        "fonte": "linkedin_posts",
                        "link_vaga": vaga.get("url"),
                        "localizacao": None,
                        "modalidade": modalidade,
                        "requisito_ingles": "nao_especificado",
                        "forma_contato": forma_contato,
                        "email_contato": vaga.get("email"),
                        "perfil_autor": vaga.get("perfil"),
                        "nome_autor": None,
                        "data_coleta": date.today().isoformat(),
                    })

            print(f"  Batch {i//BATCH_SIZE + 1}: {len(vagas_batch)} analisados, {len([v for v in vagas_batch if v.get('eh_vaga_ux')])} vagas UX")
            print(f"    Tokens: in={response.usage.input_tokens}, out={response.usage.output_tokens}")

        except Exception as e:
            print(f"  Erro no batch {i//BATCH_SIZE + 1}: {e}")
            continue

    return todas_vagas


if __name__ == "__main__":
    # Teste
    posts_teste = [
        {"id": 1, "texto": "Vaga Product Designer remoto na Startup XYZ", "links": ["lnkd.in/abc"]},
        {"id": 2, "texto": "UX Designer. Envie CV para rh@empresa.com", "links": []},
    ]

    vagas = analisar_posts_com_ia(posts_teste)
    print(f"\nVagas extraídas: {len(vagas)}")
    for v in vagas:
        print(f"  - {v['titulo']}: {v['forma_contato']}")
