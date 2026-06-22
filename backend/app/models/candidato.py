from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class StatusTriagem(str, enum.Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    analise_humana = "analise_humana"
    reprovado = "reprovado"


class Candidato(Base):
    __tablename__ = "candidatos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    telefone: Mapped[str] = mapped_column(String(30), nullable=True)
    linkedin: Mapped[str] = mapped_column(String(300), nullable=True)

    # Currículo
    cv_filename: Mapped[str] = mapped_column(String(300), nullable=True)
    cv_texto: Mapped[str] = mapped_column(Text, nullable=True)
    chroma_doc_id: Mapped[str] = mapped_column(String(100), nullable=True)

    # Vínculo com vaga
    vaga_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vagas.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Resultado da triagem IA
    status_triagem: Mapped[str] = mapped_column(
        Enum(StatusTriagem), default=StatusTriagem.pendente
    )
    score_aderencia: Mapped[float] = mapped_column(Float, nullable=True)
    justificativa_ia: Mapped[str] = mapped_column(Text, nullable=True)

    # Etapa atual no pipeline
    etapa_pipeline: Mapped[str] = mapped_column(
        String(50), default="triado", nullable=False
    )

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    vaga = relationship("Vaga", backref="candidatos", lazy="select")
