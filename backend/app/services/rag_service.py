"""
rag_service.py
Gerencia embeddings e busca semântica no ChromaDB.
Evolução direta do agente RAG da Aula 13, agora focado em currículos.
"""
import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from app.config import settings

_client = None
_collection = None
_embeddings = None


def _get_client() -> chromadb.HttpClient:
    global _client
    if _client is None:
        # chromadb 1.x: Settings removido do HttpClient — telemetria controlada por env var
        _client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
            ssl=False,
        )
    return _client


def _get_collection():
    global _collection
    if _collection is None:
        # chromadb 1.x: get_or_create_collection sem metadata de configuração HNSW inline
        _collection = _get_client().get_or_create_collection(
            name=settings.CHROMA_COLLECTION,
        )
    return _collection


def _get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
    return _embeddings


def indexar_curriculo(candidato_id: int, texto: str, metadados: dict) -> str:
    """
    Gera embedding do currículo e armazena no ChromaDB.
    Retorna o doc_id gerado.
    """
    col = _get_collection()
    emb = _get_embeddings()

    doc_id = f"candidato_{candidato_id}"
    vetor = emb.embed_documents([texto])[0]

    col.upsert(
        ids=[doc_id],
        embeddings=[vetor],
        documents=[texto],
        metadatas=[{**metadados, "candidato_id": candidato_id}],
    )
    return doc_id


def buscar_curriculos_similares(query: str, vaga_id: int, top_k: int = 5) -> list[dict]:
    """
    Busca candidatos cujos currículos são mais aderentes à query (descrição da vaga).
    Retorna lista de dicts com candidato_id, texto e score de distância.
    """
    col = _get_collection()
    emb = _get_embeddings()

    if col.count() == 0:
        return []

    vetor = emb.embed_query(query)
    resultados = col.query(
        query_embeddings=[vetor],
        n_results=min(top_k, col.count()),
        where={"vaga_id": vaga_id} if vaga_id else None,
        include=["documents", "metadatas", "distances"],
    )

    saida = []
    for doc, meta, dist in zip(
        resultados["documents"][0],
        resultados["metadatas"][0],
        resultados["distances"][0],
    ):
        saida.append(
            {
                "candidato_id": meta.get("candidato_id"),
                "texto_relevante": doc[:500],  # trecho para contexto
                "similaridade": round(1 - dist, 3),  # cosine → 1=idêntico
            }
        )
    return saida


def recuperar_contexto_candidato(candidato_id: int, query: str) -> str:
    """
    Recupera os trechos mais relevantes do currículo de um candidato específico
    para uma query (os requisitos da vaga).
    Usado pelo candidato_analyzer para montar o contexto do prompt.
    """
    col = _get_collection()
    emb = _get_embeddings()

    doc_id = f"candidato_{candidato_id}"
    vetor = emb.embed_query(query)

    resultados = col.query(
        query_embeddings=[vetor],
        n_results=1,
        where={"candidato_id": candidato_id},
        include=["documents"],
    )

    docs = resultados.get("documents", [[]])
    return docs[0][0] if docs and docs[0] else ""


def remover_curriculo(candidato_id: int) -> None:
    """Remove o embedding de um candidato do ChromaDB."""
    col = _get_collection()
    col.delete(ids=[f"candidato_{candidato_id}"])


def warmup():
    """Pré-carrega modelos para evitar cold start na primeira requisição."""
    _get_collection()
    _get_embeddings()
