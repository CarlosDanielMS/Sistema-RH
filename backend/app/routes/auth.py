"""
auth.py — Autenticação com JWT e gerenciamento de usuários (admin).
"""
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.database import get_db
from app.models.usuario import Usuario, RoleUsuario

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# ── Config ─────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "rh-ia-secret-key-2026-troque-em-producao")
ALGORITHM  = "HS256"
TOKEN_EXP  = 60 * 24  # 24 horas em minutos

pwd_ctx  = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2   = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Schemas ────────────────────────────────────────────────────────────────────
class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: dict

class UsuarioOut(BaseModel):
    id: int; nome: str; email: str; role: str; ativo: bool; criado_em: datetime
    model_config = {"from_attributes": True}

class UsuarioCreate(BaseModel):
    nome: str; email: EmailStr; senha: str; role: str = "user"

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    ativo: Optional[bool] = None

class SenhaUpdate(BaseModel):
    senha_atual: str; nova_senha: str


# ── Helpers ────────────────────────────────────────────────────────────────────
def _hash(senha: str) -> str:
    return pwd_ctx.hash(senha)

def _verify(senha: str, hashed: str) -> bool:
    return pwd_ctx.verify(senha, hashed)

def _criar_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXP)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def _get_usuario_atual(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> Usuario:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        if uid is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    u = db.query(Usuario).filter(Usuario.id == int(uid), Usuario.ativo == True).first()
    if not u:
        raise HTTPException(status_code=401, detail="Usuário não encontrado ou inativo")
    return u

def _exige_admin(u: Usuario = Depends(_get_usuario_atual)) -> Usuario:
    if u.role != RoleUsuario.admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return u


def inicializar_usuarios(db: Session):
    """Cria usuários padrão se não existirem."""
    if db.query(Usuario).count() == 0:
        db.add(Usuario(nome="Administrador", email="admin@rh.com",
                       senha_hash=_hash("admin123"), role=RoleUsuario.admin))
        db.add(Usuario(nome="Recrutador", email="user@rh.com",
                       senha_hash=_hash("user123"), role=RoleUsuario.user))
        db.commit()


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.post("/login", response_model=LoginOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.email == form.username).first()
    if not u or not _verify(form.password, u.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    if not u.ativo:
        raise HTTPException(status_code=403, detail="Conta desativada. Contate o administrador.")
    token = _criar_token({"sub": str(u.id), "role": u.role, "nome": u.nome})
    return LoginOut(access_token=token, usuario={"id": u.id, "nome": u.nome, "email": u.email, "role": u.role})


@router.get("/me")
def me(u: Usuario = Depends(_get_usuario_atual)):
    return {"id": u.id, "nome": u.nome, "email": u.email, "role": u.role, "ativo": u.ativo}


@router.put("/me/senha")
def alterar_propria_senha(payload: SenhaUpdate, u: Usuario = Depends(_get_usuario_atual), db: Session = Depends(get_db)):
    if not _verify(payload.senha_atual, u.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    u.senha_hash = _hash(payload.nova_senha)
    db.commit()
    return {"mensagem": "Senha alterada com sucesso"}


# ── Gerenciamento de usuários (admin) ─────────────────────────────────────────
@router.get("/usuarios", response_model=List[UsuarioOut])
def listar_usuarios(_: Usuario = Depends(_exige_admin), db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.criado_em).all()


@router.post("/usuarios", response_model=UsuarioOut, status_code=201)
def criar_usuario(payload: UsuarioCreate, _: Usuario = Depends(_exige_admin), db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    role = RoleUsuario.admin if payload.role == "admin" else RoleUsuario.user
    u = Usuario(nome=payload.nome, email=payload.email, senha_hash=_hash(payload.senha), role=role)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.put("/usuarios/{uid}", response_model=UsuarioOut)
def atualizar_usuario(uid: int, payload: UsuarioUpdate, _: Usuario = Depends(_exige_admin), db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if payload.nome  is not None: u.nome  = payload.nome
    if payload.email is not None: u.email = payload.email
    if payload.ativo is not None: u.ativo = payload.ativo
    if payload.role  is not None: u.role  = RoleUsuario.admin if payload.role == "admin" else RoleUsuario.user
    db.commit(); db.refresh(u)
    return u


@router.put("/usuarios/{uid}/senha")
def resetar_senha(uid: int, payload: SenhaUpdate, admin: Usuario = Depends(_exige_admin), db: Session = Depends(get_db)):
    """Admin redefine a senha de qualquer usuário (não precisa da senha atual)."""
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    u.senha_hash = _hash(payload.nova_senha)
    db.commit()
    return {"mensagem": f"Senha de {u.nome} redefinida com sucesso"}


@router.delete("/usuarios/{uid}", status_code=204)
def excluir_usuario(uid: int, admin: Usuario = Depends(_exige_admin), db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if u.id == admin.id:
        raise HTTPException(status_code=400, detail="Admin não pode excluir a própria conta")
    db.delete(u)
    db.commit()
