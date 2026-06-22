from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.evento import TipoEvento


class EventoCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    tipo: TipoEvento = TipoEvento.reuniao
    inicio: datetime
    fim: Optional[datetime] = None
    dia_inteiro: bool = False
    local: Optional[str] = None
    participantes: Optional[str] = None
    cor: Optional[str] = None
    candidato_id: Optional[int] = None
    vaga_id: Optional[int] = None


class EventoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[TipoEvento] = None
    inicio: Optional[datetime] = None
    fim: Optional[datetime] = None
    dia_inteiro: Optional[bool] = None
    local: Optional[str] = None
    participantes: Optional[str] = None
    cor: Optional[str] = None
    candidato_id: Optional[int] = None
    vaga_id: Optional[int] = None


class EventoOut(BaseModel):
    id: int
    titulo: str
    descricao: Optional[str]
    tipo: str
    inicio: datetime
    fim: Optional[datetime]
    dia_inteiro: bool
    local: Optional[str]
    participantes: Optional[str]
    cor: Optional[str]
    candidato_id: Optional[int]
    vaga_id: Optional[int]
    criado_em: datetime
    atualizado_em: datetime

    model_config = {"from_attributes": True}
