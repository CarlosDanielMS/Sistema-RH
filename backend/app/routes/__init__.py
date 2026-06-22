from app.routes.vagas import router as vagas_router
from app.routes.candidatos import router as candidatos_router
from app.routes.pipeline import router as pipeline_router
from app.routes.decisoes import router as decisoes_router
from app.routes.analises import router as analises_router
from app.routes.marketing import router as marketing_router
from app.routes.eventos import router as eventos_router
from app.routes.notificacoes import router as notificacoes_router
from app.routes.webhooks import router as webhooks_router
from app.routes.admin import router as admin_router
from app.routes.historico import router as historico_router
from app.routes.auth import router as auth_router
from app.routes.vieses import router as vieses_router
from app.routes.openclaw import router as openclaw_router

__all__ = [
    "vagas_router",
    "candidatos_router",
    "pipeline_router",
    "decisoes_router",
    "analises_router",
    "marketing_router",
    "eventos_router",
    "notificacoes_router",
    "webhooks_router",
    "admin_router",
    "historico_router",
    "auth_router",
    "vieses_router",
    "openclaw_router",
]
