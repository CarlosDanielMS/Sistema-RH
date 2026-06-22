from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.vaga import Vaga
from app.schemas.vaga import VagaCreate, VagaUpdate, VagaOut

router = APIRouter(prefix="/vagas", tags=["Vagas"])


@router.post("/", response_model=VagaOut, status_code=status.HTTP_201_CREATED)
def criar_vaga(payload: VagaCreate, db: Session = Depends(get_db)):
    vaga = Vaga(**payload.model_dump())
    db.add(vaga)
    db.commit()
    db.refresh(vaga)
    return vaga


@router.get("/", response_model=List[VagaOut])
def listar_vagas(
    status_vaga: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Vaga)
    if status_vaga:
        q = q.filter(Vaga.status == status_vaga)
    return q.order_by(Vaga.criado_em.desc()).offset(skip).limit(limit).all()


@router.get("/{vaga_id}", response_model=VagaOut)
def obter_vaga(vaga_id: int, db: Session = Depends(get_db)):
    vaga = db.query(Vaga).filter(Vaga.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    return vaga


@router.put("/{vaga_id}", response_model=VagaOut)
def atualizar_vaga(vaga_id: int, payload: VagaUpdate, db: Session = Depends(get_db)):
    vaga = db.query(Vaga).filter(Vaga.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(vaga, campo, valor)
    db.commit()
    db.refresh(vaga)
    return vaga


@router.delete("/{vaga_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_vaga(vaga_id: int, db: Session = Depends(get_db)):
    vaga = db.query(Vaga).filter(Vaga.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    db.delete(vaga)
    db.commit()
