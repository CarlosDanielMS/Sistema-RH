"""
marketing.py — Rotas do módulo de Marketing / Notificações automáticas.

Endpoints:
  GET    /marketing/templates              → lista templates por etapa
  PUT    /marketing/templates/{etapa}      → atualiza template de uma etapa
  GET    /marketing/notificacoes           → histórico de envios
  GET    /marketing/notificacoes/candidato/{id}
  POST   /marketing/enviar-manual          → envia mensagem manualmente
  GET    /marketing/entrevistas            → lista entrevistas
  POST   /marketing/entrevistas            → agenda entrevista + notifica candidato
  PUT    /marketing/entrevistas/{id}       → atualiza entrevista
  DELETE /marketing/entrevistas/{id}       → cancela entrevista
  GET    /marketing/stats                  → métricas de envio
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.notificacao import TemplateNotificacao, Notificacao, Entrevista
from app.models.candidato import Candidato
from app.models.vaga import Vaga
from app.schemas.notificacao import (
    TemplateCreate, TemplateUpdate, TemplateOut,
    EntrevistaCreate, EntrevistaOut,
    NotificacaoOut, EnvioManualRequest,
)
from app.services.notification_service import (
    notificar_mudanca_etapa, _renderizar, _montar_variaveis, _enviar_email,
)
from app.config import settings

router = APIRouter(prefix="/marketing", tags=["Marketing / Notificações"])


# ─── Templates ────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[TemplateOut])
def listar_templates(db: Session = Depends(get_db)):
    return db.query(TemplateNotificacao).order_by(TemplateNotificacao.etapa).all()


@router.get("/templates/{etapa}", response_model=TemplateOut)
def obter_template(etapa: str, db: Session = Depends(get_db)):
    t = db.query(TemplateNotificacao).filter(TemplateNotificacao.etapa == etapa).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return t


@router.put("/templates/{etapa}", response_model=TemplateOut)
def atualizar_template(etapa: str, payload: TemplateUpdate, db: Session = Depends(get_db)):
    t = db.query(TemplateNotificacao).filter(TemplateNotificacao.etapa == etapa).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado para esta etapa")
    for campo, valor in payload.model_dump(exclude_none=True).items():
        setattr(t, campo, valor)
    db.commit()
    db.refresh(t)
    return t


@router.post("/templates/{etapa}/preview")
def preview_template(etapa: str, candidato_id: int, db: Session = Depends(get_db)):
    """Renderiza o template com dados reais de um candidato — para prévia antes de ativar."""
    t = db.query(TemplateNotificacao).filter(TemplateNotificacao.etapa == etapa).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    candidato = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    vaga = db.query(Vaga).filter(Vaga.id == candidato.vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    variaveis = _montar_variaveis(candidato, vaga)
    return {
        "assunto": _renderizar(t.assunto_email, variaveis),
        "corpo": _renderizar(t.corpo_email, variaveis),
        "variaveis_usadas": variaveis,
    }


# ─── Entrevistas ──────────────────────────────────────────────────────────────

@router.post("/entrevistas", response_model=EntrevistaOut)
def agendar_entrevista(payload: EntrevistaCreate, db: Session = Depends(get_db)):
    """Agenda entrevista e dispara notificação automática ao candidato."""
    candidato = db.query(Candidato).filter(Candidato.id == payload.candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    vaga = db.query(Vaga).filter(Vaga.id == payload.vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    entrevista = Entrevista(**payload.model_dump())
    db.add(entrevista)
    db.flush()  # gera o id antes do commit

    # Dispara notificação automática
    notifs = notificar_mudanca_etapa(db, candidato, vaga, payload.tipo, entrevista)
    if notifs:
        entrevista.notificacao_enviada = True

    db.commit()
    db.refresh(entrevista)
    return entrevista


@router.get("/entrevistas", response_model=List[EntrevistaOut])
def listar_entrevistas(
    candidato_id: Optional[int] = None,
    vaga_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Entrevista)
    if candidato_id:
        q = q.filter(Entrevista.candidato_id == candidato_id)
    if vaga_id:
        q = q.filter(Entrevista.vaga_id == vaga_id)
    return q.order_by(Entrevista.data_hora.asc()).all()


@router.put("/entrevistas/{entrevista_id}", response_model=EntrevistaOut)
def atualizar_entrevista(
    entrevista_id: int,
    payload: EntrevistaCreate,
    db: Session = Depends(get_db),
):
    e = db.query(Entrevista).filter(Entrevista.id == entrevista_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    for campo, valor in payload.model_dump().items():
        setattr(e, campo, valor)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/entrevistas/{entrevista_id}", status_code=204)
def cancelar_entrevista(entrevista_id: int, db: Session = Depends(get_db)):
    e = db.query(Entrevista).filter(Entrevista.id == entrevista_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")
    e.status = "cancelada"
    db.commit()


# ─── Histórico de notificações ────────────────────────────────────────────────

@router.get("/notificacoes", response_model=List[NotificacaoOut])
def historico_notificacoes(
    skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
):
    return (
        db.query(Notificacao)
        .order_by(Notificacao.enviado_em.desc())
        .offset(skip).limit(limit).all()
    )


@router.get("/notificacoes/candidato/{candidato_id}", response_model=List[NotificacaoOut])
def notificacoes_candidato(candidato_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Notificacao)
        .filter(Notificacao.candidato_id == candidato_id)
        .order_by(Notificacao.enviado_em.desc())
        .all()
    )


@router.post("/enviar-manual")
def enviar_manual(payload: EnvioManualRequest, db: Session = Depends(get_db)):
    """Dispara notificação manualmente para um candidato, independente de mudança de etapa."""
    candidato = db.query(Candidato).filter(Candidato.id == payload.candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    vaga = db.query(Vaga).filter(Vaga.id == payload.vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    notifs = notificar_mudanca_etapa(db, candidato, vaga, payload.etapa)
    return {
        "mensagem": f"{len(notifs)} notificação(ões) enviadas",
        "notificacoes": [n.id for n in notifs],
    }


# ─── SMTP: status e teste ────────────────────────────────────────────────────

@router.get("/smtp-status")
def smtp_status():
    """Retorna status da configuração SMTP sem expor credenciais."""
    configurado = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)
    return {
        "configurado": configurado,
        "host": settings.SMTP_HOST or None,
        "porta": settings.SMTP_PORT,
        "usuario": settings.SMTP_USER or None,
        "tls": settings.SMTP_TLS,
        "empresa": settings.EMPRESA_NOME,
    }


@router.post("/testar-smtp")
def testar_smtp(destinatario: str | None = None):
    """Envia e-mail de teste para verificar a configuração SMTP."""
    if not settings.SMTP_HOST:
        raise HTTPException(status_code=400, detail="SMTP não configurado. Defina SMTP_HOST no .env.")
    destino = destinatario or settings.SMTP_USER
    if not destino:
        raise HTTPException(status_code=400, detail="Nenhum destinatário disponível.")
    try:
        _enviar_email(
            destinatario=destino,
            assunto=f"✅ Teste de e-mail — {settings.EMPRESA_NOME}",
            corpo=(
                f"Olá!\n\n"
                f"Este é um e-mail de teste enviado pela plataforma {settings.EMPRESA_NOME}.\n\n"
                f"Se você recebeu este e-mail, a configuração SMTP está funcionando corretamente.\n\n"
                f"Configuração:\n"
                f"  Host: {settings.SMTP_HOST}:{settings.SMTP_PORT}\n"
                f"  Usuário: {settings.SMTP_USER}\n\n"
                f"RH-IA Platform"
            ),
        )
        return {"sucesso": True, "mensagem": f"E-mail de teste enviado para {destino}."}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha no envio: {str(e)}")


@router.post("/enviar-teste-pratico")
def enviar_teste_pratico(
    candidato_id: int,
    link_teste: str,
    prazo: str,
    instrucoes: str = "",
    plataforma: str = "",
    db: Session = Depends(get_db),
):
    """
    Envia e-mail com link, prazo e instruções do Teste Prático para o candidato.
    Não depende do template configurado — usa modelo dedicado com os campos específicos.
    """
    from app.models.historico import TipoHistorico
    from app.routes.historico import registrar as historico_registrar

    candidato = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")

    vaga = db.query(Vaga).filter(Vaga.id == candidato.vaga_id).first() if candidato.vaga_id else None
    vaga_titulo = vaga.titulo if vaga else "em aberto"

    primeiro_nome = candidato.nome.split()[0]

    corpo = (
        f"Olá, {primeiro_nome}!\n\n"
        f"Parabéns! Sua candidatura para a vaga **{vaga_titulo}** avançou para a etapa de Teste Prático.\n\n"
        f"{'─' * 50}\n"
        f"  TESTE PRÁTICO\n"
        f"  Vaga: {vaga_titulo}\n"
        f"  Prazo: {prazo}\n"
        + (f"  Plataforma: {plataforma}\n" if plataforma else "")
        + f"{'─' * 50}\n\n"
        f"Acesse o teste pelo link abaixo:\n"
        f"{link_teste}\n\n"
        + (f"Instruções:\n{instrucoes}\n\n" if instrucoes else "")
        + f"Em caso de dúvidas, entre em contato com nossa equipe.\n\n"
        f"Boa sorte!\n"
        f"Equipe de RH — {settings.EMPRESA_NOME}"
    )

    assunto = f"📝 Teste Prático — {vaga_titulo}"
    status_envio, erro_msg = "enviado", None

    try:
        _enviar_email(candidato.email, assunto, corpo)
    except Exception as e:
        status_envio, erro_msg = "falhou", str(e)
        raise HTTPException(status_code=502, detail=f"Falha no envio: {str(e)}")
    finally:
        # Registra no histórico e notificações independente do resultado
        from app.models.notificacao import Notificacao
        notif = Notificacao(
            candidato_id=candidato_id,
            vaga_id=candidato.vaga_id,
            etapa="teste_pratico",
            canal="email",
            destinatario=candidato.email,
            assunto=assunto,
            mensagem=corpo,
            status=status_envio,
            erro=erro_msg,
        )
        db.add(notif)
        historico_registrar(
            db, candidato_id, TipoHistorico.observacao,
            titulo=f"Teste Prático enviado — prazo: {prazo}",
            texto=f"Link: {link_teste}\n" + (f"Plataforma: {plataforma}\n" if plataforma else "") + (f"Instruções: {instrucoes}" if instrucoes else ""),
            criado_por="Sistema",
        )
        db.commit()

    return {
        "sucesso": True,
        "mensagem": f"Teste Prático enviado para {candidato.email}",
        "destinatario": candidato.email,
    }


@router.post("/enviar-template/{etapa}")
def enviar_template_manual(etapa: str, candidato_id: int, db: Session = Depends(get_db)):
    """Envia manualmente o template de uma etapa para um candidato específico."""
    candidato = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    vaga = db.query(Vaga).filter(Vaga.id == candidato.vaga_id).first() if candidato.vaga_id else None
    if not vaga:
        raise HTTPException(status_code=422, detail="Candidato não está associado a uma vaga")
    notifs = notificar_mudanca_etapa(db, candidato, vaga, etapa)
    if not notifs:
        raise HTTPException(status_code=400, detail="Nenhum template ativo para esta etapa ou canais desabilitados")
    enviados = [n for n in notifs if n.status == "enviado"]
    falhos   = [n for n in notifs if n.status == "falhou"]
    return {
        "total": len(notifs),
        "enviados": len(enviados),
        "falhos": len(falhos),
        "detalhe": [{"canal": n.canal, "status": n.status, "erro": n.erro} for n in notifs],
    }


# ─── Estatísticas ─────────────────────────────────────────────────────────────

@router.get("/stats")
def estatisticas(db: Session = Depends(get_db)):
    total = db.query(func.count(Notificacao.id)).scalar()
    enviados = db.query(func.count(Notificacao.id)).filter(Notificacao.status == "enviado").scalar()
    falhos = db.query(func.count(Notificacao.id)).filter(Notificacao.status == "falhou").scalar()
    por_etapa = (
        db.query(Notificacao.etapa, func.count(Notificacao.id))
        .group_by(Notificacao.etapa)
        .all()
    )
    por_canal = (
        db.query(Notificacao.canal, func.count(Notificacao.id))
        .group_by(Notificacao.canal)
        .all()
    )
    entrevistas_agendadas = db.query(func.count(Entrevista.id)).filter(
        Entrevista.status == "agendada"
    ).scalar()

    return {
        "total_enviados": total,
        "sucesso": enviados,
        "falhas": falhos,
        "taxa_sucesso": round((enviados / total * 100) if total else 0, 1),
        "por_etapa": dict(por_etapa),
        "por_canal": dict(por_canal),
        "entrevistas_agendadas": entrevistas_agendadas,
    }
