from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

# Etapas válidas do pipeline — ordem importa para exibição
ETAPAS_PIPELINE = [
    "triado",
    "entrevista_rh",
    "entrevista_tecnica",
    "teste_pratico",
    "oferta",
    "contratado",
    "reprovado",
]


class PipelineHistorico(Base):
    """Cada linha representa uma movimentação de candidato entre etapas."""

    __tablename__ = "pipeline_historico"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidato_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidatos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vaga_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vagas.id", ondelete="CASCADE"), nullable=True, index=True
    )
    etapa_anterior: Mapped[str] = mapped_column(String(50), nullable=True)
    etapa_nova: Mapped[str] = mapped_column(String(50), nullable=False)
    responsavel: Mapped[str] = mapped_column(String(200), nullable=True)
    observacao: Mapped[str] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
