from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class TipoHistorico(str, enum.Enum):
    observacao  = "observacao"
    arquivo     = "arquivo"
    pipeline    = "pipeline"
    analise_ia  = "analise_ia"
    cv_upload   = "cv_upload"


class CandidatoHistorico(Base):
    __tablename__ = "candidato_historico"

    id:           Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    candidato_id: Mapped[int]      = mapped_column(Integer, ForeignKey("candidatos.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo:         Mapped[str]      = mapped_column(Enum(TipoHistorico), nullable=False)
    titulo:       Mapped[str]      = mapped_column(String(300), nullable=False)
    texto:        Mapped[str]      = mapped_column(Text, nullable=True)
    arquivo_nome: Mapped[str]      = mapped_column(String(300), nullable=True)
    arquivo_path: Mapped[str]      = mapped_column(String(500), nullable=True)
    criado_por:   Mapped[str]      = mapped_column(String(200), nullable=True, default="Sistema")
    criado_em:    Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
