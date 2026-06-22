from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.evento import Evento
from app.models.candidato import Candidato
from app.models.vaga import Vaga
from app.models.historico import TipoHistorico
from app.schemas.evento import EventoCreate, EventoUpdate, EventoOut
from app.services.notification_service import notificar_agendamento
from app.routes.historico import registrar as historico_registrar

router = APIRouter(prefix="/eventos", tags=["Agenda"])

TIPOS_LABEL = {
    "entrevista": "Entrevista",
    "reuniao":    "Reunião",
    "prazo":      "Prazo",
    "onboarding": "Onboarding",
    "feedback":   "Feedback",
    "outro":      "Evento",
}


def _processar_candidato(db: Session, evento: Evento, enviar_email: bool = True):
    """Após criar/atualizar evento, registra no histórico e envia email se candidato vinculado."""
    if not evento.candidato_id:
        return

    candidato = db.query(Candidato).filter(Candidato.id == evento.candidato_id).first()
    if not candidato:
        return

    vaga = db.query(Vaga).filter(Vaga.id == candidato.vaga_id).first() if candidato.vaga_id else None
    tipo_label = TIPOS_LABEL.get(evento.tipo, "Evento")
    data_fmt = evento.inicio.strftime("%d/%m/%Y às %H:%M")

    # Registra no histórico do candidato
    historico_registrar(
        db,
        candidato_id=evento.candidato_id,
        tipo=TipoHistorico.observacao,
        titulo=f"{tipo_label} agendado(a): {data_fmt}",
        texto=(
            f"Evento: {evento.titulo}\n"
            f"Local: {evento.local or 'A confirmar'}\n"
            + (f"Descrição: {evento.descricao}" if evento.descricao else "")
        ).strip(),
        criado_por="Agenda",
    )

    # Envia e-mail ao candidato
    if enviar_email and candidato.email:
        notificar_agendamento(db, candidato, vaga, evento)

    db.commit()


@router.post("/", response_model=EventoOut, status_code=status.HTTP_201_CREATED)
def criar_evento(
    payload: EventoCreate,
    enviar_email: bool = True,
    db: Session = Depends(get_db),
):
    evento = Evento(**payload.model_dump())
    db.add(evento)
    db.commit()
    db.refresh(evento)
    _processar_candidato(db, evento, enviar_email=enviar_email)
    return evento


@router.get("/", response_model=List[EventoOut])
def listar_eventos(
    inicio: Optional[datetime] = None,
    fim: Optional[datetime] = None,
    tipo: Optional[str] = None,
    candidato_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(Evento)
    if inicio:
        q = q.filter(Evento.inicio >= inicio)
    if fim:
        q = q.filter(Evento.inicio <= fim)
    if tipo:
        q = q.filter(Evento.tipo == tipo)
    if candidato_id:
        q = q.filter(Evento.candidato_id == candidato_id)
    return q.order_by(Evento.inicio.asc()).offset(skip).limit(limit).all()


@router.get("/candidato/{candidato_id}", response_model=List[EventoOut])
def eventos_do_candidato(candidato_id: int, db: Session = Depends(get_db)):
    """Lista todos os eventos agendados para um candidato específico."""
    return (
        db.query(Evento)
        .filter(Evento.candidato_id == candidato_id)
        .order_by(Evento.inicio.asc())
        .all()
    )


@router.get("/{evento_id}", response_model=EventoOut)
def obter_evento(evento_id: int, db: Session = Depends(get_db)):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return evento


@router.put("/{evento_id}", response_model=EventoOut)
def atualizar_evento(
    evento_id: int,
    payload: EventoUpdate,
    enviar_email: bool = False,
    db: Session = Depends(get_db),
):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(evento, campo, valor)
    db.commit()
    db.refresh(evento)
    _processar_candidato(db, evento, enviar_email=enviar_email)
    return evento


@router.delete("/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_evento(evento_id: int, db: Session = Depends(get_db)):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    db.delete(evento)
    db.commit()
