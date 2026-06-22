from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models.vies import ViésRegistro, SeveridadeVies, StatusVies, CategoriaVies

router = APIRouter(prefix="/vieses", tags=["Vieses"])


class ViésIn(BaseModel):
    titulo:      str
    descricao:   str
    categoria:   str = "outro"
    severidade:  str = "media"
    status:      str = "aberto"
    vaga_id:     Optional[int] = None
    responsavel: Optional[str] = None
    acao:        Optional[str] = None


class ViésOut(BaseModel):
    id: int; titulo: str; descricao: str; categoria: str
    severidade: str; status: str; vaga_id: Optional[int]
    responsavel: Optional[str]; acao: Optional[str]
    criado_em: datetime; atualizado_em: datetime
    model_config = {"from_attributes": True}


@router.get("/", response_model=List[ViésOut])
def listar(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ViésRegistro)
    if status:
        q = q.filter(ViésRegistro.status == status)
    return q.order_by(ViésRegistro.criado_em.desc()).all()


@router.post("/", response_model=ViésOut, status_code=201)
def criar(payload: ViésIn, db: Session = Depends(get_db)):
    v = ViésRegistro(**payload.model_dump())
    db.add(v); db.commit(); db.refresh(v)
    return v


@router.put("/{vid}", response_model=ViésOut)
def atualizar(vid: int, payload: ViésIn, db: Session = Depends(get_db)):
    v = db.query(ViésRegistro).filter(ViésRegistro.id == vid).first()
    if not v:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(v, campo, valor)
    db.commit(); db.refresh(v)
    return v


@router.delete("/{vid}", status_code=204)
def excluir(vid: int, db: Session = Depends(get_db)):
    v = db.query(ViésRegistro).filter(ViésRegistro.id == vid).first()
    if not v:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    db.delete(v); db.commit()
