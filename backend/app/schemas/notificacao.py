from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TemplateCreate(BaseModel):
    etapa: str
    assunto_email: str
    corpo_email: str
    ativo: bool = True
    canal_email: bool = True
    canal_whatsapp: bool = False


class TemplateUpdate(BaseModel):
    assunto_email: Optional[str] = None
    corpo_email: Optional[str] = None
    ativo: Optional[bool] = None
    canal_email: Optional[bool] = None
    canal_whatsapp: Optional[bool] = None


class TemplateOut(BaseModel):
    id: int
    etapa: str
    assunto_email: str
    corpo_email: str
    ativo: bool
    canal_email: bool
    canal_whatsapp: bool
    atualizado_em: datetime
    model_config = {"from_attributes": True}


class EntrevistaCreate(BaseModel):
    candidato_id: int
    vaga_id: int
    tipo: str
    data_hora: datetime
    duracao_minutos: int = 60
    local_ou_link: Optional[str] = None
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None


class EntrevistaOut(BaseModel):
    id: int
    candidato_id: int
    vaga_id: int
    tipo: str
    data_hora: datetime
    duracao_minutos: int
    local_ou_link: Optional[str]
    responsavel: Optional[str]
    observacoes: Optional[str]
    status: str
    notificacao_enviada: bool
    criado_em: datetime
    model_config = {"from_attributes": True}


class NotificacaoOut(BaseModel):
    id: int
    candidato_id: int
    vaga_id: int
    etapa: str
    canal: str
    destinatario: str
    assunto: Optional[str]
    mensagem: str
    status: str
    erro: Optional[str]
    enviado_em: datetime
    model_config = {"from_attributes": True}


class EnvioManualRequest(BaseModel):
    candidato_id: int
    vaga_id: int
    etapa: str
    mensagem_personalizada: Optional[str] = None
