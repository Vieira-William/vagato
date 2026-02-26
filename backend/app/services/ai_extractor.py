"""
Servico de extracao de informacoes estruturadas de vagas usando Claude API.
Estrategia otimizada: prompt unico compacto (~250 tokens) para validar + extrair.
"""
import json
import base64
import requests
from typing import Optional, List, Dict
import logging

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

from ..config import settings

logger = logging.getLogger(__name__)

# Mapeamentos de codigos compactos para valores completos
NIVEL_MAP = {
    "jr": "junior", "junior": "junior",
    "pl": "pleno", "pleno": "pleno",
    "sr": "senior", "senior": "senior",
    "ld": "lead", "lead": "lead",
    "hd": "head", "head": "head",
    "esp": "especialista", "staff": "especialista",
}

MODALIDADE_MAP = {
    "rem": "remoto", "remoto": "remoto", "remote": "remoto",
    "hib": "hibrido", "hibrido": "hibrido", "hybrid": "hibrido",
    "pre": "presencial", "presencial": "presencial", "onsite": "presencial",
}

CONTRATO_MAP = {
    "clt": "clt",
    "pj": "pj",
    "fl": "freelancer", "freelancer": "freelancer",
    "est": "estagio", "estagio": "estagio",
    "tmp": "temporario", "temporario": "temporario",
}

HORARIO_MAP = {
    "int": "integral", "integral": "integral", "full": "integral",
    "mt": "meio_periodo", "meio": "meio_periodo", "part": "meio_periodo",
    "flx": "flexivel", "flexivel": "flexivel", "flex": "flexivel",
    "proj": "por_projeto", "projeto": "por_projeto",
}

AREA_MAP = {
    "prod": "Produto", "produto": "Produto", "product": "Produto",
    "des": "Design", "design": "Design",
    "tech": "Tecnologia", "tecnologia": "Tecnologia", "ti": "Tecnologia",
    "mkt": "Marketing", "marketing": "Marketing",
    "dados": "Dados", "data": "Dados",
    "ux": "UX", "research": "Research",
}


class AIExtractor:
    """Servico para extracao de informacoes estruturadas de vagas usando Claude."""

    def __init__(self):
        if ANTHROPIC_AVAILABLE and settings.ANTHROPIC_API_KEY:
            self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.enabled = True
        else:
            self.client = None
            self.enabled = False
            if not ANTHROPIC_AVAILABLE:
                logger.warning("Biblioteca anthropic nao instalada. Extracao com IA desabilitada.")
            elif not settings.ANTHROPIC_API_KEY:
                logger.warning("ANTHROPIC_API_KEY nao configurada. Extracao com IA desabilitada.")

        self.settings = settings
        self.model = settings.CLAUDE_MODEL

    def extrair_compacto(self, texto: str, fonte: Optional[str] = None) -> Optional[Dict]:
        """
        Extração única compacta: valida se é vaga UX/Produto e extrai campos em um request.

        Economia: ~250 tokens vs ~600 tokens (2 etapas anteriores)

        Args:
            texto: Texto do post/vaga
            fonte: Fonte da vaga (indeed, linkedin_jobs, linkedin_posts)

        Returns:
            Dict com campos estruturados ou None se não for vaga UX/Produto
        """
        if not self.enabled:
            return None

        # Prompt compacto otimizado (~300 tokens originais+novos) - PRD v3 com 10 pilares + contatos + arrays compactos
        prompt = f"""Vaga UX/Produto? JSON ou null:
{{"v":1,"t":"titulo","e":"empresa","n":"jr|pl|sr|ld|hd","m":"rem|hib|pre","c":"clt|pj|fl|est","l":"local","h":"int|mt|flx","s":[min,max],"a":"area","i":"en|pt","ms":"missao","ap":"aplicar","wpp":"whatsapp","rp":["resp1","resp2"],"rq":["req1","req2"],"st":["ferramenta1","skill2"]}}

v=1 ACEITAR: Product Designer, UX Designer, UI Designer, UI/UX, UX/UI, UX Researcher, Product Manager, Product Owner, Design Lead, Service Designer, Head de Produto, Head de Design, Estágio UX, Design Ops
v=0 REJEITAR: Developer, Engineer, QA, Data Analyst, Marketing, DevOps, Backend, Frontend (sem UX/UI)
t=título do cargo EXATO (ex: Senior Product Designer)
e=empresa (setor se confidencial)
n=nível (jr=júnior,pl=pleno,sr=sênior,ld=lead,hd=head)
m=modelo (rem=remoto,hib=híbrido,pre=presencial)
c=contrato (clt,pj,fl=freelancer,est=estágio,int=internacional)
l=localização (cidade, estado ou país)
h=horário (int=integral,mt=meio período,flx=flexível)
s=[salário min,max] em BRL/USD/EUR ou null
a=área (prod=Produto,des=Design,tech=Tech,dados=Dados)
i=idioma trabalho (en=inglês,pt=português)
ms=missão/propósito da vaga (Pilar 6: 1 frase clara de impacto)
ap=como aplicar (link|email|dm|whatsapp|gupy|lever ou "comentários"/"mensagem no post")
wpp=número WhatsApp se mencionado ("11912345678" ou null)
rp=principais responsabilidades (máximo 3 bullets cruciais)
rq=requisitos técnicos/obrigatórios (máximo 3 essenciais)
st=stack/ferramentas principais (máximo 3, ex: Figma, React, Amplitude)

<texto>{texto[:2000]}</texto>"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=250, # Aumentado de 150 para 250 para caber os 3 arrays curtos
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()

            # Se retornou null, não é vaga UX/Produto
            if content.lower() == "null" or not content.startswith("{"):
                logger.debug(f"Post descartado: {texto[:80]}...")
                return None

            # Parse JSON
            json_str = self._extrair_json(content)
            data = json.loads(json_str)

            # Verifica flag de validação
            if not data.get("v"):
                logger.debug(f"Post descartado (v=0): {texto[:80]}...")
                return None

            # Log e Registro de Consumo
            if hasattr(response, 'usage'):
                self._registrar_custo(response.usage.input_tokens, response.usage.output_tokens, self.model)
                logger.info(f"IA [Texto]: {response.usage.input_tokens} in / {response.usage.output_tokens} out")

            # Decodifica e normaliza campos
            return self._decodificar_compacto(data, fonte)

        except json.JSONDecodeError as e:
            logger.warning(f"Erro ao parsear JSON: {e} - Response: {content[:200]}")
            return None
        except Exception as e:
            logger.error(f"Erro na extracao compacta: {e}")
            return None

    def _decodificar_compacto(self, data: Dict, fonte: Optional[str] = None) -> Dict:
        """Decodifica os códigos compactos para valores completos."""

        resultado = {
            # Campos principais
            "titulo": data.get("t") or "Vaga UX/Produto",
            "empresa": data.get("e"),
            "nivel": NIVEL_MAP.get(data.get("n"), "nao_especificado"),
            "modalidade": MODALIDADE_MAP.get(data.get("m"), "nao_especificado"),
            "tipo_contrato": CONTRATO_MAP.get(data.get("c"), "nao_especificado"),
            "localizacao": data.get("l"),
            "carga_horaria": HORARIO_MAP.get(data.get("h"), "nao_especificado"),
            "area_departamento": AREA_MAP.get(data.get("a"), "Design"),

            # Salário (array [min, max])
            "salario_min": None,
            "salario_max": None,
            "moeda_salario": "BRL",

            # Idioma
            "requisito_ingles": "fluente" if data.get("i") == "en" else "nao_especificado",

            # Fonte
            "fonte": fonte,

            # PRD v3: 10 Pilares - Missão e CTA
            "missao_vaga": data.get("ms"),  # Pilar 6: Por que a vaga existe
            "como_aplicar": data.get("ap"),  # Pilar 10: CTA explícito

            # NOVO: Arrays Estruturados Ultracompactos
            "responsabilidades": data.get("rp", []),
            "requisitos_obrigatorios": data.get("rq", []),
            "skills_obrigatorias": data.get("st", []),

            # NOVO: WhatsApp para contato direto
            "whatsapp_contato": data.get("wpp"),
        }

        # Processa salário
        salario = data.get("s")
        if isinstance(salario, list) and len(salario) >= 2:
            resultado["salario_min"] = salario[0] if salario[0] else None
            resultado["salario_max"] = salario[1] if salario[1] else None
        elif isinstance(salario, (int, float)):
            resultado["salario_min"] = salario
            resultado["salario_max"] = salario

        return resultado

    def processar_vaga(self, texto: str, links: Optional[List[str]] = None, fonte: Optional[str] = None) -> Optional[Dict]:
        """
        Processa uma vaga usando extração compacta.
        Mantido para compatibilidade com código existente.
        """
        return self.extrair_compacto(texto, fonte)

    def extrair_vaga(self, texto_post: str, links: Optional[List[str]] = None) -> Optional[Dict]:
        """Método legado para compatibilidade."""
        return self.extrair_compacto(texto_post)

    def extrair_batch(self, posts: List[Dict], fonte: Optional[str] = None) -> List[Dict]:
        """
        Processa múltiplos posts em batch.

        Args:
            posts: Lista de {"id": str, "texto": str, "links": list}
            fonte: Fonte das vagas

        Returns:
            Lista de vagas extraídas (apenas válidas)
        """
        if not self.enabled:
            logger.warning("Extracao em batch desabilitada - IA nao configurada")
            return []

        vagas = []
        total = len(posts)
        descartados = 0

        for i, post in enumerate(posts):
            if (i + 1) % 10 == 0:
                logger.info(f"Processando {i + 1}/{total}...")

            resultado = self.extrair_compacto(
                texto=post.get("texto", ""),
                fonte=fonte
            )

            if resultado:
                resultado["post_id"] = post.get("id")
                vagas.append(resultado)
            else:
                descartados += 1

        logger.info(f"Batch concluido: {len(vagas)} vagas validas, {descartados} descartadas")
        return vagas

    def _extrair_json(self, content: str) -> str:
        """Extrai JSON de uma string que pode ter texto extra."""
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start != -1 and json_end > json_start:
            return content[json_start:json_end]
        return content

    def is_enabled(self) -> bool:
        """Verifica se o servico esta habilitado."""
        return self.enabled

    def analisar_curriculo(self, texto_cv: str) -> Optional[Dict]:
        """
        Lê o texto extraído de um currículo e retorna JSON estruturado.
        Foca nas propriedades do Perfil de Usuário.
        """
        if not self.enabled:
            return None

        prompt = f"""Analise este currículo e extraia os dados estritamente em JSON válido:
{{"skills": ["habilidade1", "habilidade2"], "experiencia_anos": 5, "nivel_ingles": "intermediario", "nivel_minimo": "pleno"}}

Regras:
- skills: Lista de strings curtas (ex: React, Figma, UX Research). Limite a 15 skills cruciais.
- experiencia_anos: Inteiro com o total de anos trabalhando na área. Estime se não for explícito.
- nivel_ingles: Apenas um de: "nenhum", "basico", "intermediario", "fluente".
- nivel_minimo: Analise a experiência e julgue o momento atual do profissional entre: "junior", "pleno", "senior", "lead", "head".

Se não for um currículo ou não contiver texto o suficiente, retorne a string literal null.

<curriculo>
{texto_cv[:5000]}
</curriculo>"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text.strip()
            
            if content.lower() == "null" or not content.startswith("{"):
                return None

            json_str = self._extrair_json(content)
            data = json.loads(json_str)
            return data

        except Exception as e:
            logger.error(f"Erro na extração de currículo pela IA: {e}")
            return None

    def gerar_cold_message(self, vaga: Dict, perfil: Dict) -> Optional[str]:
        """Gera uma mensagem (pitch) customizada do candidato para a vaga e recrutador."""
        if not self.enabled:
            return None

        prompt = f"""Você é um {perfil.get('cargo', 'Product Designer')} excepcional e proativo. Crie UMA mensagem curta de "Cold message" (para LinkedIn DM ou e-mail) focada nesta vaga.

Regras INEGOCIÁVEIS:
1. Comece com "Olá!". Seja direto, muito natural, humano e confiante. Nada de jargões robóticos.
2. Conecte rapidamente as SKILLS do seu perfil com a MISSÃO ou REQUISITOS da vaga. Mostre que você resolve a dor deles.
3. Se a vaga cita uma Missão/Propósito específico, use isso a seu favor para gerar empatia.
4. Termine com um Call to Action sutil (ex: convite para um bate-papo).
5. Mantenha curtíssimo: sob 120 palavras.
6. Retorne APENAS o texto livre da mensagem. Nem uma palavra a mais.

Vaga: {vaga.get('titulo')} na empresa {vaga.get('empresa', 'Não divulgada')}.
Missão da empresa/vaga: {vaga.get('missao_vaga', '')}
Responsabilidades: {', '.join(vaga.get('responsabilidades', [])[:3])}
Requisitos: {', '.join(vaga.get('requisitos_obrigatorios', [])[:3])}

Meu Perfil Real:
Nível: {perfil.get('nivel')}
Minhas Skills: {', '.join(perfil.get('skills', [])[:8])}
"""

        try:
            # Upgrade para Sonnet para máxima qualidade no Pitch
            modelo_premium = self.settings.CLAUDE_MODEL_PREMIUM
            
            response = self.client.messages.create(
                model=modelo_premium,
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )

            # Registro de consumo premium
            if hasattr(response, 'usage'):
                self._registrar_custo(response.usage.input_tokens, response.usage.output_tokens, modelo_premium)

            return response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Erro na geração de cold message pela IA: {e}")
            return None

    def _registrar_custo(self, tokens_in: int, tokens_out: int, modelo: str):
        """Calcula e registra o custo da operação no banco de dados."""
        from ..database import SessionLocal
        from ..models import ConfiguracaoIA

        # Determina taxas com base no modelo
        is_sonnet = "sonnet" in modelo.lower()
        is_vision = "vision" in modelo.lower() or "image" in modelo.lower()
        taxa_in = self.settings.COST_PER_1K_INPUT_SONNET if is_sonnet else self.settings.COST_PER_1K_INPUT_HAIKU
        taxa_out = self.settings.COST_PER_1K_OUTPUT_SONNET if is_sonnet else self.settings.COST_PER_1K_OUTPUT_HAIKU

        custo_usd = (tokens_in * taxa_in / 1000) + (tokens_out * taxa_out / 1000)

        db = SessionLocal()
        try:
            config = db.query(ConfiguracaoIA).first()
            if not config:
                # Cria registro inicial se não existir ($10 de crédito inicial fictício)
                config = ConfiguracaoIA(saldo_inicial_usd=10.0, gasto_acumulado_usd=0.0)
                db.add(config)

            # Atualiza totais
            config.gasto_acumulado_usd += custo_usd

            # Rastreia por tipo de modelo
            if is_sonnet:
                config.sonnet_calls += 1
                config.gasto_sonnet_usd += custo_usd
            elif is_vision:
                config.vision_calls += 1
                config.gasto_vision_usd += custo_usd
            else:
                config.haiku_calls += 1
                config.gasto_haiku_usd += custo_usd

            db.commit()
            logger.debug(f"Débito IA: ${custo_usd:.6f} ({modelo}) | Saldo: ${config.saldo_disponivel:.2f}")
        except Exception as e:
            logger.error(f"Erro ao registrar custo IA: {e}")
        finally:
            db.close()

    def _is_relevant_for_ocr(self, texto: Optional[str], urls: List[str]) -> bool:
        """Verifica localmente se o post tem alta chance de conter uma vaga UX/Produto."""
        if not urls:
            return False
            
        # Se não tem texto nenhum mas tem imagens, pode ser um carrossel de vaga puro
        if not texto:
            return len(urls) >= 1

        texto_lower = texto.lower()
        
        # Palavras-chave de contratação
        termos_vaga = ["vaga", "contratando", "hiring", "oportunidade", "opportunity", "open to", "apply", "candidate-se", "estamos buscando", "buscamos"]
        # Palavras-chave de UX/Produto
        termos_ux = ["ux", "ui", "product", "designer", "researcher", "pesquisador", "writing", "design", "produto"]
        
        tem_vaga = any(t in texto_lower for t in termos_vaga)
        tem_ux = any(t in texto_lower for t in termos_ux)
        
        # Se tem ambos, é muito provável ser vaga
        if tem_vaga and tem_ux:
            return True
            
        # Se o texto é muito curto e tem imagens, vale o risco do OCR mesmo sem keywords fortes
        if len(texto) < 150 and len(urls) >= 1:
            return True
            
        return False

    def extrair_de_imagem(self, urls_imagens: List[str], texto_post: Optional[str] = None, fonte: str = "linkedin_posts") -> Optional[Dict]:
        """
        Extrai informações de uma ou mais imagens (carrossel) usando Claude Vision.
        Otimizado: Filtro heurístico local + Claude Haiku para economia de tokens.
        """
        if not self.enabled or not urls_imagens:
            return None

        # OPÇÃO 1: Filtro Heurístico Local
        if not self._is_relevant_for_ocr(texto_post, urls_imagens):
            # Se não parece relevante, tenta a extração compacta de texto apenas (se houver texto)
            # ou descarta para economizar tokens de visão
            logger.debug("Vision ignorado por filtro heurístico local.")
            if texto_post and len(texto_post) > 50:
                return self.extrair_compacto(texto_post, fonte)
            return None

        # Baixa e converte imagens para base64
        conteudo_multimodal = []
        
        # Se tiver texto, adiciona como contexto inicial
        if texto_post:
            conteudo_multimodal.append({
                "type": "text",
                "text": f"Contexto do post: {texto_post[:1000]}"
            })

        for i, url in enumerate(urls_imagens[:5]): # Limite de 5 imagens para evitar flood
            try:
                response = requests.get(url, timeout=15)
                if response.status_code == 200:
                    image_data = base64.b64encode(response.content).decode("utf-8")
                    media_type = response.headers.get("Content-Type", "image/jpeg")
                    # Anthropic espera apenas image/jpeg, image/png, image/gif, image/webp
                    if "jpeg" not in media_type and "png" not in media_type and "webp" not in media_type and "gif" not in media_type:
                        media_type = "image/jpeg"
                    
                    conteudo_multimodal.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data
                        }
                    })
            except Exception as e:
                logger.warning(f"Falha ao baixar imagem para OCR {url}: {e}")
                continue

        if not any(item["type"] == "image" for item in conteudo_multimodal):
            return self.extrair_compacto(texto_post, fonte) if texto_post else None

        prompt_vision = f"""Analise as imagens (carrossel de vaga) e o contexto. 
Vaga UX/Produto? JSON ou null:
{{"v":1,"t":"titulo","e":"empresa","n":"jr|pl|sr|ld|hd","m":"rem|hib|pre","c":"clt|pj|fl|est","l":"local","h":"int|mt|flx","s":[min,max],"a":"area","i":"en|pt","ms":"missao","ap":"aplicar","wpp":"whatsapp","rp":["resp1","resp2"],"rq":["req1","req2"],"st":["ferramenta1","skill2"]}}

v=1 ACEITAR: Design de Produto, UX, UI, Product Manager, Research, Writing.
v=0 REJEITAR: Outras áreas.
SEJA CRITERIOSO NO OCR. Retorne APENAS o JSON."""

        conteudo_multimodal.append({
            "type": "text",
            "text": prompt_vision
        })

        try:
            # OPÇÃO 2: Usar Claude 3 Haiku para Vision (mais barato)
            # Hardcoded para garantir o menor custo em tarefas de OCR
            model_ocr = "claude-3-haiku-20240307"
            
            response = self.client.messages.create(
                model=model_ocr,
                max_tokens=500,
                messages=[{"role": "user", "content": conteudo_multimodal}]
            )

            content = response.content[0].text.strip()
            
            # Log e Registro de Consumo para Vision (Haiku)
            if hasattr(response, 'usage'):
                self._registrar_custo(response.usage.input_tokens, response.usage.output_tokens, model_ocr)
                logger.info(f"IA [Vision]: {response.usage.input_tokens} in / {response.usage.output_tokens} out")
            
            if content.lower() == "null" or not content.startswith("{"):
                return None

            json_str = self._extrair_json(content)
            data = json.loads(json_str)
            
            if not data.get("v"):
                return None

            return self._decodificar_compacto(data, fonte)

        except Exception as e:
            logger.error(f"Erro na extração multimodal Vision: {e}")
            return None


# =====================
# MÉTODOS LEGADOS (compatibilidade)
# =====================

    def validar_vaga(self, texto: str) -> Optional[Dict]:
        """
        Método legado - agora usa extração compacta.
        Retorna {"eh_vaga": bool, "cargo": str, "nivel": str}
        """
        resultado = self.extrair_compacto(texto)
        if resultado:
            return {
                "eh_vaga": True,
                "cargo": resultado.get("titulo"),
                "nivel": resultado.get("nivel")
            }
        return {"eh_vaga": False, "cargo": None, "nivel": None}

    def extrair_vaga_completa(self, texto: str, links: Optional[List[str]] = None) -> Optional[Dict]:
        """Método legado - agora usa extração compacta."""
        return self.extrair_compacto(texto)
