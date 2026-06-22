from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class TemplateNotificacao(Base):
    """
    Templates de mensagem por etapa do pipeline.
    O recrutador configura uma vez — o sistema dispara automaticamente.
    """
    __tablename__ = "templates_notificacao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    etapa: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    assunto_email: Mapped[str] = mapped_column(String(300), nullable=False)
    corpo_email: Mapped[str] = mapped_column(Text, nullable=False)
    # Variáveis disponíveis: {nome}, {vaga}, {empresa}, {data_entrevista}, {link_entrevista}, {responsavel}
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    canal_email: Mapped[bool] = mapped_column(Boolean, default=True)
    canal_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Notificacao(Base):
    """Histórico de mensagens enviadas aos candidatos."""
    __tablename__ = "notificacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidato_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidatos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vaga_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vagas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    etapa: Mapped[str] = mapped_column(String(50), nullable=False)
    canal: Mapped[str] = mapped_column(String(20), default="email")  # email | whatsapp | sms
    destinatario: Mapped[str] = mapped_column(String(200), nullable=False)
    assunto: Mapped[str] = mapped_column(String(300), nullable=True)
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="enviado")  # enviado | falhou | pendente
    erro: Mapped[str] = mapped_column(Text, nullable=True)
    enviado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Entrevista(Base):
    """Agendamento de entrevistas com data, horário e link."""
    __tablename__ = "entrevistas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidato_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidatos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vaga_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("vagas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    # Ex: "entrevista_rh" | "entrevista_tecnica" | "teste_pratico"
    data_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duracao_minutos: Mapped[int] = mapped_column(Integer, default=60)
    local_ou_link: Mapped[str] = mapped_column(String(500), nullable=True)
    responsavel: Mapped[str] = mapped_column(String(200), nullable=True)
    observacoes: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="agendada")
    # agendada | confirmada | realizada | cancelada
    notificacao_enviada: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
