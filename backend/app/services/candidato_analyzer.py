"""
candidato_analyzer.py
Motor de triagem inteligente com RAG.
Combina busca semântica (ChromaDB) + LLM (Groq) para analisar aderência candidato/vaga.
Reaproveita a arquitetura de agente da Aula 13, reescrita para RH.
"""
import json
import re
import time
from groq import Groq
from app.config import settings
from app.services.rag_service import recuperar_contexto_candidato
from app.services.cv_parser import sanitizar_para_triagem
from app.schemas.candidato import AnaliseIA

_groq = None

SYSTEM_PROMPT = """Você é um especialista em análise de currículos e seleção de talentos.

REGRAS OBRIGATÓRIAS DE ÉTICA E LGPD:
- Analise APENAS competências técnicas, experiências profissionais, projetos, formação acadêmica e habilidades.
- JAMAIS mencione, deduza ou leve em conta: idade, gênero, raça, cor, religião, estado civil, orientação sexual, endereço, deficiência (PcD) ou qualquer atributo sensível.
- Se encontrar dados pessoais no currículo, ignore-os completamente.
- Sua análise deve ser auditável e livre de vieses.

FORMATO DE RESPOSTA:
Responda APENAS com JSON válido no formato abaixo, sem texto antes ou depois:
{
  "score": <inteiro 0-100>,
  "classificacao": <"aprovado" | "pendente" | "reprovado">,
  "pontos_fortes": [<lista de strings>],
  "pontos_de_atencao": [<lista de strings>],
  "lacunas": [<lista de strings>],
  "justificativa": "<parágrafo explicando o score>",
  "recomendacao_para_recrutador": "<orientação prática para o RH>"
}

REGRAS DE CLASSIFICAÇÃO:
- score 80-100 → classificacao: "aprovado"
- score 50-79  → classificacao: "pendente"
- score 0-49   → classificacao: "reprovado"
"""


def _get_groq() -> Groq:
    global _groq
    if _groq is None:
        _groq = Groq(api_key=settings.GROQ_API_KEY)
    return _groq


def _chamar_llm(prompt_usuario: str) -> str:
    resposta = _get_groq().chat.completions.create(
        model=settings.GROQ_MODEL,
        max_tokens=1500,
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt_usuario},
        ],
    )
    return resposta.choices[0].message.content


def _extrair_json(texto: str) -> dict:
    """Tenta extrair JSON mesmo que o LLM adicione texto extra."""
    match = re.search(r"\{.*\}", texto, re.DOTALL)
    if not match:
        raise ValueError(f"LLM não retornou JSON válido: {texto[:300]}")
    return json.loads(match.group())


def analisar_candidato(
    candidato_id: int,
    cv_texto: str,
    titulo_vaga: str,
    descricao_vaga: str,
    requisitos_obrigatorios: str,
    requisitos_desejáveis: str = "",
) -> tuple[AnaliseIA, float]:
    """
    Analisa a aderência do candidato à vaga usando RAG + LLM.

    Fluxo:
    1. Sanitiza o currículo (remove dados sensíveis)
    2. Recupera contexto semântico do ChromaDB (trechos mais relevantes para a vaga)
    3. Monta prompt com vaga + contexto
    4. Chama Groq para gerar score + justificativa
    5. Valida e retorna AnaliseIA

    Retorna: (AnaliseIA, latencia_segundos)
    """
    inicio = time.time()

    cv_sanitizado = sanitizar_para_triagem(cv_texto)

    # Recupera o trecho mais relevante do ChromaDB para os requisitos da vaga
    query_vaga = f"{titulo_vaga}. {requisitos_obrigatorios}"
    contexto_rag = recuperar_contexto_candidato(candidato_id, query_vaga)

    # Se não tem embedding ainda, usa o texto direto (modo fallback)
    contexto_curriculo = contexto_rag if contexto_rag else cv_sanitizado[:3000]

    prompt = f"""Analise a aderência deste candidato à vaga abaixo.

=== VAGA ===
Título: {titulo_vaga}
Descrição: {descricao_vaga}

Requisitos obrigatórios:
{requisitos_obrigatorios}

Requisitos desejáveis:
{requisitos_desejáveis or "Não informado"}

=== CURRÍCULO DO CANDIDATO (trechos relevantes) ===
{contexto_curriculo}

Gere a análise em JSON conforme as instruções do sistema."""

    resposta_bruta = _chamar_llm(prompt)
    dados = _extrair_json(resposta_bruta)

    # Garante que a classificação bate com o score (safety net)
    score = int(dados.get("score", 0))
    if score >= settings.SCORE_APROVADO:
        dados["classificacao"] = "aprovado"
    elif score >= settings.SCORE_PENDENTE:
        dados["classificacao"] = "pendente"
    else:
        dados["classificacao"] = "reprovado"

    latencia = round(time.time() - inicio, 2)
    return AnaliseIA(**dados), latencia
