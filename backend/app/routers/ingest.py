from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException
from app.core.config import settings
from app.services.rag import ingest_pdf
import traceback

router = APIRouter()

def _require_api_key(x_api_key: str | None):
    if settings.RAG_API_KEY and x_api_key != settings.RAG_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

@router.post("/ingest")
async def ingest(
    file: UploadFile = File(None),
    lang: str = Form("eng"),
    collection_id: str = Form("default"),
    x_api_key: str | None = Header(default=None),
):
    try:
        _require_api_key(x_api_key)
        if file is None:
            return {"ok": False, "error": "No file uploaded"}
        
        file_bytes = await file.read()
        
        payload = ingest_pdf(file_bytes, file.filename, lang, collection_id)
        return payload
    except Exception as e:
        return {"ok": False, "error": str(e), "traceback": traceback.format_exc()}