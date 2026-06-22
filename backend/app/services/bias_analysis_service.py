"""
bias_analysis_service.py
Análise de padrões e vieses no processo seletivo.
Reaproveitado da Aula 14 (_analisar_padroes), adaptado para detectar vieses em RH.
"""
import json
from groq import Groq
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.models.decisao import Decisao
from app.models.candidato import Candidato, StatusTriagem

_groq = None


def _get_groq() -> Groq:
    global _groq
    if _groq is None:
        _groq = Groq(api_key=settings.GROQ_API_KEY)
    return _groq


def _chamar_groq(system: str, user: str) -> str:
    resp = _get_groq().chat.completions.create(
        model=settings.GROQ_MODEL,
        max_tokens=1500,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return resp.choices[0].message.content


def _agregar_metricas_vaga(db: Session, vaga_id: int | None) -> dict:
    """Agrega métricas de decisões de forma agregada (sem dados pessoais)."""
    query = db.query(Decisao)
    candidatos_q = db.query(Candidato)

    if vaga_id:
        query = query.filter(Decisao.vaga_id == vaga_id)
        candidatos_q = candidatos_q.filter(Candidato.vaga_id == vaga_id)

    decisoes = query.all()
    candidatos = candidatos_q.all()

    if not decisoes:
        return {}

    # Confiança média por tipo de decisão
    confianca_por_tipo: dict[str, list] = {}
    for d in decisoes:
        confianca_por_tipo.setdefault(d.tipo_decisao, []).append(d.nivel_confianca)

    confianca_media = {
        tipo: round(sum(v) / len(v), 2)
        for tipo, v in confianca_por_tipo.items()
    }

    # Distribuição de etapas
    etapas = {}
    for c in candidatos:
        etapas[c.etapa_pipeline] = etapas.get(c.etapa_pipeline, 0) + 1

    # Score IA vs decisão humana
    aprovados_ia = sum(1 for c in candidatos if c.status_triagem == StatusTriagem.aprovado)
    reprovados_ia = sum(1 for c in candidatos if c.status_triagem == StatusTriagem.reprovado)
    pendentes_ia = sum(1 for c in candidatos if c.status_triagem == StatusTriagem.analise_humana)
    score_medio_ia = (
        sum(c.score_aderencia for c in candidatos if c.score_aderencia is not None)
        / max(sum(1 for c in candidatos if c.score_aderencia is not None), 1)
    )

    reprovados_humano = sum(
        1 for d in decisoes if "reprovado" in d.tipo_decisao
    )
    aprovados_humano = sum(
        1 for d in decisoes
        if d.tipo_decisao in ("contratado", "aprovado_entrevista_rh", "aprovado_entrevista_tecnica")
    )

    sem_justificativa = sum(
        1 for d in decisoes if not d.justificativa or len(d.justificativa) < 20
    )

    return {
        "total_candidatos": len(candidatos),
        "total_decisoes": len(decisoes),
        "aprovados_ia": aprovados_ia,
        "reprovados_ia": reprovados_ia,
        "pendentes_ia": pendentes_ia,
        "score_medio_ia": round(score_medio_ia, 1),
        "reprovados_humano": reprovados_humano,
        "aprovados_humano": aprovados_humano,
        "decisoes_sem_justificativa_clara": sem_justificativa,
        "distribuicao_etapas": etapas,
        "confianca_media_por_tipo": confianca_media,
    }


def analisar_vieses(db: Session, vaga_id: int | None = None) -> dict:
    """
    Analisa o histórico de decisões e gera relatório de padrões e vieses.
    Retorna dados agregados + análise do LLM.
    Inspirado em _analisar_padroes da Aula 14.
    """
    metricas = _agregar_metricas_vaga(db, vaga_id)

    if not metricas or metricas.get("total_decisoes", 0) == 0:
        return {
            "metricas": metricas,
            "analise": "Dados insuficientes para análise de padrões.",
            "vaga_id": vaga_id,
        }

    system = (
        "Você é um especialista em diversidade e inclusão em processos seletivos. "
        "Analisa métricas de processos de recrutamento para identificar padrões de viés. "
        "Seja específico, cite números, evite generalizações. "
        "Foque em riscos concretos observáveis nos dados."
    )

    user = f"""Analise estas métricas de um processo seletivo{' (vaga #' + str(vaga_id) + ')' if vaga_id else ''}:

{json.dumps(metricas, ensure_ascii=False, indent=2)}

Gere um relatório estruturado com:
1. **Padrões identificados** — o que os números mostram?
2. **Riscos de viés** — onde o processo pode estar discriminando inadvertidamente?
3. **Diferença IA vs humano** — a IA e os recrutadores divergem? Em qual direção?
4. **Decisões de baixa qualidade** — decisões sem justificativa clara, baixa confiança?
5. **Recomendações** — 3 ações concretas para melhorar o processo.

Use dados numéricos. Não faça suposições sobre atributos sensíveis dos candidatos."""

    analise_llm = _chamar_groq(system, user)

    return {
        "vaga_id": vaga_id,
        "metricas": metricas,
        "analise": analise_llm,
    }
