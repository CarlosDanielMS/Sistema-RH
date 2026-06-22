from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.decisao import DecisaoCreate, DecisaoOut
from app.services.decision_service import (
    registrar_decisao, listar_por_candidato, listar_por_vaga, sugerir_pros_contras,
)

router = APIRouter(prefix="/decisoes", tags=["Diário de Decisões"])


@router.post("/", response_model=DecisaoOut)
def criar_decisao(payload: DecisaoCreate, db: Session = Depends(get_db)):
    return registrar_decisao(db, payload)


@router.get("/", response_model=List[DecisaoOut])
def listar_decisoes(
    skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
):
    from app.models.decisao import Decisao
    return (
        db.query(Decisao)
        .order_by(Decisao.criado_em.desc())
        .offset(skip).limit(limit).all()
    )


@router.get("/candidato/{candidato_id}", response_model=List[DecisaoOut])
def decisoes_do_candidato(candidato_id: int, db: Session = Depends(get_db)):
    return listar_por_candidato(db, candidato_id)


@router.get("/vaga/{vaga_id}", response_model=List[DecisaoOut])
def decisoes_da_vaga(vaga_id: int, db: Session = Depends(get_db)):
    return listar_por_vaga(db, vaga_id)


@router.delete("/{decisao_id}", status_code=204)
def excluir_decisao(decisao_id: int, db: Session = Depends(get_db)):
    from app.models.decisao import Decisao
    d = db.query(Decisao).filter(Decisao.id == decisao_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Decisão não encontrada")
    db.delete(d)
    db.commit()


@router.post("/sugerir-pros-contras")
def sugerir(justificativa: str, tipo_decisao: str):
    """
    Dado o texto de uma justificativa, a IA extrai prós e contras.
    Útil para ajudar o recrutador a preencher o formulário.
    """
    if len(justificativa) < 10:
        raise HTTPException(status_code=400, detail="Justificativa muito curta")
    return sugerir_pros_contras(justificativa, tipo_decisao)
