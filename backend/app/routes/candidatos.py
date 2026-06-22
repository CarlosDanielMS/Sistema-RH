import os
import uuid
import logging
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from app.models.historico import TipoHistorico
from app.routes.historico import registrar as historico_registrar

logger = logging.getLogger("rh_ia")
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.candidato import Candidato
from app.models.vaga import Vaga
from app.schemas.candidato import CandidatoCreate, CandidatoUpdate, CandidatoOut, AnaliseIA
from app.services.cv_parser import extrair_texto, sanitizar_para_triagem
from app.services.rag_service import indexar_curriculo, remover_curriculo
from app.services.candidato_analyzer import analisar_candidato

router = APIRouter(prefix="/candidatos", tags=["Candidatos"])

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/", response_model=CandidatoOut, status_code=status.HTTP_201_CREATED)
def cadastrar_candidato(payload: CandidatoCreate, db: Session = Depends(get_db)):
    candidato = Candidato(**payload.model_dump())
    db.add(candidato)
    db.commit()
    db.refresh(candidato)
    return candidato


@router.post("/upload-cv/{candidato_id}")
async def upload_cv(
    candidato_id: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Recebe PDF do currículo, extrai texto e indexa no ChromaDB.
    Fluxo completo: upload → parse → embeddings → ChromaDB.
    """
    candidato = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")

    conteudo = await arquivo.read()

    # Aceita por content-type OU extensão (compatibilidade com diferentes browsers/OS)
    content_type_ok = arquivo.content_type in ("application/pdf", "application/octet-stream")
    filename_ok = (arquivo.filename or "").lower().endswith(".pdf")
    if not content_type_ok and not filename_ok:
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")

    if len(conteudo) > settings.MAX_CV_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo excede {settings.MAX_CV_SIZE_MB}MB",
        )

    # Remove arquivo antigo do disco se existir
    if candidato.cv_filename:
        arquivo_antigo = UPLOAD_DIR / candidato.cv_filename
        if arquivo_antigo.exists():
            arquivo_antigo.unlink()

    # Salva o novo arquivo
    nome_arquivo = f"{candidato_id}_{uuid.uuid4().hex[:8]}.pdf"
    caminho = UPLOAD_DIR / nome_arquivo
    caminho.write_bytes(conteudo)

    # Extrai texto
    texto = extrair_texto(caminho)
    if not texto.strip():
        raise HTTPException(status_code=422, detail="Não foi possível extrair texto do PDF")

    # Indexa no ChromaDB (com texto sanitizado para embeddings)
    texto_sanitizado = sanitizar_para_triagem(texto)
    doc_id = indexar_curriculo(
        candidato_id=candidato_id,
        texto=texto_sanitizado,
        metadados={
            "nome": candidato.nome,
            "vaga_id": candidato.vaga_id or 0,
        },
    )

    # Persiste no banco
    candidato.cv_filename = nome_arquivo
    candidato.cv_texto = texto
    candidato.chroma_doc_id = doc_id
    db.commit()

    historico_registrar(
        db, candidato_id, TipoHistorico.cv_upload,
        titulo=f"Currículo enviado: {arquivo.filename}",
        texto=f"{len(texto)} caracteres extraídos | doc_id: {doc_id}",
        criado_por="Sistema",
    )
    db.commit()

    logger.info(
        f"CV indexado — candidato_id={candidato_id} arquivo={nome_arquivo} "
        f"chars={len(texto)} doc_id={doc_id}"
    )

    return {
        "mensagem": "Currículo indexado com sucesso",
        "candidato_id": candidato_id,
        "doc_id": doc_id,
        "caracteres_extraidos": len(texto),
    }


@router.get("/", response_model=List[CandidatoOut])
def listar_candidatos(
    vaga_id: int | None = None,
    etapa: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Candidato)
    if vaga_id:
        q = q.filter(Candidato.vaga_id == vaga_id)
    if etapa:
        q = q.filter(Candidato.etapa_pipeline == etapa)
    return q.order_by(Candidato.criado_em.desc()).offset(skip).limit(limit).all()


@router.get("/{candidato_id}", response_model=CandidatoOut)
def obter_candidato(candidato_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    return c


@router.get("/vaga/{vaga_id}", response_model=List[CandidatoOut])
def candidatos_da_vaga(vaga_id: int, db: Session = Depends(get_db)):
    vaga = db.query(Vaga).filter(Vaga.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    return db.query(Candidato).filter(Candidato.vaga_id == vaga_id).all()


@router.post("/{candidato_id}/analisar")
def analisar_candidato_endpoint(candidato_id: int, db: Session = Depends(get_db)):
    """
    Dispara triagem inteligente do candidato contra a vaga associada.
    Retorna score, classificação e justificativa da IA.
    A IA APOIA a decisão — o recrutador tem a palavra final.
    """
    candidato = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")

    if not candidato.cv_texto:
        raise HTTPException(
            status_code=422,
            detail="Candidato não possui currículo. Faça upload via POST /candidatos/upload-cv/{id}",
        )

    if not candidato.vaga_id:
        raise HTTPException(
            status_code=422, detail="Candidato não está associado a nenhuma vaga"
        )

    vaga = db.query(Vaga).filter(Vaga.id == candidato.vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga associada não encontrada")

    analise, latencia = analisar_candidato(
        candidato_id=candidato_id,
        cv_texto=candidato.cv_texto,
        titulo_vaga=vaga.titulo,
        descricao_vaga=vaga.descricao,
        requisitos_obrigatorios=vaga.requisitos_obrigatorios,
        requisitos_desejáveis=vaga.requisitos_desejáveis or "",
    )

    # Persiste resultado no banco
    from app.models.candidato import StatusTriagem
    mapa_status = {
        "aprovado": StatusTriagem.aprovado,
        "pendente": StatusTriagem.analise_humana,
        "reprovado": StatusTriagem.reprovado,
    }
    candidato.score_aderencia = analise.score
    candidato.status_triagem = mapa_status.get(analise.classificacao, StatusTriagem.pendente)
    candidato.justificativa_ia = analise.justificativa
    if candidato.etapa_pipeline == "pendente":
        candidato.etapa_pipeline = "triado"
    db.commit()

    historico_registrar(
        db, candidato_id, TipoHistorico.analise_ia,
        titulo=f"Análise IA: score {analise.score} — {analise.classificacao}",
        texto=analise.justificativa,
        criado_por="IA (Groq)",
    )
    db.commit()

    logger.info(
        f"Análise IA concluída — candidato_id={candidato_id} vaga_id={candidato.vaga_id} "
        f"score={analise.score} classificacao={analise.classificacao} latencia={latencia}s"
    )

    return {
        "candidato_id": candidato_id,
        "vaga_id": candidato.vaga_id,
        "analise": analise.model_dump(),
        "latencia_s": latencia,
        "aviso": "Esta análise é um apoio à decisão. O recrutador deve validar o resultado.",
    }


@router.get("/{candidato_id}/cv")
def baixar_cv(candidato_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    if not c.cv_filename:
        raise HTTPException(status_code=404, detail="Candidato não possui currículo")
    caminho = UPLOAD_DIR / c.cv_filename
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor")
    return FileResponse(
        path=str(caminho),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"},
    )


@router.delete("/{candidato_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_candidato(candidato_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    if c.chroma_doc_id:
        try:
            remover_curriculo(c.id)
        except Exception:
            pass
    db.delete(c)
    db.commit()


@router.post("/analisar-lote")
def analisar_lote(db: Session = Depends(get_db)):
    """Analisa todos os candidatos com CV e vaga que ainda não foram analisados."""
    from app.models.vaga import Vaga as VagaModel
    pendentes = db.query(Candidato).filter(
        Candidato.cv_texto.isnot(None),
        Candidato.vaga_id.isnot(None),
        Candidato.score_aderencia.is_(None),
    ).all()

    resultados = []
    from app.models.candidato import StatusTriagem
    mapa_status = {"aprovado": StatusTriagem.aprovado, "pendente": StatusTriagem.analise_humana, "reprovado": StatusTriagem.reprovado}

    for candidato in pendentes:
        try:
            vaga = db.query(VagaModel).filter(VagaModel.id == candidato.vaga_id).first()
            if not vaga:
                continue
            analise, latencia = analisar_candidato(
                candidato_id=candidato.id,
                cv_texto=candidato.cv_texto,
                titulo_vaga=vaga.titulo,
                descricao_vaga=vaga.descricao,
                requisitos_obrigatorios=vaga.requisitos_obrigatorios,
                requisitos_desejáveis=vaga.requisitos_desejáveis or "",
            )
            candidato.score_aderencia = analise.score
            candidato.status_triagem = mapa_status.get(analise.classificacao, StatusTriagem.pendente)
            candidato.justificativa_ia = analise.justificativa
            historico_registrar(db, candidato.id, TipoHistorico.analise_ia,
                titulo=f"Análise em lote: score {analise.score} — {analise.classificacao}",
                texto=analise.justificativa, criado_por="IA (Groq)")
            db.commit()
            resultados.append({"candidato_id": candidato.id, "nome": candidato.nome, "score": analise.score, "status": "ok"})
        except Exception as e:
            resultados.append({"candidato_id": candidato.id, "nome": candidato.nome, "status": "erro", "detalhe": str(e)})

    return {"total_analisados": len([r for r in resultados if r["status"] == "ok"]),
            "total_erros": len([r for r in resultados if r["status"] == "erro"]),
            "resultados": resultados}


@router.put("/{candidato_id}", response_model=CandidatoOut)
def atualizar_candidato(
    candidato_id: int, payload: CandidatoUpdate, db: Session = Depends(get_db)
):
    c = db.query(Candidato).filter(Candidato.id == candidato_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(c, campo, valor)
    db.commit()
    db.refresh(c)
    return c
