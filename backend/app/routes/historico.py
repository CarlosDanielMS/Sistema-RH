"""
historico.py — Histórico completo de atividades por candidato.
Registra: observações manuais, uploads de arquivos extras, movimentos de pipeline, análises IA.
"""
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.config import settings
from app.models.candidato import Candidato
from app.models.historico import CandidatoHistorico, TipoHistorico

router = APIRouter(prefix="/candidatos", tags=["Histórico"])

ANEXOS_DIR = Path(settings.UPLOAD_DIR).parent / "anexos"
ANEXOS_DIR.mkdir(parents=True, exist_ok=True)


# ── Pydantic ──────────────────────────────────────────────────────────────────
class ObservacaoIn(BaseModel):
    texto: str
    criado_por: str = "Recrutador"


class HistoricoOut(BaseModel):
    id: int
    candidato_id: int
    tipo: str
    titulo: str
    texto: str | None
    arquivo_nome: str | None
    criado_por: str | None
    criado_em: datetime

    model_config = {"from_attributes": True}


# ── Helper reutilizável (importado por outros routers) ────────────────────────
def registrar(
    db: Session,
    candidato_id: int,
    tipo: TipoHistorico,
    titulo: str,
    texto: str | None = None,
    arquivo_nome: str | None = None,
    arquivo_path: str | None = None,
    criado_por: str = "Sistema",
):
    entrada = CandidatoHistorico(
        candidato_id=candidato_id,
        tipo=tipo,
        titulo=titulo,
        texto=texto,
        arquivo_nome=arquivo_nome,
        arquivo_path=arquivo_path,
        criado_por=criado_por,
    )
    db.add(entrada)
    # Não faz commit aqui — deixa para o chamador confirmar na mesma transação


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/{candidato_id}/historico", response_model=List[HistoricoOut])
def listar_historico(candidato_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    return (
        db.query(CandidatoHistorico)
        .filter(CandidatoHistorico.candidato_id == candidato_id)
        .order_by(CandidatoHistorico.criado_em.desc())
        .all()
    )


@router.post("/{candidato_id}/historico/observacao", response_model=HistoricoOut, status_code=201)
def adicionar_observacao(candidato_id: int, payload: ObservacaoIn, db: Session = Depends(get_db)):
    c = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    entrada = CandidatoHistorico(
        candidato_id=candidato_id,
        tipo=TipoHistorico.observacao,
        titulo="Observação registrada",
        texto=payload.texto,
        criado_por=payload.criado_por,
    )
    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    return entrada


@router.post("/{candidato_id}/historico/arquivo", response_model=HistoricoOut, status_code=201)
async def upload_anexo(
    candidato_id: int,
    criado_por: str = "Recrutador",
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    c = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")

    conteudo = await arquivo.read()
    if len(conteudo) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo excede 20 MB")

    ext = Path(arquivo.filename or "arquivo").suffix or ""
    nome_salvo = f"{candidato_id}_{uuid.uuid4().hex[:8]}{ext}"
    caminho = ANEXOS_DIR / nome_salvo
    caminho.write_bytes(conteudo)

    entrada = CandidatoHistorico(
        candidato_id=candidato_id,
        tipo=TipoHistorico.arquivo,
        titulo=f"Arquivo anexado: {arquivo.filename}",
        arquivo_nome=arquivo.filename,
        arquivo_path=str(caminho),
        criado_por=criado_por,
    )
    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    return entrada


@router.get("/{candidato_id}/historico/{hist_id}/arquivo")
def baixar_anexo(candidato_id: int, hist_id: int, db: Session = Depends(get_db)):
    h = db.query(CandidatoHistorico).filter(
        CandidatoHistorico.id == hist_id,
        CandidatoHistorico.candidato_id == candidato_id,
    ).first()
    if not h or not h.arquivo_path:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    caminho = Path(h.arquivo_path)
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Arquivo removido do servidor")
    return FileResponse(
        path=str(caminho),
        filename=h.arquivo_nome or caminho.name,
        media_type="application/octet-stream",
    )
