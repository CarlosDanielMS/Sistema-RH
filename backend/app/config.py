from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Banco de dados
    DATABASE_URL: str = "postgresql://rh_user:rh_pass@postgres:5432/rh_ia"

    # Groq LLM
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ChromaDB
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "curriculos"

    # Embeddings (local, sem custo)
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"

    # Upload
    UPLOAD_DIR: str = "/app/data/curriculos"
    MAX_CV_SIZE_MB: int = 10

    # Triagem
    SCORE_APROVADO: int = 80
    SCORE_PENDENTE: int = 50

    # ── Marketing / Notificações ──────────────────────────
    EMPRESA_NOME: str = "RH-IA Platform"

    # SMTP (Gmail: smtp.gmail.com:587 | Outlook: smtp.office365.com:587)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True

    # n8n (WhatsApp/Telegram — opcional)
    N8N_WEBHOOK_URL: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
