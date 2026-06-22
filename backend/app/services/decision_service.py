"""
decision_service.py
Diário de decisões de RH.
Reaproveitado diretamente da Aula 14 (projeto OpenClaw / diário de decisões),
adaptado para o contexto de recrutamento e seleção.
"""
import json
from groq import Groq
from sqlalchemy.orm import Session
from app.config import settings
from app.models.decisao import Decisao
from app.schemas.decisao import DecisaoCreate

_groq = None


def _get_groq() -> Groq:
    global _groq
    if _groq is None:
        _groq = Groq(api_key=settings.GROQ_API_KEY)
    return _groq


def _chamar_groq(system: str, user: str) -> str:
    resp = _get_groq().chat.completions.create(
        model=settings.GROQ_MODEL,
        max_tokens=800,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return resp.choices[0].message.content


def registrar_decisao(db: Session, payload: DecisaoCreate) -> Decisao:
    """Persiste uma decisão de RH no banco."""
    decisao = Decisao(
        candidato_id=payload.candidato_id,
        vaga_id=payload.vaga_id,
        tipo_decisao=payload.tipo_decisao,
        responsavel=payload.responsavel,
        justificativa=payload.justificativa,
        pros=json.dumps(payload.pros or [], ensure_ascii=False),
        contras=json.dumps(payload.contras or [], ensure_ascii=False),
        estado_emocional=payload.estado_emocional,
        nivel_confianca=payload.nivel_confianca,
    )
    db.add(decisao)
    db.commit()
    db.refresh(decisao)
    return decisao


def listar_por_candidato(db: Session, candidato_id: int) -> list[Decisao]:
    return (
        db.query(Decisao)
        .filter(Decisao.candidato_id == candidato_id)
        .order_by(Decisao.criado_em.desc())
        .all()
    )


def listar_por_vaga(db: Session, vaga_id: int) -> list[Decisao]:
    return (
        db.query(Decisao)
        .filter(Decisao.vaga_id == vaga_id)
        .order_by(Decisao.criado_em.desc())
        .all()
    )


def sugerir_pros_contras(justificativa: str, tipo_decisao: str) -> dict:
    """
    Usa o LLM para extrair prós e contras da justificativa escrita pelo recrutador.
    Inspirado na função _extrair_pros_contras da Aula 14.
    """
    system = (
        "Você extrai prós e contras de justificativas de decisões de RH. "
        "Responda APENAS em JSON."
    )
    user = f"""Tipo de decisão: {tipo_decisao}
Justificativa do recrutador: "{justificativa}"

Extraia:
- pros: lista de vantagens (máx 4)
- contras: lista de desvantagens ou riscos (máx 4)

JSON exato:
{{"pros": [], "contras": []}}"""

    texto = _chamar_groq(system, user)
    import re
    match = re.search(r"\{.*\}", texto, re.DOTALL)
    if not match:
        return {"pros": [], "contras": []}
    return json.loads(match.group())
