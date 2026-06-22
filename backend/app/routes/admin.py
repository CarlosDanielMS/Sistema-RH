"""
admin.py — Monitoramento, logs detalhados e status do sistema RH-IA.
"""
import logging
import time
import traceback
import collections
import uuid
from datetime import datetime, timezone
from typing import Deque
from fastapi import APIRouter, Depends, Request
from fastapi.routing import APIRoute
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Admin / Monitoramento"])

# ── Buffer circular ────────────────────────────────────────────────────────────
_log_buffer: Deque[dict] = collections.deque(maxlen=500)

# Contadores de requests em memória
_req_stats = {
    "total": 0,
    "erros_4xx": 0,
    "erros_5xx": 0,
    "tempo_total_ms": 0.0,
}

# ── Suprimir log de telemetria do ChromaDB (bug de versão, não afeta funcionamento) ──
logging.getLogger("chromadb.telemetry.product.posthog").setLevel(logging.CRITICAL)
logging.getLogger("chromadb.telemetry").setLevel(logging.CRITICAL)


# ── Handler customizado ────────────────────────────────────────────────────────
class RichBufferHandler(logging.Handler):
    """Injeta registros ricos no buffer com contexto completo."""

    def emit(self, record: logging.LogRecord):
        # Traceback completo se houver exceção
        exc_text = None
        if record.exc_info:
            exc_text = "".join(traceback.format_exception(*record.exc_info))

        _log_buffer.append({
            "id":       str(uuid.uuid4())[:8],
            "ts":       datetime.now(timezone.utc).isoformat(),
            "level":    record.levelname,
            "logger":   record.name,
            "modulo":   f"{record.pathname.split('/')[-1]}:{record.lineno}",
            "message":  record.getMessage(),
            "exc":      exc_text,
        })


def _instalar_handlers():
    """Instala handlers no root logger e nos loggers relevantes."""
    fmt = logging.Formatter("%(message)s")

    # WARNING+ em tudo (captura erros do FastAPI, SQLAlchemy, etc.)
    root_h = RichBufferHandler()
    root_h.setFormatter(fmt)
    root_h.setLevel(logging.WARNING)
    logging.getLogger().addHandler(root_h)

    # INFO+ nos loggers da aplicação
    for nome in ("rh_ia", "app", "uvicorn.error"):
        h = RichBufferHandler()
        h.setFormatter(fmt)
        h.setLevel(logging.INFO)
        lg = logging.getLogger(nome)
        lg.setLevel(logging.INFO)
        lg.addHandler(h)
        lg.propagate = False


_instalar_handlers()
logger = logging.getLogger("rh_ia")


# ── Middleware de requisições ──────────────────────────────────────────────────
class RequestLogMiddleware(BaseHTTPMiddleware):
    """Loga cada requisição HTTP com método, path, status e tempo."""

    SKIP_PATHS = {"/health", "/", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        inicio = time.perf_counter()
        req_id = str(uuid.uuid4())[:8]
        status_code = 500

        try:
            response: Response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as exc:
            logger.error(
                f"[{req_id}] EXCEPTION {request.method} {request.url.path}",
                exc_info=exc,
            )
            raise
        finally:
            duracao_ms = round((time.perf_counter() - inicio) * 1000)
            _req_stats["total"] += 1
            _req_stats["tempo_total_ms"] += duracao_ms

            if 400 <= status_code < 500:
                _req_stats["erros_4xx"] += 1
            elif status_code >= 500:
                _req_stats["erros_5xx"] += 1

            nivel = logging.WARNING if status_code >= 400 else logging.INFO
            logger.log(
                nivel,
                f"[{req_id}] {request.method} {request.url.path} "
                f"→ {status_code} ({duracao_ms}ms)",
            )


def registrar_middleware(app):
    """Chame isso em main.py após criar o app FastAPI."""
    app.add_middleware(RequestLogMiddleware)


# ── Helpers de health check ────────────────────────────────────────────────────
def _check_postgres(db: Session) -> dict:
    t = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "latencia_ms": round((time.perf_counter() - t) * 1000)}
    except Exception as e:
        return {"status": "erro", "detalhe": str(e), "latencia_ms": None}


def _check_chromadb() -> dict:
    import httpx
    t = time.perf_counter()
    try:
        r = httpx.get(
            f"http://{settings.CHROMA_HOST}:{settings.CHROMA_PORT}/api/v2/heartbeat",
            timeout=3,
        )
        r.raise_for_status()
        return {"status": "ok", "latencia_ms": round((time.perf_counter() - t) * 1000)}
    except Exception as e:
        return {"status": "erro", "detalhe": str(e), "latencia_ms": None}


def _check_groq() -> dict:
    import httpx
    t = time.perf_counter()
    try:
        r = httpx.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            timeout=5,
        )
        return {
            "status": "ok" if r.status_code == 200 else "erro",
            "http_status": r.status_code,
            "latencia_ms": round((time.perf_counter() - t) * 1000),
            "detalhe": None if r.status_code == 200 else r.text[:200],
        }
    except Exception as e:
        return {"status": "erro", "detalhe": str(e), "latencia_ms": None}


def _metricas_db(db: Session) -> dict:
    try:
        from app.models.candidato import Candidato
        from app.models.vaga import Vaga
        total = db.query(Candidato).count()
        com_cv = db.query(Candidato).filter(Candidato.cv_filename.isnot(None)).count()
        analisados = db.query(Candidato).filter(Candidato.score_aderencia.isnot(None)).count()
        vagas = db.query(Vaga).count()
        return {
            "candidatos_total":     total,
            "candidatos_com_cv":    com_cv,
            "candidatos_sem_cv":    total - com_cv,
            "candidatos_analisados": analisados,
            "vagas_total":          vagas,
        }
    except Exception as e:
        return {"erro": str(e)}


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.get("/status")
def status_sistema(db: Session = Depends(get_db)):
    """Retorna status detalhado de todos os serviços, métricas e estatísticas HTTP."""
    postgres = _check_postgres(db)
    chromadb = _check_chromadb()
    groq     = _check_groq()
    metricas = _metricas_db(db)

    todos_ok = all(s["status"] == "ok" for s in [postgres, chromadb, groq])

    media_ms = (
        round(_req_stats["tempo_total_ms"] / _req_stats["total"])
        if _req_stats["total"] > 0 else 0
    )

    return {
        "sistema":   "ok" if todos_ok else "degradado",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "servicos": {
            "postgres":  postgres,
            "chromadb":  chromadb,
            "groq_api":  groq,
        },
        "metricas": metricas,
        "requests": {
            "total":         _req_stats["total"],
            "erros_4xx":     _req_stats["erros_4xx"],
            "erros_5xx":     _req_stats["erros_5xx"],
            "latencia_media_ms": media_ms,
        },
        "config": {
            "chroma_host":  settings.CHROMA_HOST,
            "chroma_port":  settings.CHROMA_PORT,
            "groq_model":   settings.GROQ_MODEL,
            "upload_dir":   settings.UPLOAD_DIR,
        },
    }


@router.get("/logs")
def listar_logs(nivel: str = "ALL", limit: int = 100, busca: str = ""):
    """
    Retorna os últimos registros do buffer.
    - nivel: ALL | INFO | WARNING | ERROR | CRITICAL
    - limit: máximo de entradas (padrão 100, max 500)
    - busca: filtra por texto na mensagem ou logger
    """
    logs = list(_log_buffer)

    if nivel != "ALL":
        logs = [l for l in logs if l["level"] == nivel]

    if busca:
        b = busca.lower()
        logs = [l for l in logs if b in l["message"].lower() or b in l["logger"].lower()]

    logs = list(reversed(logs))[:min(limit, 500)]

    contagem = {
        "INFO":     sum(1 for l in _log_buffer if l["level"] == "INFO"),
        "WARNING":  sum(1 for l in _log_buffer if l["level"] == "WARNING"),
        "ERROR":    sum(1 for l in _log_buffer if l["level"] == "ERROR"),
        "CRITICAL": sum(1 for l in _log_buffer if l["level"] == "CRITICAL"),
    }

    return {
        "total_filtrado": len(logs),
        "total_buffer":   len(_log_buffer),
        "nivel_filtro":   nivel,
        "contagem":       contagem,
        "logs":           logs,
    }


@router.delete("/logs")
def limpar_logs():
    _log_buffer.clear()
    for k in ("total", "erros_4xx", "erros_5xx"):
        _req_stats[k] = 0
    _req_stats["tempo_total_ms"] = 0.0
    return {"mensagem": "Buffer de logs e contadores limpos."}
