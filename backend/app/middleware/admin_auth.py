"""
Middleware de autenticação para o Backoffice Admin.
JWT próprio (não Supabase Auth) + bcrypt + pyotp (2FA).
"""
import os
import time
import bcrypt
import pyotp
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import AdminUser

# ── Config ──────────────────────────────────────────────────────────────────
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "vagato-admin-secret-change-me")
ADMIN_JWT_ALGORITHM = "HS256"
ADMIN_JWT_EXPIRE_HOURS = 4

# ── Rate limiting (in-memory, simples para MVP) ────────────────────────────
_login_attempts = {}  # { ip: [(timestamp, ...)] }
MAX_ATTEMPTS_PER_MIN = 5
BLOCK_AFTER_FAILURES = 10
BLOCK_DURATION_SECONDS = 1800  # 30 min


def get_admin_db():
    """Dependency: sessão do banco para rotas admin."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Password ────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Gera hash bcrypt da senha."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verifica senha contra hash bcrypt."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT ─────────────────────────────────────────────────────────────────────

def create_admin_token(admin_id: str, role: str, confirmed_2fa: bool = True) -> str:
    """Cria JWT admin com expiração de 4h."""
    payload = {
        "sub": admin_id,
        "role": role,
        "2fa_ok": confirmed_2fa,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=ADMIN_JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ADMIN_JWT_ALGORITHM)


def decode_admin_token(token: str) -> dict:
    """Decodifica e valida JWT admin."""
    try:
        return jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token admin inválido ou expirado")


# ── 2FA TOTP ────────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    """Gera secret TOTP para Google Authenticator."""
    return pyotp.random_base32()


def verify_totp(secret: str, code: str) -> bool:
    """Verifica código TOTP (aceita janela de 1 step = 30s antes/depois)."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def get_totp_uri(secret: str, email: str) -> str:
    """Gera URI para QR code do Google Authenticator."""
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="Vagato Admin")


# ── Rate Limiting ───────────────────────────────────────────────────────────

def check_rate_limit(ip: str):
    """Verifica rate limiting por IP. Levanta 429 se excedido."""
    now = time.time()
    attempts = _login_attempts.get(ip, [])

    # Limpar tentativas antigas (> 1h)
    attempts = [t for t in attempts if now - t < 3600]
    _login_attempts[ip] = attempts

    # Bloqueio por muitas falhas
    if len(attempts) >= BLOCK_AFTER_FAILURES:
        oldest_in_block = attempts[-BLOCK_AFTER_FAILURES]
        if now - oldest_in_block < BLOCK_DURATION_SECONDS:
            raise HTTPException(status_code=429, detail="Muitas tentativas. Aguarde 30 minutos.")

    # Limite por minuto
    recent = [t for t in attempts if now - t < 60]
    if len(recent) >= MAX_ATTEMPTS_PER_MIN:
        raise HTTPException(status_code=429, detail="Limite de tentativas por minuto atingido.")


def record_login_attempt(ip: str):
    """Registra tentativa de login (falha)."""
    _login_attempts.setdefault(ip, []).append(time.time())


def clear_login_attempts(ip: str):
    """Limpa tentativas após login bem-sucedido."""
    _login_attempts.pop(ip, None)


# ── Dependencies FastAPI ────────────────────────────────────────────────────

def get_current_admin(request: Request, db: Session = Depends(get_admin_db)) -> AdminUser:
    """
    Dependency: extrai admin do JWT no header Authorization.
    Levanta 401 se token inválido/ausente ou admin inativo.
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação ausente")

    token = auth_header[7:]
    payload = decode_admin_token(token)

    # Verificar se 2FA foi confirmado (se necessário)
    if not payload.get("2fa_ok", False):
        raise HTTPException(status_code=403, detail="Verificação 2FA pendente")

    admin_id = payload.get("sub")
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id, AdminUser.is_active == True).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Admin não encontrado ou inativo")

    return admin


def require_owner(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
    """Dependency: verifica se o admin é owner."""
    if admin.role != "owner":
        raise HTTPException(status_code=403, detail="Acesso restrito ao Owner")
    return admin
