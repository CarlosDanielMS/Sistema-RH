from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notificacao import TemplateNotificacao, Notificacao, Entrevista
from app.models.candidato import Candidato
from app.models.vaga import Vaga
from app.schemas.notificacao import (
    TemplateCreate, TemplateUpdate, TemplateOut,
    EntrevistaCreate, EntrevistaOut,
    NotificacaoOut, EnvioManualRequest,
)
from app.services.notification_service import notificar_mudanca_etapa

router = APIRouter(prefix="/notificacoes", tags=["Notificações"])


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[TemplateOut])
def listar_templates(db: Session = Depends(get_db)):
    return db.query(TemplateNotificacao).order_by(TemplateNotificacao.id).all()


@router.get("/templates/{etapa}", response_model=TemplateOut)
def obter_template(etapa: str, db: Session = Depends(get_db)):
    t = db.query(TemplateNotificacao).filter(TemplateNotificacao.etapa == etapa).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return t


@router.post("/templates", response_model=TemplateOut, status_code=201)
def criar_template(payload: TemplateCreate, db: Session = Depends(get_db)):
    existe = db.query(TemplateNotificacao).filter(TemplateNotificacao.etapa == payload.etapa).first()
    if existe:
        raise HTTPException(status_code=409, detail="Template para esta etapa já existe. Use PUT para atualizar.")
    t = TemplateNotificacao(**payload.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/templates/{etapa}", response_model=TemplateOut)
def atualizar_template(etapa: str, payload: TemplateUpdate, db: Session = Depends(get_db)):
    t = db.query(TemplateNotificacao).filter(TemplateNotificacao.etapa == etapa).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(t, campo, valor)
    db.commit()
    db.refresh(t)
    return t


# ── Histórico de notificações ─────────────────────────────────────────────────

@router.get("/historico", response_model=List[NotificacaoOut])
def historico_notificacoes(
    candidato_id: Optional[int] = None,
    vaga_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(Notificacao)
    if candidato_id:
        q = q.filter(Notificacao.candidato_id == candidato_id)
    if vaga_id:
        q = q.filter(Notificacao.vaga_id == vaga_id)
    if status:
        q = q.filter(Notificacao.status == status)
    return q.order_by(Notificacao.enviado_em.desc()).offset(skip).limit(limit).all()


# ── Envio manual ──────────────────────────────────────────────────────────────

@router.post("/enviar", response_model=List[NotificacaoOut])
def enviar_notificacao_manual(
    payload: EnvioManualRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    candidato = db.query(Candidato).filter(Candidato.id == payload.candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    vaga = db.query(Vaga).filter(Vaga.id == payload.vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    notifs = notificar_mudanca_etapa(db, candidato, vaga, payload.etapa)
    return notifs


# ── Entrevistas ───────────────────────────────────────────────────────────────

@router.post("/entrevistas", response_model=EntrevistaOut, status_code=201)
def criar_entrevista(payload: EntrevistaCreate, db: Session = Depends(get_db)):
    candidato = db.query(Candidato).filter(Candidato.id == payload.candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")

    entrevista = Entrevista(**payload.model_dump())
    db.add(entrevista)
    db.commit()
    db.refresh(entrevista)

    # Notifica automaticamente o candidato com data e link
    vaga = db.query(Vaga).filter(Vaga.id == payload.vaga_id).first()
    if vaga:
        try:
            notificar_mudanca_etapa(db, candidato, vaga, payload.tipo, entrevista)
            entrevista.notificacao_enviada = True
            db.commit()
        except Exception:
            pass

    return entrevista


@router.get("/entrevistas", response_model=List[EntrevistaOut])
def listar_entrevistas(
    candidato_id: Optional[int] = None,
    vaga_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Entrevista)
    if candidato_id:
        q = q.filter(Entrevista.candidato_id == candidato_id)
    if vaga_id:
        q = q.filter(Entrevista.vaga_id == vaga_id)
    return q.order_by(Entrevista.data_hora.asc()).all()


@router.put("/entrevistas/{entrevista_id}", response_model=EntrevistaOut)
def atualizar_entrevista(entrevista_id: int, payload: EntrevistaCreate, db: Session = Depends(get_db)):
    e = db.query(Entrevista).filter(Entrevista.id == entrevista_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(e, campo, valor)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/entrevistas/{entrevista_id}", status_code=204)
def excluir_entrevista(entrevista_id: int, db: Session = Depends(get_db)):
    e = db.query(Entrevista).filter(Entrevista.id == entrevista_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    db.delete(e)
    db.commit()
