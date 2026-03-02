import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Vaga

db = SessionLocal()
vaga = db.query(Vaga).order_by(Vaga.id.desc()).first()
print(f"Vaga ID: {vaga.id}")
print(f"Descricao Completa present?: {bool(vaga.descricao_completa)}")
print(f"Length of descricao: {len(vaga.descricao_completa) if vaga.descricao_completa else 0}")
