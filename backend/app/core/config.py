from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    RAG_API_KEY: Optional[str] = None

    DATA_DIR: str = "backend/app/storage"
    INDEX_DIR: str = "backend/app/storage/index"
    UPLOAD_DIR: str = "backend/app/storage/uploads"

    # Retrieval sizes
    K_FAISS: int = 30
    K_BM25: int = 50
    K_MERGED: int = 20
    K_PROMPT: int = 8
    FUSION_ALPHA: float = 0.6
    CONF_MIN: float = 0.20

    OCR_THRESHOLD: int = 50
    TESSDATA_PREFIX: Optional[str] = None
    TESSERACT_CMD: Optional[str] = None

    REDIS_URL: Optional[str] = None

    CORS_ORIGINS: Union[List[AnyHttpUrl], str] = []

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str) and v:
            # Handle comma-separated string
            if ',' in v:
                return [url.strip() for url in v.split(',')]
            # Handle single URL string
            return [v.strip()]
        return v

    class Config:
        env_file = ".env"

settings = Settings()