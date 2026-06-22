from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.models.candidato import StatusTriagem


class CandidatoCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    vaga_id: Optional[int] = None


class CandidatoUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    vaga_id: Optional[int] = None


class AnaliseIA(BaseModel):
    score: int
    classificacao: str  # "aprovado" | "pendente" | "reprovado"
    pontos_fortes: List[str]
    pontos_de_atencao: List[str]
    lacunas: List[str]
    justificativa: str
    recomendacao_para_recrutador: str


class CandidatoOut(BaseModel):
    id: int
    nome: str
    email: str
    telefone: Optional[str]
    linkedin: Optional[str]
    cv_filename: Optional[str]
    vaga_id: Optional[int]
    status_triagem: str
    score_aderencia: Optional[float]
    justificativa_ia: Optional[str]
    etapa_pipeline: str
    criado_em: datetime

    model_config = {"from_attributes": True}
