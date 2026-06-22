"""
openclaw.py — Chatbot IA da plataforma RH-IA.
Assistente especializado em recrutamento, seleção e resolução de problemas de RH.
"""
import time
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from groq import Groq
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/openclaw", tags=["OpenClaw — Chatbot IA"])
logger = logging.getLogger("rh_ia")

SYSTEM_PROMPT = """Você é o OpenClaw, assistente de inteligência artificial especializado em Recrutamento, Seleção e Gestão de Pessoas da plataforma RH-IA.

Suas especialidades:
- Triagem e análise de currículos
- Gestão de pipeline de recrutamento
- Identificação de vieses em processos seletivos (conformidade LGPD)
- Boas práticas de entrevistas comportamentais e técnicas
- Estruturação de vagas e requisitos
- Análise de aderência candidato/vaga
- Tomada de decisão ética e auditável em RH
- Resolução de problemas em processos seletivos

Contexto do sistema:
- Etapas do pipeline: Triado → Entrevista RH → Entrevista Técnica → Teste Prático → Oferta → Contratado → Reprovado
- Score de aderência IA: 0–100 (aprovado ≥80, análise humana 50–79, reprovado <50)
- A plataforma usa Groq + LLaMA 3.3 para triagem automática
- Notificações automáticas por e-mail a cada mudança de etapa

Regras:
1. Responda SEMPRE em português brasileiro
2. Seja objetivo e prático — foque em soluções acionáveis
3. Quando o contexto mencionar dados do sistema (candidatos, vagas, scores), use-os na resposta
4. Para perguntas sobre vieses, mencione a LGPD e boas práticas de equidade
5. Nunca invente dados — se não souber, diga claramente
6. Use bullet points e formatação clara quando listar passos ou opções
7. Máximo de 400 palavras por resposta (seja conciso)"""


class Mensagem(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    mensagem: str
    historico: Optional[List[Mensagem]] = []
    contexto: Optional[str] = None  # JSON com dados do sistema (candidato atual, vaga, etc.)


class ChatResponse(BaseModel):
    resposta: str
    latencia_s: float


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Envia mensagem ao OpenClaw e recebe resposta da IA.
    Mantém histórico de conversa para contexto.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="Groq API não configurada")

    inicio = time.perf_counter()

    # Monta histórico de mensagens
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Adiciona contexto do sistema se fornecido
    if payload.contexto:
        messages.append({
            "role": "system",
            "content": f"Contexto atual do sistema:\n{payload.contexto}"
        })

    # Histórico da conversa (máx. 10 mensagens para não exceder contexto)
    for msg in (payload.historico or [])[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Mensagem atual do usuário
    messages.append({"role": "user", "content": payload.mensagem})

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            max_tokens=600,
            temperature=0.7,
        )
        resposta = completion.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenClaw: falha na chamada Groq — {e}")
        raise HTTPException(status_code=502, detail=f"Falha na IA: {str(e)}")

    latencia = round(time.perf_counter() - inicio, 2)
    logger.info(f"OpenClaw: resposta em {latencia}s | {len(resposta)} chars")

    return ChatResponse(resposta=resposta, latencia_s=latencia)


@router.get("/status")
def status():
    return {
        "ativo": bool(settings.GROQ_API_KEY),
        "modelo": settings.GROQ_MODEL,
        "especialidade": "Recrutamento, Seleção e Gestão de Pessoas",
    }
