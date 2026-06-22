from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.candidato import Candidato
from app.models.vaga import Vaga
from app.models.pipeline import PipelineHistorico, ETAPAS_PIPELINE
from app.models.historico import TipoHistorico
from app.routes.historico import registrar as historico_registrar
from app.schemas.pipeline import (
    MoverCandidatoRequest, ObservacaoRequest,
    PipelineItemOut, HistoricoMovimentacaoOut, PipelineVagaOut,
)
from app.services.notification_service import notificar_mudanca_etapa

router = APIRouter(prefix="/pipeline", tags=["Pipeline / Kanban"])


@router.get("/stats")
def pipeline_stats(db: Session = Depends(get_db)):
    """Retorna distribuição de candidatos por etapa (funil global)."""
    candidatos = db.query(Candidato).all()
    funil = {etapa: 0 for etapa in ETAPAS_PIPELINE}
    for c in candidatos:
        etapa = c.etapa_pipeline if c.etapa_pipeline in ETAPAS_PIPELINE else "triado"
        funil[etapa] += 1
    return {"funil": funil, "total": len(candidatos)}


@router.get("/todos", response_model=PipelineVagaOut)
def pipeline_todos(db: Session = Depends(get_db)):
    """Retorna todos os candidatos do sistema agrupados por etapa."""
    candidatos = db.query(Candidato).all()
    kanban: dict[str, list] = {etapa: [] for etapa in ETAPAS_PIPELINE}
    for c in candidatos:
        etapa = c.etapa_pipeline if c.etapa_pipeline in ETAPAS_PIPELINE else "triado"
        kanban[etapa].append({
            "candidato_id": c.id,
            "nome": c.nome,
            "email": c.email,
            "score_aderencia": c.score_aderencia,
            "status_triagem": c.status_triagem,
            "vaga_id": c.vaga_id,
            "criado_em": c.criado_em.isoformat() if c.criado_em else None,
        })
    return PipelineVagaOut(vaga_id=0, titulo_vaga="Todos os candidatos", etapas=kanban)


@router.get("/vaga/{vaga_id}", response_model=PipelineVagaOut)
def pipeline_da_vaga(vaga_id: int, db: Session = Depends(get_db)):
    """Retorna todos os candidatos da vaga agrupados por etapa (kanban)."""
    vaga = db.query(Vaga).filter(Vaga.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    candidatos = db.query(Candidato).filter(Candidato.vaga_id == vaga_id).all()

    kanban: dict[str, list] = {etapa: [] for etapa in ETAPAS_PIPELINE}
    for c in candidatos:
        etapa = c.etapa_pipeline if c.etapa_pipeline in ETAPAS_PIPELINE else "triado"
        kanban[etapa].append(
            {
                "candidato_id": c.id,
                "vaga_id": c.vaga_id,
                "nome": c.nome,
                "email": c.email,
                "score_aderencia": c.score_aderencia,
                "status_triagem": c.status_triagem,
                "criado_em": c.criado_em.isoformat() if c.criado_em else None,
            }
        )

    return PipelineVagaOut(
        vaga_id=vaga_id,
        titulo_vaga=vaga.titulo,
        etapas=kanban,
    )


@router.put("/candidato/{candidato_id}/mover")
def mover_candidato(
    candidato_id: int,
    payload: MoverCandidatoRequest,
    db: Session = Depends(get_db),
):
    """Move candidato para uma nova etapa e registra no histórico."""
    if payload.etapa_nova not in ETAPAS_PIPELINE:
        raise HTTPException(
            status_code=400,
            detail=f"Etapa inválida. Opções: {ETAPAS_PIPELINE}",
        )

    candidato = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")

    etapa_anterior = candidato.etapa_pipeline

    historico = PipelineHistorico(
        candidato_id=candidato_id,
        vaga_id=candidato.vaga_id,
        etapa_anterior=etapa_anterior,
        etapa_nova=payload.etapa_nova,
        responsavel=payload.responsavel,
        observacao=payload.observacao,
    )
    db.add(historico)

    candidato.etapa_pipeline = payload.etapa_nova

    etapas_label = {
        "triado": "Triado", "entrevista_rh": "Entrevista RH",
        "entrevista_tecnica": "Entrevista Técnica", "teste_pratico": "Teste Prático",
        "oferta": "Oferta", "contratado": "Contratado", "reprovado": "Reprovado",
    }
    historico_registrar(
        db, candidato_id, TipoHistorico.pipeline,
        titulo=f"Etapa: {etapas_label.get(etapa_anterior, etapa_anterior)} → {etapas_label.get(payload.etapa_nova, payload.etapa_nova)}",
        texto=payload.observacao,
        criado_por=payload.responsavel or "Recrutador",
    )
    db.commit()

    # Dispara notificação automática ao candidato
    notificacoes_enviadas = 0
    try:
        vaga = db.query(Vaga).filter(Vaga.id == candidato.vaga_id).first()
        if vaga:
            notifs = notificar_mudanca_etapa(db, candidato, vaga, payload.etapa_nova)
            notificacoes_enviadas = len(notifs)
    except Exception as e:
        pass  # Notificação não bloqueia a movimentação

    return {
        "candidato_id": candidato_id,
        "etapa_anterior": etapa_anterior,
        "etapa_nova": payload.etapa_nova,
        "mensagem": f"Candidato movido: {etapa_anterior} → {payload.etapa_nova}",
        "notificacoes_enviadas": notificacoes_enviadas,
    }


@router.post("/candidato/{candidato_id}/observacao")
def adicionar_observacao(
    candidato_id: int,
    payload: ObservacaoRequest,
    db: Session = Depends(get_db),
):
    """Registra uma observação do recrutador sem mover o candidato de etapa."""
    candidato = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")

    historico = PipelineHistorico(
        candidato_id=candidato_id,
        vaga_id=candidato.vaga_id,
        etapa_anterior=candidato.etapa_pipeline,
        etapa_nova=candidato.etapa_pipeline,  # mesma etapa
        responsavel=payload.responsavel,
        observacao=payload.observacao,
    )
    db.add(historico)
    db.commit()

    return {"mensagem": "Observação registrada", "candidato_id": candidato_id}


@router.get("/candidato/{candidato_id}/historico", response_model=List[HistoricoMovimentacaoOut])
def historico_candidato(candidato_id: int, db: Session = Depends(get_db)):
    return (
        db.query(PipelineHistorico)
        .filter(PipelineHistorico.candidato_id == candidato_id)
        .order_by(PipelineHistorico.criado_em.asc())
        .all()
    )
