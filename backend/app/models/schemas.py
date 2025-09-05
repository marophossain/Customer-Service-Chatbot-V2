from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    collection_id: Optional[str] = None
    k: int = 5

class ChatResponse(BaseModel):
    answer: str
    top_chunks: List[str] = []
    meta: Dict[str, Any] = {}
    history: List[Dict[str, str]] = []

class IngestResponse(BaseModel):
    ok: bool
    filename: Optional[str] = None
    pages: Optional[int] = None
    num_chunks: Optional[int] = None
    collection_id: Optional[str] = None
    steps: Optional[list] = None
    total_ms: Optional[float] = None

class StatusResponse(BaseModel):
    ok: bool
    has_index: bool
    collections: Dict[str, Dict[str, Any]]
    active: str