from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.pipeline import ETAPAS_PIPELINE


class MoverCandidatoRequest(BaseModel):
    etapa_nova: str
    responsavel: str
    observacao: Optional[str] = None

    def validate_etapa(self) -> bool:
        return self.etapa_nova in ETAPAS_PIPELINE


class ObservacaoRequest(BaseModel):
    observacao: str
    responsavel: str


class PipelineItemOut(BaseModel):
    candidato_id: int
    nome_candidato: str
    email_candidato: str
    etapa_atual: str
    score_aderencia: Optional[float]
    status_triagem: str

    model_config = {"from_attributes": True}


class HistoricoMovimentacaoOut(BaseModel):
    id: int
    candidato_id: int
    vaga_id: int
    etapa_anterior: Optional[str]
    etapa_nova: str
    responsavel: Optional[str]
    observacao: Optional[str]
    criado_em: datetime

    model_config = {"from_attributes": True}


class PipelineVagaOut(BaseModel):
    vaga_id: int
    titulo_vaga: str
    etapas: dict  # { "triado": [...], "entrevista_rh": [...], ... }
