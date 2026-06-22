from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.bias_analysis_service import analisar_vieses

router = APIRouter(prefix="/analises", tags=["Análise de Padrões e Vieses"])


@router.get("/vieses")
def relatorio_geral_vieses(db: Session = Depends(get_db)):
    """
    Analisa todas as decisões registradas e gera relatório de padrões.
    Reaproveitado da análise de padrões da Aula 14.
    """
    return analisar_vieses(db, vaga_id=None)


@router.get("/vaga/{vaga_id}")
def relatorio_vieses_vaga(vaga_id: int, db: Session = Depends(get_db)):
    """Relatório de padrões restrito a uma vaga específica."""
    return analisar_vieses(db, vaga_id=vaga_id)
