from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class SeveridadeVies(str, enum.Enum):
    baixa  = "baixa"
    media  = "media"
    alta   = "alta"


class StatusVies(str, enum.Enum):
    aberto   = "aberto"
    resolvido = "resolvido"
    monitorando = "monitorando"


class CategoriaVies(str, enum.Enum):
    genero        = "genero"
    etnia         = "etnia"
    idade         = "idade"
    escolaridade  = "escolaridade"
    origem        = "origem"
    aparencia     = "aparencia"
    afinidade     = "afinidade"
    confirmacao   = "confirmacao"
    ancoragem     = "ancoragem"
    outro         = "outro"


class ViésRegistro(Base):
    __tablename__ = "vieses_registros"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    titulo:      Mapped[str]      = mapped_column(String(300), nullable=False)
    descricao:   Mapped[str]      = mapped_column(Text, nullable=False)
    categoria:   Mapped[str]      = mapped_column(Enum(CategoriaVies), default=CategoriaVies.outro)
    severidade:  Mapped[str]      = mapped_column(Enum(SeveridadeVies), default=SeveridadeVies.media)
    status:      Mapped[str]      = mapped_column(Enum(StatusVies), default=StatusVies.aberto)
    vaga_id:     Mapped[int]      = mapped_column(Integer, nullable=True)
    responsavel: Mapped[str]      = mapped_column(String(200), nullable=True)
    acao:        Mapped[str]      = mapped_column(Text, nullable=True)
    criado_em:   Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
