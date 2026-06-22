from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Decisao(Base):
    """Diário de decisões de RH — inspirado na Aula 14 (OpenClaw)."""

    __tablename__ = "decisoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    candidato_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidatos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vaga_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vagas.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # O que foi decidido
    tipo_decisao: Mapped[str] = mapped_column(String(100), nullable=False)
    # Ex: "aprovado_entrevista", "reprovado_triagem", "proposta_enviada", "contratado"

    responsavel: Mapped[str] = mapped_column(String(200), nullable=False)
    justificativa: Mapped[str] = mapped_column(Text, nullable=False)

    # Prós e contras registrados pelo recrutador (JSON como texto)
    pros: Mapped[str] = mapped_column(Text, nullable=True)   # JSON list
    contras: Mapped[str] = mapped_column(Text, nullable=True)  # JSON list

    # Estado emocional do recrutador ao tomar a decisão
    estado_emocional: Mapped[str] = mapped_column(String(100), nullable=True)

    # 0.0 – 1.0: o quão confiante o recrutador estava
    nivel_confianca: Mapped[float] = mapped_column(Float, default=0.5)

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
