from datetime import datetime, timezone
from sqlalchemy import String, Text, Enum, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class StatusVaga(str, enum.Enum):
    aberta = "aberta"
    pausada = "pausada"
    encerrada = "encerrada"


class ModeloTrabalho(str, enum.Enum):
    presencial = "presencial"
    remoto = "remoto"
    hibrido = "hibrido"


class Senioridade(str, enum.Enum):
    estagio = "estagio"
    junior = "junior"
    pleno = "pleno"
    senior = "senior"
    especialista = "especialista"
    gestao = "gestao"


class Vaga(Base):
    __tablename__ = "vagas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    requisitos_obrigatorios: Mapped[str] = mapped_column(Text, nullable=False)
    requisitos_desejáveis: Mapped[str] = mapped_column(Text, nullable=True)
    senioridade: Mapped[str] = mapped_column(
        Enum(Senioridade), default=Senioridade.pleno
    )
    modelo_trabalho: Mapped[str] = mapped_column(
        Enum(ModeloTrabalho), default=ModeloTrabalho.presencial
    )
    localizacao: Mapped[str] = mapped_column(String(200), nullable=True)
    faixa_salarial: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(StatusVaga), default=StatusVaga.aberta
    )
    responsavel: Mapped[str] = mapped_column(String(200), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
