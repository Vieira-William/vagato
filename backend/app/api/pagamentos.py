from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import os
import stripe
import mercadopago
import json
import uuid
import datetime
from ..database import get_db
from ..models import TransacaoPagamento, UserProfile, ConfiguracaoIA

router = APIRouter(prefix="/pagamento", tags=["pagamento"])

# Emails com acesso god mode (ultimate permanente, sem expiração)
_OWNER_EMAILS = {
    e.strip().lower()
    for e in os.getenv("OWNER_EMAILS", "william.marangon@gmail.com").split(",")
    if e.strip()
}

_GOD_MODE_RESPONSE = {
    "is_premium": True,
    "plano_expira_em": None,
    "plano": "premium",
    "plano_tipo": "ultimate",
    "billing_period": "anual",
    "transacoes_recentes": [],
}


def _get_active_profile(db: Session):
    """Retorna o perfil ativo ou None."""
    return db.query(UserProfile).filter(UserProfile.is_active == True).first()


@router.get("/status")
async def get_payment_status(db: Session = Depends(get_db)):
    """Retorna plano atual e histórico de transações do usuário ativo."""
    profile = _get_active_profile(db)
    if not profile:
        return {"is_premium": False, "plano_expira_em": None, "plano": "free", "transacoes_recentes": []}

    if (profile.email or "").lower() in _OWNER_EMAILS:
        return _GOD_MODE_RESPONSE

    transacoes = (
        db.query(TransacaoPagamento)
        .filter(TransacaoPagamento.user_email == profile.email)
        .order_by(TransacaoPagamento.criado_em.desc())
        .limit(5)
        .all()
    )

    return {
        "is_premium": profile.is_premium or False,
        "plano_expira_em": profile.plano_expira_em.isoformat() if profile.plano_expira_em else None,
        "plano": "premium" if profile.is_premium else "free",
        "plano_tipo": profile.plano_tipo or "free",
        "billing_period": profile.billing_period or "mensal",
        "transacoes_recentes": [
            {
                "gateway": t.gateway,
                "status": t.status,
                "valor_brl": t.valor_brl,
                "criado_em": t.criado_em.isoformat() if t.criado_em else None,
            }
            for t in transacoes
        ],
    }

# Configurações de chaves (serão carregadas do ambiente real depois)
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY", "sk_test_placeholder")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
MP_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "APP_USR-placeholder")

# Inicialização das bibliotecas com fail-safes
stripe.api_key = STRIPE_API_KEY
mp_sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

# ── Mapa de preços dos planos ──────────────────────────────────────────────
PLANOS = {
    'pro':      { 'mensal': 29.0,  'anual': 276.0,  'dias_mensal': 30,  'dias_anual': 365 },
    'ultimate': { 'mensal': 59.0,  'anual': 564.0,  'dias_mensal': 30,  'dias_anual': 365 },
}
PLANO_LABELS = {
    'pro':      { 'mensal': 'Assinatura Vagato Pro (Mensal)',      'anual': 'Assinatura Vagato Pro (Anual)' },
    'ultimate': { 'mensal': 'Assinatura Vagato Ultimate (Mensal)', 'anual': 'Assinatura Vagato Ultimate (Anual)' },
}


@router.post("/checkout/stripe")
async def create_stripe_checkout(request: Request):
    """
    Cria uma sessão de checkout do Stripe e retorna a URL para o frontend redirecionar.
    No futuro, espera um body ex: {"plano": "mensal"}
    """
    try:
        data = await request.json()
    except Exception:
        data = {}

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    try:
        # A API Key dummy vai gerar erro, o código intercepta
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'brl',
                    'product_data': {
                        'name': 'Recarga de IA Vagato',
                    },
                    'unit_amount': 2500, # R$ 25,00
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{FRONTEND_URL}/configuracoes?payment_success=true&gateway=stripe",
            cancel_url=f"{FRONTEND_URL}/configuracoes?payment_cancelled=true",
        )
        return {"checkout_url": session.url}
    except Exception as e:
        # Retornamos status 200 porém indicando que não há chave real ainda, 
        # assim a Dashboard ou Configurações não crasheia para o William.
        return {"error": "Stripe não configurado.", "details": str(e), "checkout_url": None}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """
    Webhook silencioso para receber notificação quando a compra na Stripe for concluída.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        # TODO: Adicionar lógica real de aumentar saldo na ConfiguracaoIA
        print("✅ Pagamento via Stripe processado com sucesso:", session["id"])
        
    return {"status": "success"}


@router.post("/checkout/mercadopago")
async def create_mp_checkout(request: Request, db: Session = Depends(get_db)):
    """
    Cria uma preferência no Mercado Pago e retorna o link (init_point) de pagamento.
    """
    try:
        data = await request.json()
    except Exception:
        data = {}
    profile = _get_active_profile(db)
    user_email = profile.email if profile else "usuario@teste.com"

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Criar O Registro Transação "Pendente" atrelado ao usuário (simplificado para teste)
    transacao_id = str(uuid.uuid4())
    transacao = TransacaoPagamento(
        id=transacao_id,
        gateway="mercadopago",
        status="pending",
        valor_usd=5.0, # Valor fictício em dolares do SaaS
        valor_brl=25.0, # Preço BR da Assinatura
        user_email=user_email
    )
    db.add(transacao)
    db.commit()

    # Gerar a intenção de pagar no Mercado Pago (Preference)
    preference_data = {
        "items": [
            {
                "title": "Assinatura Vagato Premium (1 Mês)",
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": 25.0
            }
        ],
        "back_urls": {
            "success": f"{FRONTEND_URL}/configuracoes?payment_success=true&gateway=mp",
            "failure": f"{FRONTEND_URL}/configuracoes?payment_cancelled=true",
            "pending": f"{FRONTEND_URL}/configuracoes?payment_pending=true"
        },
        "auto_return": "approved",
        "external_reference": transacao_id, # CHAVE DE LIGAÇÂO DA AUDITORIA!
    }
    
    try:
        preference_response = mp_sdk.preference().create(preference_data)
        preference = preference_response["response"]
        
        if "init_point" in preference:
            return {"checkout_url": preference["init_point"]}
        else:
            return {"error": "Mercado Pago não configurado corretamente", "details": preference, "checkout_url": None}
    except Exception as e:
        # Em caso de erro, marcar como rejected ou excluir transacao pendente?
        transacao.status = "error"
        db.commit()
        return {"error": "Mercado Pago não configurado.", "details": str(e), "checkout_url": None}

@router.post("/checkout/mercadopago/process")
async def process_mp_payment(request: Request, db: Session = Depends(get_db)):
    """
    Processa o pagamento transparente advindos do Componente Brick (Cartão / Pix).
    """
    payload = await request.json()

    try:
        # O Payment Brick envia { selectedPaymentMethod, formData }
        # Extrai formData se existir, senão usa payload direto (retrocompatível)
        form_data = payload.get("formData", payload)

        profile = _get_active_profile(db)
        payer_email = form_data.get("payer", {}).get("email", "")
        user_email = profile.email if profile else (payer_email or "usuario@teste.com")

        # Plano e billing — lidos do payload (frontend envia junto com formData)
        plano_tipo     = payload.get("plano_tipo") or form_data.get("plano_tipo", "pro")
        billing_period = payload.get("billing_period") or form_data.get("billing_period", "mensal")

        # Validação e cálculo de valores
        if plano_tipo not in PLANOS:
            plano_tipo = "pro"
        if billing_period not in ("mensal", "anual"):
            billing_period = "mensal"

        transaction_amount = PLANOS[plano_tipo][billing_period]
        dias = PLANOS[plano_tipo][f'dias_{billing_period}']
        descricao = PLANO_LABELS[plano_tipo][billing_period]

        print(f"🔵 Plano: {plano_tipo} | Billing: {billing_period} | Valor: R${transaction_amount}")
        print(f"🔵 payment_method_id: {form_data.get('payment_method_id')} | token: {'sim' if form_data.get('token') else 'não'}")

        # Construindo payload oficial para a SDK
        payment_data = {
            "transaction_amount": transaction_amount,
            "description": descricao,
            "installments": 1,  # sem parcelamento
            "payment_method_id": form_data.get("payment_method_id"),
            "payer": {
                "email": user_email
            }
        }

        # Se for cartão, incluir token e issuer
        if form_data.get("token"):
            payment_data["token"] = form_data.get("token")
        if form_data.get("issuer_id"):
            payment_data["issuer_id"] = form_data.get("issuer_id")

        # Pagar na API
        print(f"🔵 Enviando para MP: {payment_data}")
        payment_response = mp_sdk.payment().create(payment_data)
        response_info = payment_response.get("response", {})
        status = response_info.get("status")

        if status in ["approved", "in_process", "authorized", "pending"]:
            # Registro auditoria db
            transacao = TransacaoPagamento(
                id=str(uuid.uuid4()),
                gateway="mercadopago",
                gateway_id=str(response_info.get("id")),
                status=status,
                valor_usd=5.0,
                valor_brl=transaction_amount,
                user_email=user_email
            )
            db.add(transacao)

            if status == "approved":
                user = db.query(UserProfile).filter(UserProfile.email == user_email).first()
                if user:
                    user.is_premium = True
                    user.plano_tipo = plano_tipo
                    user.billing_period = billing_period
                    user.plano_expira_em = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=dias)
                # Créditos de IA
                config_ia = db.query(ConfiguracaoIA).first()
                if config_ia:
                    config_ia.saldo_inicial_usd += 5.0

            db.commit()
            return {"status": status, "payment_id": response_info.get("id"), "plano_tipo": plano_tipo}
        else:
            return {"status": status, "error": response_info.get("status_detail")}
            
    except Exception as e:
        print("Erro MP Brick:", e)
        return {"status": "error", "message": str(e)}
@router.post("/webhook/mp")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook (IPN) silencioso para o Mercado Pago, acionado quando um Pix é pago.
    """
    try:
        body = await request.json()
        print("🟡 Webhook MP disparado:", body)
        
        # O Mercado Pago manda action=payment.created e depois precisamos buscar o id na API deles
        if body.get("type", "") == "payment" or body.get("topic", "") == "payment":
            payment_id = body.get("data", {}).get("id")
            
            if payment_id:
                payment_info = mp_sdk.payment().get(payment_id)
                response_data = payment_info.get("response", {})
                status = response_data.get("status")
                external_reference = response_data.get("external_reference") # Nosso UUID
                
                print(f"MP Check -> ID: {payment_id} | Status: {status} | Ref: {external_reference}")
                
                if status == "approved" and external_reference:
                    # Trazer transacao do banco
                    transacao = db.query(TransacaoPagamento).filter(TransacaoPagamento.id == external_reference).first()
                    
                    if transacao and transacao.status != "approved":
                        # Aprovar transação
                        transacao.status = "approved"
                        transacao.gateway_id = str(payment_id)
                        
                        # Ativar plano premium do usuário
                        if transacao.user_email:
                            user = db.query(UserProfile).filter(UserProfile.email == transacao.user_email).first()
                            if user:
                                user.is_premium = True
                                user.plano_expira_em = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)
                                print(f"✅ Assinatura Premium Ativada para o usuário {user.email}!")
                                # Créditos de IA
                                config_ia = db.query(ConfiguracaoIA).first()
                                if config_ia:
                                    config_ia.saldo_inicial_usd += 5.0
                            else:
                                print(f"✅ Pagamento recebido, mas usuário {transacao.user_email} não encontrado na base de perfis.")
                        
                        db.commit()
        
        return {"status": "success"}
    except Exception as e:
        print("Erro no Webhook MP:", e)
        # O MercadoPago obriga retornar 200, caso contrário ele continua re-enviando.
        return {"status": "ignored"}
