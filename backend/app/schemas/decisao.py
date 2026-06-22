from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator
import json


TIPOS_DECISAO = [
    "aprovado_entrevista_rh",
    "aprovado_entrevista_tecnica",
    "aprovado_teste_pratico",
    "proposta_enviada",
    "contratado",
    "reprovado_triagem",
    "reprovado_entrevista",
    "processo_encerrado",
]


class DecisaoCreate(BaseModel):
    candidato_id: int
    vaga_id: int
    tipo_decisao: str
    responsavel: str
    justificativa: str
    pros: Optional[List[str]] = None
    contras: Optional[List[str]] = None
    estado_emocional: Optional[str] = None
    nivel_confianca: float = 0.5

    @field_validator("nivel_confianca")
    @classmethod
    def validar_confianca(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("nivel_confianca deve estar entre 0.0 e 1.0")
        return v


class DecisaoOut(BaseModel):
    id: int
    candidato_id: int
    vaga_id: int
    tipo_decisao: str
    responsavel: str
    justificativa: str
    pros: Optional[List[str]]
    contras: Optional[List[str]]
    estado_emocional: Optional[str]
    nivel_confianca: float
    criado_em: datetime

    model_config = {"from_attributes": True}

    @field_validator("pros", "contras", mode="before")
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v
