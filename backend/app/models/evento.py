from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, DateTime, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class TipoEvento(str, enum.Enum):
    entrevista = "entrevista"
    reuniao = "reuniao"
    prazo = "prazo"
    onboarding = "onboarding"
    feedback = "feedback"
    outro = "outro"


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=True)
    tipo: Mapped[str] = mapped_column(Enum(TipoEvento), default=TipoEvento.reuniao)
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fim: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    dia_inteiro: Mapped[bool] = mapped_column(Boolean, default=False)
    local: Mapped[str] = mapped_column(String(300), nullable=True)
    participantes: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    cor: Mapped[str] = mapped_column(String(20), nullable=True)
    candidato_id: Mapped[int] = mapped_column(Integer, nullable=True)
    vaga_id: Mapped[int] = mapped_column(Integer, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
