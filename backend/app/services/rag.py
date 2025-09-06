import os, pickle, time
from typing import Dict, List, Tuple
import numpy as np
import faiss
from langchain_openai import OpenAIEmbeddings
from app.core.config import settings
from app.services.chunker import build_chunks
from app.services.pdf import extract_text_with_ocr_fallback

index_map: Dict[str, faiss.IndexFlatIP] = {}
chunks_map: Dict[str, List[str]] = {}
pdf_path_map: Dict[str, str] = {}
pdf_name_map: Dict[str, str] = {}
active_collection: str = "default"

# Lazily initialize embeddings with OpenAI model
_emb_client: OpenAIEmbeddings | None = None

def get_embeddings() -> OpenAIEmbeddings:
    global _emb_client
    if _emb_client is None:
        # Initialize OpenAI embeddings
        _emb_client = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            openai_api_key=settings.OPENAI_API_KEY
        )
    return _emb_client

def _normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=1, keepdims=True) + 1e-12
    return v / n

def embed_texts(texts: List[str]) -> np.ndarray:
    if not texts: return np.array([])
    vecs = get_embeddings().embed_documents(texts)
    return _normalize(np.array(vecs, dtype="float32"))

def cached_query_emb(query: str) -> np.ndarray:
    vec = get_embeddings().embed_query(query)
    return _normalize(np.array([vec], dtype="float32"))

def build_faiss_and_store(chunks: List[str], index_dir: str) -> Tuple[faiss.IndexFlatIP, List[str]]:
    if not chunks: raise RuntimeError("No chunks to index")
    BATCH = 128
    all_vecs: List[np.ndarray] = []
    for i in range(0, len(chunks), BATCH):
        batch = chunks[i:i+BATCH]
        v = embed_texts(batch)
        if v.size == 0: raise RuntimeError("Embedding failed")
        all_vecs.append(v)
    embs = np.vstack(all_vecs).astype("float32")
    idx = faiss.IndexFlatIP(embs.shape[1])
    idx.add(embs)
    os.makedirs(index_dir, exist_ok=True)
    faiss.write_index(idx, os.path.join(index_dir, "faiss_index.idx"))
    with open(os.path.join(index_dir, "valid_chunks.pkl"), "wb") as f:
        pickle.dump(chunks, f)
    return idx, chunks

def load_collection(collection_id: str) -> bool:
    try:
        index_dir = os.path.join(settings.INDEX_DIR, collection_id)
        idx = faiss.read_index(os.path.join(index_dir, "faiss_index.idx"))
        with open(os.path.join(index_dir, "valid_chunks.pkl"), "rb") as f:
            ch = pickle.load(f)
        index_map[collection_id] = idx
        chunks_map[collection_id] = ch
        return True
    except Exception:
        return False

def ingest_pdf(file_bytes: bytes, filename: str, lang: str, collection_id: str):
    t0 = time.time()
    steps = []
    dest_dir = settings.UPLOAD_DIR
    os.makedirs(dest_dir, exist_ok=True)
    path = os.path.join(dest_dir, f"{collection_id}.pdf")
    with open(path, "wb") as f:
        f.write(file_bytes)
    pdf_path_map[collection_id] = os.path.abspath(path)
    pdf_name_map[collection_id] = filename
    steps.append({"step": "received_file", "ms": round((time.time()-t0)*1000,2)})

    t1 = time.time()
    text, total_pages = extract_text_with_ocr_fallback(file_bytes, lang)
    steps.append({"step": "extracted", "pages": total_pages, "ms": round((time.time()-t1)*1000,2)})

    t2 = time.time()
    chunks = build_chunks(text)
    steps.append({"step": "chunked", "chunks": len(chunks), "ms": round((time.time()-t2)*1000,2)})

    t3 = time.time()
    index_dir = os.path.join(settings.INDEX_DIR, collection_id)
    new_index, new_chunks = build_faiss_and_store(chunks, index_dir)
    steps.append({"step": "embedded_indexed", "chunks": len(new_chunks), "ms": round((time.time()-t3)*1000,2)})

    index_map[collection_id] = new_index
    chunks_map[collection_id] = new_chunks

    global active_collection
    active_collection = collection_id

    total_ms = round((time.time()-t0)*1000,2)
    return {
        "ok": True,
        "filename": filename,
        "pages": total_pages,
        "num_chunks": len(new_chunks),
        "collection_id": collection_id,
        "steps": steps,
        "total_ms": total_ms,
    }

def search_similar_chunks(query: str, k: int, collection_id: str):
    idx = index_map.get(collection_id)
    chunks = chunks_map.get(collection_id, [])
    if idx is None or not chunks: return [], []
    qv = cached_query_emb(query)
    if qv.size == 0: return [], []
    D, I = idx.search(qv.astype("float32"), k)
    ids = [i for i in I[0] if 0 <= i < len(chunks)]
    hits = [chunks[i] for i in ids]
    sims = [float(D[0][j]) for j in range(len(ids))]
    return hits, sims