from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class RoleUsuario(str, enum.Enum):
    admin = "admin"
    user  = "user"


class Usuario(Base):
    __tablename__ = "usuarios"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    nome:        Mapped[str]      = mapped_column(String(200), nullable=False)
    email:       Mapped[str]      = mapped_column(String(200), nullable=False, unique=True, index=True)
    senha_hash:  Mapped[str]      = mapped_column(String(300), nullable=False)
    role:        Mapped[str]      = mapped_column(Enum(RoleUsuario), default=RoleUsuario.user, nullable=False)
    ativo:       Mapped[bool]     = mapped_column(Boolean, default=True)
    criado_em:   Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
