"""
RH-IA Platform — Backend Principal
Rival da Gupy com triagem inteligente, pipeline kanban e diário de decisões.

Arquitetura:
- FastAPI + SQLAlchemy (PostgreSQL)
- ChromaDB para embeddings de currículos
- Groq (Llama 3.3 70B) como LLM
- LangChain HuggingFace para embeddings locais
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_tables
from app.services.rag_service import warmup
import logging
from app.routes import (
    vagas_router,
    candidatos_router,
    pipeline_router,
    decisoes_router,
    analises_router,
    marketing_router,
    eventos_router,
    notificacoes_router,
    webhooks_router,
    admin_router,
    historico_router,
    auth_router,
    vieses_router,
    openclaw_router,
)
from app.routes.admin import registrar_middleware

logger = logging.getLogger("rh_ia")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    # Inicializa templates padrão de notificação no banco
    from app.database import SessionLocal
    from app.services.notification_service import inicializar_templates
    db = SessionLocal()
    try:
        inicializar_templates(db)
    except Exception as e:
        logger.warning(f"Falha ao inicializar templates: {e}")
    try:
        from app.routes.auth import inicializar_usuarios
        inicializar_usuarios(db)
    except Exception as e:
        logger.warning(f"Falha ao inicializar usuários: {e}")
    finally:
        db.close()
    try:
        warmup()
    except Exception as e:
        logger.warning(f"ChromaDB warmup falhou (cold start na 1ª requisição): {e}")
    logger.info("RH-IA Platform iniciada com sucesso.")
    yield


app = FastAPI(
    title="RH-IA Platform",
    description=(
        "Plataforma de recrutamento e seleção com IA. "
        "Triagem inteligente de candidatos, pipeline kanban e análise de padrões. "
        "A IA apoia a decisão — o recrutador tem a palavra final."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
registrar_middleware(app)

# Registra todos os módulos
app.include_router(vagas_router)
app.include_router(candidatos_router)
app.include_router(pipeline_router)
app.include_router(decisoes_router)
app.include_router(analises_router)
app.include_router(marketing_router)
app.include_router(eventos_router)
app.include_router(notificacoes_router)
app.include_router(webhooks_router)
app.include_router(admin_router)
app.include_router(historico_router)
app.include_router(auth_router)
app.include_router(vieses_router)
app.include_router(openclaw_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "servico": "RH-IA Platform",
        "versao": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
