from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.vaga import StatusVaga, ModeloTrabalho, Senioridade


class VagaCreate(BaseModel):
    titulo: str
    descricao: str
    requisitos_obrigatorios: str
    requisitos_desejáveis: Optional[str] = None
    senioridade: Senioridade = Senioridade.pleno
    modelo_trabalho: ModeloTrabalho = ModeloTrabalho.presencial
    localizacao: Optional[str] = None
    faixa_salarial: Optional[str] = None
    responsavel: str


class VagaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    requisitos_obrigatorios: Optional[str] = None
    requisitos_desejáveis: Optional[str] = None
    senioridade: Optional[Senioridade] = None
    modelo_trabalho: Optional[ModeloTrabalho] = None
    localizacao: Optional[str] = None
    faixa_salarial: Optional[str] = None
    status: Optional[StatusVaga] = None
    responsavel: Optional[str] = None


class VagaOut(BaseModel):
    id: int
    titulo: str
    descricao: str
    requisitos_obrigatorios: str
    requisitos_desejáveis: Optional[str]
    senioridade: str
    modelo_trabalho: str
    localizacao: Optional[str]
    faixa_salarial: Optional[str]
    status: str
    responsavel: str
    criado_em: datetime
    atualizado_em: datetime

    model_config = {"from_attributes": True}
