"""
notification_service.py
Motor de envio automático de mensagens para candidatos.

Canais suportados:
  - E-mail via SMTP (Gmail, Outlook, SMTP customizado)
  - WhatsApp via n8n webhook (opcional)

Fluxo:
  1. Candidato muda de etapa no pipeline
  2. Pipeline route chama notificar_mudanca_etapa()
  3. Busca template configurado para a etapa
  4. Renderiza mensagem com dados do candidato/vaga/entrevista
  5. Envia pelo(s) canal(is) ativos
  6. Registra resultado no banco
"""
import smtplib
import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from string import Template

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.notificacao import TemplateNotificacao, Notificacao, Entrevista
from app.models.candidato import Candidato
from app.models.vaga import Vaga

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Templates padrão (inicializados no banco)
# ──────────────────────────────────────────────

TEMPLATES_PADRAO = [
    {
        "etapa": "triado",
        "assunto_email": "Sua candidatura para $vaga foi recebida! 🎉",
        "corpo_email": """Olá, $nome!

Recebemos sua candidatura para a vaga de $vaga na $empresa.

Seu currículo está sendo analisado pela nossa equipe. Em breve entraremos em contato com as próximas etapas.

Acompanhe o status da sua candidatura pelo e-mail cadastrado.

Obrigado pela sua candidatura!
Equipe de RH — $empresa""",
    },
    {
        "etapa": "entrevista_rh",
        "assunto_email": "Parabéns! Você foi selecionado para entrevista com RH 🗓️",
        "corpo_email": """Olá, $nome!

Temos ótimas notícias! Sua candidatura para $vaga avançou para a próxima etapa.

📅 ENTREVISTA COM RH
Data e horário: $data_entrevista
Local/Link: $link_entrevista
Responsável: $responsavel

Por favor, confirme sua presença respondendo este e-mail.

Qualquer dúvida, estamos à disposição!
Equipe de RH — $empresa""",
    },
    {
        "etapa": "entrevista_tecnica",
        "assunto_email": "Próxima etapa: Entrevista Técnica! 💻",
        "corpo_email": """Olá, $nome!

Você passou para a Entrevista Técnica da vaga $vaga!

📅 ENTREVISTA TÉCNICA
Data e horário: $data_entrevista
Local/Link: $link_entrevista
Responsável: $responsavel

Prepare-se para uma conversa técnica sobre as competências da vaga.

Boa sorte!
Equipe de RH — $empresa""",
    },
    {
        "etapa": "teste_pratico",
        "assunto_email": "Você avançou para o Teste Prático! 📝",
        "corpo_email": """Olá, $nome!

Sua candidatura para $vaga avançou para o Teste Prático.

📅 TESTE PRÁTICO
Data e horário: $data_entrevista
Local/Link: $link_entrevista

Em caso de dúvidas, entre em contato com $responsavel.

Boa sorte!
Equipe de RH — $empresa""",
    },
    {
        "etapa": "oferta",
        "assunto_email": "Você recebeu uma proposta! 🌟",
        "corpo_email": """Olá, $nome!

Temos o prazer de informar que você foi selecionado para receber uma proposta para a vaga $vaga!

Em breve entraremos em contato para apresentar os detalhes da oferta.

Parabéns pelo excelente desempenho!
Equipe de RH — $empresa""",
    },
    {
        "etapa": "contratado",
        "assunto_email": "Bem-vindo(a) à equipe! 🎊",
        "corpo_email": """Olá, $nome!

É uma alegria enorme dar as boas-vindas a você!

Você foi aprovado(a) para a vaga $vaga e fará parte da nossa equipe.

Entraremos em contato com os detalhes de onboarding em breve.

Seja muito bem-vindo(a)!
Equipe de RH — $empresa""",
    },
    {
        "etapa": "reprovado",
        "assunto_email": "Atualização sobre sua candidatura para $vaga",
        "corpo_email": """Olá, $nome!

Agradecemos imensamente seu interesse na vaga $vaga e o tempo dedicado ao nosso processo seletivo.

Após cuidadosa avaliação, decidimos seguir com outro perfil para esta oportunidade.
Esta decisão não reflete suas capacidades, e encorajamos você a se candidatar em futuras oportunidades.

Guardamos seu currículo e entraremos em contato caso surjam vagas alinhadas ao seu perfil.

Desejamos muito sucesso na sua jornada profissional!
Equipe de RH — $empresa""",
    },
]


TIPOS_EVENTO_LABEL = {
    "entrevista": "Entrevista",
    "reuniao":    "Reunião",
    "prazo":      "Prazo",
    "onboarding": "Onboarding",
    "feedback":   "Feedback/Retorno",
    "outro":      "Evento",
}


def notificar_agendamento(
    db: Session,
    candidato: "Candidato",
    vaga,          # Vaga | None
    evento,        # Evento
) -> "Notificacao | None":
    """
    Envia e-mail ao candidato quando um evento da Agenda é associado a ele.
    Registra o envio no histórico de notificações.
    """
    if not settings.SMTP_HOST:
        logger.warning("SMTP não configurado — notificação de agendamento ignorada.")
        return None

    tipo_label = TIPOS_EVENTO_LABEL.get(evento.tipo, "Evento")
    data_fmt = evento.inicio.strftime("%d/%m/%Y às %H:%M")
    vaga_titulo = vaga.titulo if vaga else "em aberto"
    local = evento.local or "A confirmar"

    assunto = f"📅 {tipo_label} agendado(a) — {vaga_titulo}"
    corpo = (
        f"Olá, {candidato.nome.split()[0]}!\n\n"
        f"Temos uma novidade para você.\n\n"
        f"{'─' * 40}\n"
        f"  {tipo_label.upper()}\n"
        f"  Vaga:     {vaga_titulo}\n"
        f"  Data:     {data_fmt}\n"
        f"  Local:    {local}\n"
        f"{'─' * 40}\n\n"
    )
    if evento.descricao:
        corpo += f"{evento.descricao}\n\n"
    corpo += (
        f"Por favor, confirme sua presença respondendo este e-mail.\n\n"
        f"Em caso de dúvidas, entre em contato com nossa equipe.\n\n"
        f"Boa sorte!\n"
        f"Equipe de RH — {settings.EMPRESA_NOME}"
    )

    status_envio, erro = "enviado", None
    try:
        _enviar_email(candidato.email, assunto, corpo)
    except Exception as e:
        status_envio, erro = "falhou", str(e)
        logger.error(f"Falha ao notificar agendamento para {candidato.email}: {e}")

    notif = Notificacao(
        candidato_id=candidato.id,
        vaga_id=vaga.id if vaga else None,
        etapa=evento.tipo,
        canal="email",
        destinatario=candidato.email,
        assunto=assunto,
        mensagem=corpo,
        status=status_envio,
        erro=erro,
    )
    db.add(notif)
    return notif


def inicializar_templates(db: Session):
    """Cria templates padrão no banco se ainda não existirem."""
    for t in TEMPLATES_PADRAO:
        existe = db.query(TemplateNotificacao).filter(
            TemplateNotificacao.etapa == t["etapa"]
        ).first()
        if not existe:
            db.add(TemplateNotificacao(**t))
    db.commit()


# ──────────────────────────────────────────────
# Renderização de template
# ──────────────────────────────────────────────

def _renderizar(texto: str, variaveis: dict) -> str:
    """Substitui variáveis $nome, $vaga, etc. no template."""
    try:
        return Template(texto).safe_substitute(variaveis)
    except Exception:
        return texto


def _montar_variaveis(
    candidato: Candidato,
    vaga: Vaga,
    entrevista: Entrevista | None = None,
) -> dict:
    data_fmt = "A confirmar"
    link_fmt = "A confirmar"
    responsavel = vaga.responsavel

    if entrevista:
        data_fmt = entrevista.data_hora.strftime("%d/%m/%Y às %H:%M")
        link_fmt = entrevista.local_ou_link or "A confirmar"
        responsavel = entrevista.responsavel or vaga.responsavel

    return {
        "nome": candidato.nome.split()[0],  # primeiro nome
        "nome_completo": candidato.nome,
        "vaga": vaga.titulo,
        "empresa": settings.EMPRESA_NOME,
        "data_entrevista": data_fmt,
        "link_entrevista": link_fmt,
        "responsavel": responsavel,
        "email_rh": settings.SMTP_USER,
    }


# ──────────────────────────────────────────────
# Envio de e-mail
# ──────────────────────────────────────────────

def _enviar_email(destinatario: str, assunto: str, corpo: str) -> bool:
    """Envia e-mail via SMTP. Retorna True se enviou com sucesso."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP não configurado — e-mail não enviado.")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"] = f"{settings.EMPRESA_NOME} <{settings.SMTP_USER}>"
        msg["To"] = destinatario

        # Versão texto simples
        msg.attach(MIMEText(corpo, "plain", "utf-8"))

        # Versão HTML (converte quebras de linha)
        html = f"<pre style='font-family:Arial,sans-serif;font-size:14px;line-height:1.6'>{corpo}</pre>"
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                # Gmail App Passwords são exibidas com espaços mas devem ser usadas sem
                senha = settings.SMTP_PASSWORD.replace(" ", "")
                server.login(settings.SMTP_USER, senha)
            server.sendmail(settings.SMTP_USER, destinatario, msg.as_string())

        logger.info(f"E-mail enviado para {destinatario} | assunto: {assunto}")
        return True

    except Exception as e:
        logger.error(f"Falha ao enviar e-mail para {destinatario}: {e}")
        raise


# ──────────────────────────────────────────────
# Envio via WhatsApp (n8n webhook)
# ──────────────────────────────────────────────

def _enviar_whatsapp(telefone: str, mensagem: str) -> bool:
    """Dispara webhook do n8n para envio via WhatsApp."""
    if not settings.N8N_WEBHOOK_URL:
        logger.warning("N8N_WEBHOOK_URL não configurado — WhatsApp não enviado.")
        return False
    try:
        resp = httpx.post(
            f"{settings.N8N_WEBHOOK_URL}/whatsapp",
            json={"telefone": telefone, "mensagem": mensagem},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Falha WhatsApp via n8n: {e}")
        raise


def _notificar_n8n_pipeline(
    candidato: "Candidato",
    vaga: "Vaga",
    etapa: str,
    variaveis: dict,
) -> bool:
    """
    Envia evento de mudança de etapa ao n8n via webhook genérico.
    O n8n pode então orquestrar e-mail, WhatsApp, Slack, etc.
    """
    if not settings.N8N_WEBHOOK_URL:
        return False
    try:
        resp = httpx.post(
            f"{settings.N8N_WEBHOOK_URL}/pipeline-evento",
            json={
                "evento": "mudanca_etapa",
                "candidato_id": candidato.id,
                "candidato_nome": candidato.nome,
                "candidato_email": candidato.email,
                "candidato_telefone": candidato.telefone,
                "vaga_id": vaga.id,
                "vaga_titulo": vaga.titulo,
                "etapa": etapa,
                "empresa": settings.EMPRESA_NOME,
                **variaveis,
            },
            timeout=10,
        )
        resp.raise_for_status()
        logger.info(f"Evento pipeline enviado ao n8n: {candidato.email} → {etapa}")
        return True
    except Exception as e:
        logger.warning(f"Falha ao notificar n8n sobre pipeline: {e}")
        return False


# ──────────────────────────────────────────────
# Função principal: disparada pelo pipeline
# ──────────────────────────────────────────────

def notificar_mudanca_etapa(
    db: Session,
    candidato: Candidato,
    vaga: Vaga,
    etapa: str,
    entrevista: Entrevista | None = None,
) -> list[Notificacao]:
    """
    Verifica se há template ativo para a etapa e dispara notificação.
    Retorna lista de Notificacao criadas (uma por canal).
    """
    template = db.query(TemplateNotificacao).filter(
        TemplateNotificacao.etapa == etapa,
        TemplateNotificacao.ativo == True,  # noqa: E712
    ).first()

    if not template:
        logger.info(f"Sem template ativo para etapa '{etapa}' — notificação ignorada.")
        return []

    variaveis = _montar_variaveis(candidato, vaga, entrevista)
    registros = []

    # ── Webhook n8n genérico (orquestração externa) ──
    _notificar_n8n_pipeline(candidato, vaga, etapa, variaveis)

    # ── Canal e-mail ──
    if template.canal_email and candidato.email:
        assunto = _renderizar(template.assunto_email, variaveis)
        corpo = _renderizar(template.corpo_email, variaveis)
        status, erro = "enviado", None
        try:
            _enviar_email(candidato.email, assunto, corpo)
        except Exception as e:
            status, erro = "falhou", str(e)

        notif = Notificacao(
            candidato_id=candidato.id,
            vaga_id=vaga.id,
            etapa=etapa,
            canal="email",
            destinatario=candidato.email,
            assunto=assunto,
            mensagem=corpo,
            status=status,
            erro=erro,
        )
        db.add(notif)
        registros.append(notif)

    # ── Canal WhatsApp ──
    if template.canal_whatsapp and candidato.telefone:
        corpo_wpp = _renderizar(template.corpo_email, variaveis)
        status, erro = "enviado", None
        try:
            _enviar_whatsapp(candidato.telefone, corpo_wpp)
        except Exception as e:
            status, erro = "falhou", str(e)

        notif = Notificacao(
            candidato_id=candidato.id,
            vaga_id=vaga.id,
            etapa=etapa,
            canal="whatsapp",
            destinatario=candidato.telefone,
            mensagem=corpo_wpp,
            status=status,
            erro=erro,
        )
        db.add(notif)
        registros.append(notif)

    db.commit()
    return registros
