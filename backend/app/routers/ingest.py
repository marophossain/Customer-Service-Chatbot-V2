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
    print("=== INGEST ENDPOINT CALLED ===")
    print(f"Received request with file: {file}")
    print(f"Language: {lang}, Collection ID: {collection_id}")
    
    try:
        _require_api_key(x_api_key)
        if file is None:
            print("ERROR: No file uploaded")
            return {"ok": False, "error": "No file uploaded"}
        
        print(f"Processing file: {file.filename}, content_type: {file.content_type}")
        file_bytes = await file.read()
        print(f"File size: {len(file_bytes)} bytes")
        
        print("Starting PDF ingestion process...")
        payload = ingest_pdf(file_bytes, file.filename, lang, collection_id)
        print("PDF ingestion completed successfully")
        return payload
    except Exception as e:
        print(f"Error in ingest endpoint: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return {"ok": False, "error": str(e), "traceback": traceback.format_exc()}