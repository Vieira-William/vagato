"""
Servico de classificacao inteligente de e-mails para processos seletivos.
Pipeline: Gmail API -> Pre-filtro keywords -> Claude Haiku classifica -> Cache PostgreSQL
"""
import json
import base64
import re
import os
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List, Dict

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from ..config import settings
from ..database import SessionLocal
from ..models import SmartEmailCache, ConfiguracaoIA

logger = logging.getLogger(__name__)

# ─── Constantes ──────────────────────────────────────────────────────────────────

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
TOKEN_PATH = str(_BASE_DIR / "data" / "google_gmail_token.json")
GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

GMAIL_QUERY = (
    "newer_than:3d "
    "-category:promotions "
    "-category:social "
    "-category:updates "
    "-category:forums "
    "-label:spam "
    "in:inbox"
)
MAX_FETCH = 50
CACHE_TTL_HOURS = 6
MODEL = "claude-haiku-4-5-20251001"

# Custos Haiku 4.5 (USD por 1K tokens)
COST_PER_1K_INPUT = 0.001
COST_PER_1K_OUTPUT = 0.005

# ─── Keywords de pre-filtro (PT-BR + EN) ─────────────────────────────────────────

JOB_KEYWORDS = {
    'pt': [
        'processo seletivo', 'seleção', 'recrutamento',
        'candidatura', 'vaga', 'oportunidade',
        'currículo', 'curriculum', 'cv ',
        'entrevista', 'entrevistar',
        'dinâmica de grupo', 'teste técnico', 'case',
        'proposta', 'oferta de emprego', 'carta proposta',
        'contratação', 'admissão', 'onboarding',
        'feedback', 'retorno', 'resultado',
        'aprovado', 'aprovação', 'selecionado',
        'próxima fase', 'próxima etapa', 'avançou',
        'agendamento', 'agendar', 'reunião',
        'não selecionado', 'encerrado', 'negativa',
        'linkedin', 'glassdoor', 'gupy', 'lever', 'greenhouse',
        'workable', 'indeed', 'catho', 'infojobs', 'vagas.com',
    ],
    'en': [
        'application', 'applied', 'applying',
        'interview', 'screening', 'phone screen',
        'offer letter', 'job offer', 'compensation',
        'hiring', 'recruiter', 'talent acquisition',
        'next steps', 'next round', 'moved forward',
        'shortlisted', 'selected', 'congratulations',
        'unfortunately', 'regret to inform', 'not moving forward',
        'assessment', 'technical challenge', 'take-home',
        'onsite', 'on-site', 'panel interview',
        'background check', 'reference check',
        'start date', 'joining date',
    ]
}

ALL_KEYWORDS = JOB_KEYWORDS['pt'] + JOB_KEYWORDS['en']

# ─── Assinaturas de e-mail (para limpeza do corpo) ──────────────────────────────

SIGNATURE_MARKERS = [
    '\n-- \n', '\n---\n', '\n____', '\n━━━',
    'sent from my', 'enviado do meu',
    'atenciosamente', 'att,', 'att.',
    'regards,', 'best regards', 'kind regards',
    'get outlook for', 'baixar outlook',
]

# ─── Prompt de classificacao ─────────────────────────────────────────────────────

CLASSIFICATION_SYSTEM_PROMPT = """Você é um assistente especializado em triagem de e-mails para candidatos a vagas de emprego.

Sua tarefa: Analisar e-mails e identificar quais são RELEVANTES para processos seletivos de emprego.

Para cada e-mail relevante, você deve:
1. CLASSIFICAR a categoria
2. DETERMINAR a prioridade/urgência
3. EXTRAIR informações-chave
4. GERAR um resumo acionável

## CATEGORIAS DE E-MAIL

| Categoria | Código |
|-----------|--------|
| Entrevista agendada | INTERVIEW_SCHEDULED |
| Aprovação de fase | STAGE_APPROVED |
| Proposta/Oferta | OFFER |
| Feedback positivo | POSITIVE_FEEDBACK |
| Teste/Desafio técnico | TECHNICAL_CHALLENGE |
| Solicitação de documentos | DOCUMENTS_REQUEST |
| Confirmação de candidatura | APPLICATION_CONFIRMED |
| Rejeição | REJECTION |
| Follow-up necessário | FOLLOW_UP_NEEDED |
| Informativo | INFORMATIVE |
| NÃO RELEVANTE | NOT_RELEVANT |

## REGRAS DE PRIORIDADE

| Prioridade | Critérios |
|------------|-----------|
| urgent | Entrevista em <48h, proposta com prazo, resposta exigida HOJE |
| high | Aprovação de fase, teste técnico com prazo, entrevista em <7 dias |
| medium | Confirmação de candidatura, feedback, documentos solicitados |
| low | Rejeição, informativos, confirmações sem ação necessária |

## REGRAS ESPECIAIS

- Se menciona DATA/HORÁRIO de entrevista → SEMPRE urgent
- Se menciona PRAZO para entregar algo → urgência proporcional ao prazo
- Se é REJEIÇÃO → prioridade low (mas relevante)
- Se contém "parabéns"/"congratulations" → provavelmente OFFER ou STAGE_APPROVED
- Se NÃO for sobre processo seletivo → NOT_RELEVANT

## FORMATO DE RESPOSTA

Responda APENAS com JSON válido, sem markdown, sem explicações:

{"emails": [{"message_id": "id", "is_relevant": true, "category": "INTERVIEW_SCHEDULED", "priority": "urgent", "company_name": "Empresa X", "job_title": "UX Designer Senior", "summary": "Recrutadora confirmou entrevista para sexta 14h", "action_required": "Confirmar presença", "deadline": "2026-03-06T14:00:00", "sentiment": "positive"}]}

Se nenhum e-mail for relevante, retorne: {"emails": []}"""


# ─── Helpers ─────────────────────────────────────────────────────────────────────

def _clean_body(text: str) -> str:
    """Remove assinaturas e limita corpo do e-mail."""
    if not text:
        return ""
    text_lower = text.lower()
    # Corta na primeira assinatura encontrada
    earliest = len(text)
    for marker in SIGNATURE_MARKERS:
        pos = text_lower.find(marker)
        if pos != -1 and pos < earliest:
            earliest = pos
    return text[:earliest].strip()[:2000]


def _extract_body(payload: dict) -> str:
    """Extrai corpo text/plain de um payload Gmail API."""
    body = ""

    def _walk(part):
        nonlocal body
        if body:
            return  # Ja encontrou
        mime = part.get("mimeType", "")
        if mime == "text/plain" and "data" in part.get("body", {}):
            try:
                body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
            except Exception:
                pass
        for sub in part.get("parts", []):
            _walk(sub)

    _walk(payload)
    return _clean_body(body)


def _parse_sender(from_header: str) -> tuple:
    """Extrai nome e email do header From."""
    from email.utils import parseaddr
    name, email_addr = parseaddr(from_header)
    return name or email_addr, email_addr


def _pre_filter(emails: List[Dict]) -> List[Dict]:
    """Filtra e-mails que provavelmente sao sobre processos seletivos."""
    filtered = []
    for email in emails:
        searchable = f"{email.get('subject', '')} {email.get('snippet', '')} {email.get('body_text', '')}".lower()
        if any(kw in searchable for kw in ALL_KEYWORDS):
            filtered.append(email)
    return filtered


def _build_classification_prompt(emails: List[Dict]) -> str:
    """Monta o prompt com os e-mails para classificacao pelo LLM."""
    blocks = []
    for i, email in enumerate(emails):
        block = f"""--- E-MAIL #{i+1} ---
ID: {email['message_id']}
De: {email['from_name']} <{email['from_email']}>
Assunto: {email['subject']}
Data: {email['received_at']}
Não lido: {"sim" if email.get('is_unread') else "não"}
Anexos: {"sim" if email.get('has_attachments') else "não"}

Corpo:
{email.get('body_text', '')[:1500]}
--- FIM E-MAIL #{i+1} ---"""
        blocks.append(block)

    return "Analise os seguintes e-mails e classifique cada um.\n\n" + "\n\n".join(blocks)


def _keyword_fallback(emails: List[Dict]) -> List[Dict]:
    """Classificacao simplificada por keywords quando LLM falha."""
    classified = []
    for email in emails:
        searchable = f"{email.get('subject', '')} {email.get('body_text', '')}".lower()
        cat = None
        priority = "medium"

        if any(kw in searchable for kw in ['entrevista', 'interview', 'agendada', 'scheduled']):
            cat, priority = "INTERVIEW_SCHEDULED", "high"
        elif any(kw in searchable for kw in ['aprovado', 'avançou', 'congratulations', 'moved forward', 'próxima fase']):
            cat, priority = "STAGE_APPROVED", "high"
        elif any(kw in searchable for kw in ['proposta', 'offer', 'oferta', 'compensation']):
            cat, priority = "OFFER", "urgent"
        elif any(kw in searchable for kw in ['não selecionado', 'regret', 'unfortunately', 'encerrado']):
            cat, priority = "REJECTION", "low"
        elif any(kw in searchable for kw in ['teste técnico', 'technical challenge', 'take-home', 'assessment', 'case']):
            cat, priority = "TECHNICAL_CHALLENGE", "high"
        elif any(kw in searchable for kw in ['candidatura', 'application', 'recebemos', 'confirmação']):
            cat, priority = "APPLICATION_CONFIRMED", "medium"

        if cat:
            classified.append({
                "message_id": email['message_id'],
                "is_relevant": True,
                "category": cat,
                "priority": priority,
                "company_name": email.get('from_name', ''),
                "job_title": None,
                "summary": email.get('snippet', '')[:100],
                "action_required": None,
                "deadline": None,
                "sentiment": "neutral",
                # Campos do e-mail original
                "from_name": email.get('from_name', ''),
                "from_email": email.get('from_email', ''),
                "subject": email.get('subject', ''),
                "received_at": email.get('received_at', ''),
                "is_unread": email.get('is_unread', False),
                "thread_id": email.get('thread_id', ''),
            })

    priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    classified.sort(key=lambda e: priority_order.get(e.get("priority"), 99))
    return classified


def _extrair_json(content: str) -> str:
    """Extrai JSON de uma string que pode ter texto extra."""
    start = content.find("{")
    end = content.rfind("}") + 1
    if start != -1 and end > start:
        return content[start:end]
    return content


# ─── Servico Principal ───────────────────────────────────────────────────────────

class EmailClassifierService:
    """Pipeline completo: Gmail -> Pre-filtro -> LLM -> Cache."""

    def __init__(self):
        if ANTHROPIC_AVAILABLE and settings.ANTHROPIC_API_KEY:
            self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.llm_enabled = True
        else:
            self.client = None
            self.llm_enabled = False
            logger.warning("LLM desabilitado para Smart Emails (anthropic nao disponivel ou API key ausente)")

    # ── Gmail Fetch ──────────────────────────────────────────────────────────

    def _gmail_connected(self) -> bool:
        """Verifica se o Gmail esta conectado."""
        return os.path.exists(TOKEN_PATH)

    def _fetch_gmail_emails(self) -> List[Dict]:
        """Busca ultimos e-mails do Gmail inbox."""
        if not self._gmail_connected():
            return []

        try:
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, GMAIL_SCOPES)
            service = build('gmail', 'v1', credentials=creds)

            results = service.users().messages().list(
                userId='me',
                q=GMAIL_QUERY,
                maxResults=MAX_FETCH
            ).execute()

            messages_meta = results.get('messages', [])
            if not messages_meta:
                return []

            emails = []
            for meta in messages_meta:
                try:
                    msg = service.users().messages().get(
                        userId='me',
                        id=meta['id'],
                        format='full'
                    ).execute()

                    headers = {h['name'].lower(): h['value'] for h in msg.get('payload', {}).get('headers', [])}
                    from_name, from_email = _parse_sender(headers.get('from', ''))
                    body_text = _extract_body(msg.get('payload', {}))

                    # Detectar anexos
                    has_attachments = False
                    parts = msg.get('payload', {}).get('parts', [])
                    for part in parts:
                        if part.get('filename'):
                            has_attachments = True
                            break

                    # Parse data
                    internal_date = msg.get('internalDate', '0')
                    try:
                        dt = datetime.fromtimestamp(int(internal_date) / 1000, tz=timezone.utc)
                        received_iso = dt.isoformat()
                    except Exception:
                        received_iso = datetime.now(timezone.utc).isoformat()

                    emails.append({
                        'message_id': msg['id'],
                        'thread_id': msg.get('threadId', ''),
                        'from_name': from_name,
                        'from_email': from_email,
                        'subject': headers.get('subject', '(sem assunto)'),
                        'snippet': msg.get('snippet', ''),
                        'body_text': body_text,
                        'received_at': received_iso,
                        'is_unread': 'UNREAD' in msg.get('labelIds', []),
                        'has_attachments': has_attachments,
                    })
                except Exception as e:
                    logger.debug(f"Erro ao parsear email {meta.get('id')}: {e}")
                    continue

            logger.info(f"Gmail: {len(emails)} e-mails buscados")
            return emails

        except Exception as e:
            logger.error(f"Erro ao buscar e-mails do Gmail: {e}")
            return []

    # ── LLM Classification ───────────────────────────────────────────────────

    def _classify_with_llm(self, emails: List[Dict]) -> List[Dict]:
        """Classifica batch de e-mails usando Claude Haiku."""
        if not self.llm_enabled or not emails:
            return _keyword_fallback(emails)

        user_prompt = _build_classification_prompt(emails)

        try:
            response = self.client.messages.create(
                model=MODEL,
                max_tokens=2000,
                system=CLASSIFICATION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
                temperature=0.0,
            )

            # Registrar custo
            if hasattr(response, 'usage'):
                self._registrar_custo(response.usage.input_tokens, response.usage.output_tokens)
                logger.info(f"Smart Emails LLM: {response.usage.input_tokens} in / {response.usage.output_tokens} out")

            # Parse JSON
            result_text = response.content[0].text.strip()
            json_str = _extrair_json(result_text)
            result = json.loads(json_str)

            # Filtrar relevantes e enriquecer com dados originais
            email_map = {e['message_id']: e for e in emails}
            classified = []

            for item in result.get("emails", []):
                if not item.get("is_relevant", False):
                    continue

                msg_id = item.get("message_id", "")
                raw = email_map.get(msg_id, {})

                classified.append({
                    "message_id": msg_id,
                    "is_relevant": True,
                    "category": item.get("category", "INFORMATIVE"),
                    "priority": item.get("priority", "medium"),
                    "company_name": item.get("company_name", raw.get("from_name", "")),
                    "job_title": item.get("job_title"),
                    "summary": item.get("summary", raw.get("snippet", "")),
                    "action_required": item.get("action_required"),
                    "deadline": item.get("deadline"),
                    "sentiment": item.get("sentiment", "neutral"),
                    # Dados originais
                    "from_name": raw.get("from_name", ""),
                    "from_email": raw.get("from_email", ""),
                    "subject": raw.get("subject", ""),
                    "received_at": raw.get("received_at", ""),
                    "is_unread": raw.get("is_unread", False),
                    "thread_id": raw.get("thread_id", ""),
                })

            # Ordenar por prioridade
            priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
            classified.sort(key=lambda e: priority_order.get(e.get("priority"), 99))

            logger.info(f"LLM classificou {len(classified)} e-mails relevantes")
            return classified

        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"Falha na classificacao LLM, usando fallback: {e}")
            return _keyword_fallback(emails)

    # ── Cache ────────────────────────────────────────────────────────────────

    def _get_from_cache(self) -> Optional[List[Dict]]:
        """Busca e-mails classificados do cache (se nao expirado)."""
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            cached = db.query(SmartEmailCache).filter(
                SmartEmailCache.expires_at > now
            ).order_by(
                # urgent=0, high=1, medium=2, low=3
                SmartEmailCache.priority.asc(),
                SmartEmailCache.received_at.desc()
            ).limit(10).all()

            if not cached:
                return None

            result = []
            for row in cached:
                result.append({
                    "message_id": row.message_id,
                    "thread_id": row.thread_id,
                    "category": row.category,
                    "priority": row.priority,
                    "company_name": row.company_name,
                    "job_title": row.job_title,
                    "summary": row.summary,
                    "action_required": row.action_required,
                    "deadline": row.deadline.isoformat() if row.deadline else None,
                    "sentiment": row.sentiment,
                    "from_name": row.from_name,
                    "from_email": row.from_email,
                    "subject": row.subject,
                    "received_at": row.received_at.isoformat() if row.received_at else None,
                    "is_unread": row.is_unread,
                })
            return result

        except Exception as e:
            logger.error(f"Erro ao ler cache: {e}")
            return None
        finally:
            db.close()

    def _save_to_cache(self, classified: List[Dict]):
        """Salva e-mails classificados no cache (UPSERT)."""
        db = SessionLocal()
        try:
            expires = datetime.now(timezone.utc) + timedelta(hours=CACHE_TTL_HOURS)

            # Limpar cache expirado
            db.query(SmartEmailCache).filter(
                SmartEmailCache.expires_at <= datetime.now(timezone.utc)
            ).delete()

            for item in classified:
                # Upsert: deletar existente e inserir novo
                db.query(SmartEmailCache).filter(
                    SmartEmailCache.message_id == item['message_id']
                ).delete()

                # Parse received_at
                received_dt = None
                if item.get('received_at'):
                    try:
                        received_dt = datetime.fromisoformat(item['received_at'].replace('Z', '+00:00'))
                    except Exception:
                        received_dt = datetime.now(timezone.utc)

                # Parse deadline
                deadline_dt = None
                if item.get('deadline'):
                    try:
                        deadline_dt = datetime.fromisoformat(str(item['deadline']).replace('Z', '+00:00'))
                    except Exception:
                        pass

                cache_entry = SmartEmailCache(
                    message_id=item['message_id'],
                    thread_id=item.get('thread_id', ''),
                    category=item['category'],
                    priority=item['priority'],
                    company_name=item.get('company_name', ''),
                    job_title=item.get('job_title'),
                    summary=item.get('summary', ''),
                    action_required=item.get('action_required'),
                    deadline=deadline_dt,
                    sentiment=item.get('sentiment', 'neutral'),
                    from_name=item.get('from_name', ''),
                    from_email=item.get('from_email', ''),
                    subject=item.get('subject', ''),
                    received_at=received_dt,
                    is_unread=item.get('is_unread', False),
                    expires_at=expires,
                )
                db.add(cache_entry)

            db.commit()
            logger.info(f"Cache: {len(classified)} e-mails salvos (TTL: {CACHE_TTL_HOURS}h)")

        except Exception as e:
            db.rollback()
            logger.error(f"Erro ao salvar cache: {e}")
        finally:
            db.close()

    def _invalidate_cache(self):
        """Invalida todo o cache."""
        db = SessionLocal()
        try:
            db.query(SmartEmailCache).delete()
            db.commit()
            logger.info("Cache de Smart Emails invalidado")
        except Exception as e:
            db.rollback()
            logger.error(f"Erro ao invalidar cache: {e}")
        finally:
            db.close()

    # ── Custo ────────────────────────────────────────────────────────────────

    def _registrar_custo(self, tokens_in: int, tokens_out: int):
        """Registra custo da chamada LLM no banco (mesmo padrao do ai_extractor)."""
        custo_usd = (tokens_in * COST_PER_1K_INPUT / 1000) + (tokens_out * COST_PER_1K_OUTPUT / 1000)

        db = SessionLocal()
        try:
            config = db.query(ConfiguracaoIA).first()
            if not config:
                config = ConfiguracaoIA(saldo_inicial_usd=10.0, gasto_acumulado_usd=0.0)
                db.add(config)

            config.gasto_acumulado_usd += custo_usd
            config.haiku_calls += 1
            config.gasto_haiku_usd += custo_usd

            db.commit()
            logger.debug(f"Smart Emails custo: ${custo_usd:.6f} | Saldo: ${config.saldo_disponivel:.2f}")
        except Exception as e:
            logger.error(f"Erro ao registrar custo: {e}")
        finally:
            db.close()

    # ── Orquestrador ─────────────────────────────────────────────────────────

    def get_smart_emails(self) -> Dict:
        """
        Retorna e-mails inteligentes (cache-first).
        Fluxo: cache hit → retorna | cache miss → Gmail → pre-filtro → LLM → cache → retorna
        """
        # Verificar se Gmail esta conectado
        if not self._gmail_connected():
            return {
                "emails": [],
                "urgent_count": 0,
                "pending_analysis": 0,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "cache_fresh": False,
                "gmail_connected": False,
            }

        # 1. Tentar cache
        cached = self._get_from_cache()
        if cached:
            urgent = sum(1 for e in cached if e['priority'] == 'urgent')
            return {
                "emails": cached[:5],  # Top 5 no card
                "urgent_count": urgent,
                "pending_analysis": 0,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "cache_fresh": True,
                "gmail_connected": True,
            }

        # 2. Cache miss: pipeline completo
        return self._run_pipeline()

    def refresh(self) -> Dict:
        """Forca re-analise ignorando cache."""
        self._invalidate_cache()
        return self._run_pipeline()

    def _run_pipeline(self) -> Dict:
        """Executa pipeline completo: Gmail → pre-filtro → LLM → cache."""
        # Fetch Gmail
        raw_emails = self._fetch_gmail_emails()
        if not raw_emails:
            return {
                "emails": [],
                "urgent_count": 0,
                "pending_analysis": 0,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "cache_fresh": True,
                "gmail_connected": True,
            }

        # Pre-filtro
        candidates = _pre_filter(raw_emails)
        pending = len(raw_emails) - len(candidates)

        if not candidates:
            return {
                "emails": [],
                "urgent_count": 0,
                "pending_analysis": pending,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "cache_fresh": True,
                "gmail_connected": True,
            }

        # Classificar (LLM ou fallback)
        classified = self._classify_with_llm(candidates)

        # Salvar no cache
        if classified:
            self._save_to_cache(classified)

        urgent = sum(1 for e in classified if e.get('priority') == 'urgent')

        return {
            "emails": classified[:5],  # Top 5
            "urgent_count": urgent,
            "pending_analysis": pending,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "cache_fresh": True,
            "gmail_connected": True,
        }
