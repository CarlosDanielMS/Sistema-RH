"""
webhooks.py
Endpoints chamados pelo n8n para integração bidirecional.

Fluxo de entrada (n8n → sistema):
  POST /webhooks/email-candidato
    → n8n recebe e-mail com CV
    → extrai nome, email, texto do CV e vaga_id
    → chama este endpoint
    → sistema cria candidato + dispara análise IA + envia confirmação

Fluxo de saída (sistema → n8n):
  Quando candidato muda de etapa, notification_service.py já chama
  o webhook n8n configurado em N8N_WEBHOOK_URL.
  Este arquivo expõe também:
  POST /webhooks/teste-pipeline  → simula evento para testar o flow n8n
"""
import logging
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.candidato import Candidato, StatusTriagem
from app.models.vaga import Vaga
from app.services.notification_service import notificar_mudanca_etapa, _enviar_email
from app.services.candidato_analyzer import analisar_candidato
from app.services.cv_parser import extrair_texto, sanitizar_para_triagem
from app.services.rag_service import indexar_curriculo, remover_curriculo

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks n8n"])


# ── Schemas de entrada ────────────────────────────────────────────────────────

class EmailCandidatoPayload(BaseModel):
    """Payload enviado pelo n8n quando chega e-mail de candidato."""
    nome: str
    email: str
    telefone: Optional[str] = None
    linkedin: Optional[str] = None
    cv_texto: str
    vaga_id: Optional[int] = None
    # Metadados do e-mail original
    email_assunto: Optional[str] = None
    email_remetente: Optional[str] = None


class TestarFlowPayload(BaseModel):
    candidato_id: int
    etapa: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/email-candidato")
async def receber_candidato_por_email(
    payload: EmailCandidatoPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Recebe dados de candidato extraídos pelo n8n a partir de um e-mail com CV.
    Cria o candidato, agenda análise IA em background e envia e-mail de confirmação.
    """
    # Verifica se candidato já existe para esta vaga
    filtro = db.query(Candidato).filter(Candidato.email == payload.email)
    if payload.vaga_id:
        filtro = filtro.filter(Candidato.vaga_id == payload.vaga_id)
    existente = filtro.first()

    if existente:
        logger.info(f"Candidato {payload.email} já existe (id={existente.id}). Ignorando duplicata.")
        return {
            "status": "duplicata_ignorada",
            "candidato_id": existente.id,
            "mensagem": "Candidato já cadastrado para esta vaga.",
        }

    # Cria candidato
    candidato = Candidato(
        nome=payload.nome,
        email=payload.email,
        telefone=payload.telefone,
        linkedin=payload.linkedin,
        cv_texto=payload.cv_texto,
        vaga_id=payload.vaga_id,
        status_triagem=StatusTriagem.pendente,
        etapa_pipeline="triado",
    )
    db.add(candidato)
    db.commit()
    db.refresh(candidato)

    logger.info(f"Candidato criado via e-mail: {candidato.nome} (id={candidato.id})")

    # Envia e-mail de confirmação de recebimento
    vaga = None
    if payload.vaga_id:
        vaga = db.query(Vaga).filter(Vaga.id == payload.vaga_id).first()

    if vaga:
        try:
            notificar_mudanca_etapa(db, candidato, vaga, "triado")
        except Exception as e:
            logger.warning(f"Falha ao notificar candidato {candidato.id}: {e}")

    # Dispara análise IA em background
    if payload.vaga_id and payload.cv_texto:
        background_tasks.add_task(
            _analisar_em_background,
            candidato_id=candidato.id,
            vaga_id=payload.vaga_id,
            cv_texto=payload.cv_texto,
        )

    return {
        "status": "criado",
        "candidato_id": candidato.id,
        "nome": candidato.nome,
        "email": candidato.email,
        "vaga_id": payload.vaga_id,
        "analise_ia": "em_andamento" if payload.cv_texto else "sem_cv",
        "notificacao_confirmacao": "enviada" if vaga else "sem_vaga_associada",
    }


@router.post("/teste-pipeline")
def testar_notificacao_pipeline(
    payload: TestarFlowPayload,
    db: Session = Depends(get_db),
):
    """
    Simula mudança de etapa para testar o fluxo n8n sem mover o candidato de fato.
    Útil para validar templates de e-mail e webhook do n8n.
    """
    candidato = db.query(Candidato).filter(Candidato.id == payload.candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")

    vaga = db.query(Vaga).filter(Vaga.id == candidato.vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga do candidato não encontrada")

    notifs = notificar_mudanca_etapa(db, candidato, vaga, payload.etapa)
    return {
        "status": "teste_executado",
        "candidato": candidato.nome,
        "email": candidato.email,
        "etapa_testada": payload.etapa,
        "notificacoes_disparadas": len(notifs),
        "canais": [n.canal for n in notifs],
    }


@router.get("/vagas-abertas")
def vagas_abertas(db: Session = Depends(get_db)):
    """Retorna vagas abertas para o formulário público de candidatura."""
    vagas = db.query(Vaga).filter(Vaga.status == "aberta").all()
    return [{"id": v.id, "titulo": v.titulo, "descricao": v.descricao,
             "senioridade": v.senioridade, "modelo_trabalho": v.modelo_trabalho,
             "localizacao": v.localizacao, "faixa_salarial": v.faixa_salarial} for v in vagas]


@router.post("/candidatar")
async def candidatura_publica(
    nome:      str       = Form(...),
    email:     str       = Form(...),
    telefone:  str       = Form(""),
    linkedin:  str       = Form(""),
    vaga_id:   int       = Form(...),
    curriculo: UploadFile = File(...),
    db:        Session   = Depends(get_db),
):
    """
    Endpoint público chamado pelo n8n (ou diretamente).
    Recebe dados + PDF do candidato, analisa com IA e decide:
      - score >= SCORE_PENDENTE → entra no sistema como 'triado'
      - score < SCORE_PENDENTE  → rejeitado (não entra no sistema)
    """
    # Verificar duplicata
    existente = db.query(Candidato).filter(
        Candidato.email == email, Candidato.vaga_id == vaga_id
    ).first()
    if existente:
        return JSONResponse({"status": "duplicata", "candidato_id": existente.id,
                             "mensagem": "Candidatura já registrada para esta vaga."})

    # Verificar vaga
    vaga = db.query(Vaga).filter(Vaga.id == vaga_id, Vaga.status == "aberta").first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada ou encerrada.")

    # Salvar PDF
    conteudo = await curriculo.read()
    if len(conteudo) > settings.MAX_CV_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Arquivo excede {settings.MAX_CV_SIZE_MB}MB.")

    # Extrair texto do PDF
    nome_arquivo = f"pub_{uuid.uuid4().hex[:8]}.pdf"
    caminho = UPLOAD_DIR / nome_arquivo
    caminho.write_bytes(conteudo)
    try:
        texto_cv = extrair_texto(caminho)
    except Exception:
        caminho.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Não foi possível extrair texto do PDF.")

    if not texto_cv.strip():
        caminho.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="O PDF não contém texto legível.")

    # Criar candidato temporário para análise
    candidato = Candidato(
        nome=nome, email=email, telefone=telefone or None, linkedin=linkedin or None,
        cv_texto=texto_cv, cv_filename=nome_arquivo, vaga_id=vaga_id,
        status_triagem=StatusTriagem.pendente, etapa_pipeline="triado",
    )
    db.add(candidato)
    db.commit()
    db.refresh(candidato)

    # Indexar no ChromaDB
    try:
        texto_san = sanitizar_para_triagem(texto_cv)
        doc_id = indexar_curriculo(candidato.id, texto_san, {"nome": nome, "vaga_id": vaga_id})
        candidato.chroma_doc_id = doc_id
        db.commit()
    except Exception as e:
        logger.warning(f"ChromaDB não indexado para candidato público {candidato.id}: {e}")

    # Análise IA
    try:
        analise, latencia = analisar_candidato(
            candidato_id=candidato.id,
            cv_texto=texto_cv,
            titulo_vaga=vaga.titulo,
            descricao_vaga=vaga.descricao,
            requisitos_obrigatorios=vaga.requisitos_obrigatorios,
            requisitos_desejáveis=vaga.requisitos_desejáveis or "",
        )
        score = analise.score
    except Exception as e:
        logger.error(f"Falha na análise IA (candidatura pública {candidato.id}): {e}")
        db.delete(candidato)
        db.commit()
        caminho.unlink(missing_ok=True)
        raise HTTPException(status_code=502, detail=f"Falha na análise IA: {str(e)}")

    # Decisão por score
    mapa_status = {"aprovado": StatusTriagem.aprovado, "pendente": StatusTriagem.analise_humana, "reprovado": StatusTriagem.reprovado}
    candidato.score_aderencia = score
    candidato.status_triagem  = mapa_status.get(analise.classificacao, StatusTriagem.pendente)
    candidato.justificativa_ia = analise.justificativa

    def _notificar_n8n(status: str, score: int, classificacao: str):
        """Notifica o n8n com o resultado da candidatura para automações adicionais."""
        if not settings.N8N_WEBHOOK_URL:
            return
        import httpx
        try:
            httpx.post(
                f"{settings.N8N_WEBHOOK_URL}/candidatura-resultado",
                json={
                    "status":        status,
                    "score":         score,
                    "classificacao": classificacao,
                    "candidato_id":  candidato.id if status == "aprovado" else None,
                    "nome":          nome,
                    "email":         email,
                    "vaga_titulo":   vaga.titulo,
                    "vaga_id":       vaga_id,
                    "empresa":       settings.EMPRESA_NOME,
                },
                timeout=5,
            )
        except Exception as e:
            logger.warning(f"Falha ao notificar n8n sobre candidatura: {e}")

    if score >= settings.SCORE_PENDENTE:
        # ✅ Aprovado na triagem automática — entra no sistema
        db.commit()
        try:
            notificar_mudanca_etapa(db, candidato, vaga, "triado")
        except Exception:
            pass
        _notificar_n8n("aprovado", score, analise.classificacao)
        logger.info(f"Candidatura aprovada: {email} | vaga={vaga_id} | score={score}")
        return {
            "status": "aprovado",
            "candidato_id": candidato.id,
            "score": score,
            "classificacao": analise.classificacao,
            "mensagem": "Parabéns! Sua candidatura passou pela triagem automática e está sendo analisada pelo time de RH.",
        }
    else:
        # ❌ Reprovado — remove do sistema e notifica
        db.delete(candidato)
        db.commit()
        caminho.unlink(missing_ok=True)
        try:
            remover_curriculo(candidato.id)
        except Exception:
            pass
        # Envia e-mail de feedback ao candidato
        try:
            _enviar_email(
                email,
                f"Obrigado pelo interesse — {vaga.titulo}",
                f"Olá, {nome.split()[0]}!\n\n"
                f"Agradecemos seu interesse na vaga {vaga.titulo} na {settings.EMPRESA_NOME}.\n\n"
                f"Após análise do seu currículo, identificamos que seu perfil não atende "
                f"os requisitos mínimos desta oportunidade no momento.\n\n"
                f"Encorajamos você a se candidatar em futuras oportunidades!\n\n"
                f"Equipe de RH — {settings.EMPRESA_NOME}"
            )
        except Exception:
            pass
        _notificar_n8n("reprovado", score, analise.classificacao)
        logger.info(f"Candidatura reprovada (score={score}): {email} | vaga={vaga_id}")
        return {
            "status": "reprovado",
            "score": score,
            "mensagem": "Agradecemos seu interesse. Seu perfil não atendeu os requisitos mínimos desta vaga.",
        }


@router.get("/status")
def status_webhooks():
    """Retorna status da integração n8n e configurações ativas."""
    from app.config import settings
    return {
        "smtp_configurado": bool(settings.SMTP_HOST and settings.SMTP_USER),
        "smtp_host": settings.SMTP_HOST or "não configurado",
        "n8n_webhook_configurado": bool(settings.N8N_WEBHOOK_URL),
        "n8n_webhook_url": settings.N8N_WEBHOOK_URL or "não configurado",
        "empresa": settings.EMPRESA_NOME,
        "endpoints_n8n": {
            "receber_cv_por_email": "POST /webhooks/email-candidato",
            "testar_flow": "POST /webhooks/teste-pipeline",
        },
    }


# ── Background tasks ──────────────────────────────────────────────────────────

def _analisar_em_background(candidato_id: int, vaga_id: int, cv_texto: str):
    """Executa análise IA em background após criação do candidato."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        candidato = db.query(Candidato).filter(Candidato.id == candidato_id).first()
        vaga = db.query(Vaga).filter(Vaga.id == vaga_id).first()
        if candidato and vaga:
            analisar_candidato(
                candidato_id=candidato.id,
                cv_texto=candidato.cv_texto or cv_texto,
                titulo_vaga=vaga.titulo,
                descricao_vaga=vaga.descricao,
                requisitos_obrigatorios=vaga.requisitos_obrigatorios,
                requisitos_desejáveis=vaga.requisitos_desejáveis or "",
            )
            logger.info(f"Análise IA concluída para candidato {candidato_id}")
    except Exception as e:
        logger.error(f"Falha na análise IA background (candidato {candidato_id}): {e}")
    finally:
        db.close()
