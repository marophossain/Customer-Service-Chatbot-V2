# Customer Service Chatbot V2

React (Vite + TypeScript) + FastAPI + LangChain RAG + FAISS + OpenAI

- Chat model: `gpt-4o-mini`
- Embeddings: `text-embedding-3-large`
- Storage: `backend/app/storage/{uploads,index}`

This README is optimized for Windows (PowerShell). Adjust commands for macOS/Linux as needed.

## Prerequisites

- Python 3.11+
- Node.js 18+ (with npm)
- OpenAI API key
- Optional (for scanned PDFs): Tesseract OCR
  - Windows installer: https://github.com/tesseract-ocr/tesseract
  - If installed in a non-default location, set `TESSERACT_CMD` or `TESSDATA_PREFIX` in `backend/.env`.

## 1) Backend setup

Folder: `backend/`

1. Configure environment variables

   Create `backend/.env` (already present in this repo). Required keys:

   ```env
   OPENAI_API_KEY=sk-...
   RAG_API_KEY=           # optional, to protect endpoints
   DATA_DIR=storage
   INDEX_DIR=storage/index
   UPLOAD_DIR=storage/uploads
   CORS_ORIGINS=http://localhost:5173
   # Optional OCR
   # TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe
   # TESSDATA_PREFIX=C:\\Program Files\\Tesseract-OCR\\tessdata
   ```

2. Create and activate a virtual environment (you can reuse existing `myenv/`)

   ```powershell
   cd backend
   python -m venv myenv
   .\myenv\Scripts\Activate.ps1
   .\myenv\Scripts\pip.exe install --upgrade pip
   .\myenv\Scripts\pip.exe install -r requirements.txt
   ```

3. Run the API (with auto-reload)

   ```powershell
   cd backend
   .\myenv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

The API will be available at http://127.0.0.1:8000

### Backend endpoints

- GET `/healthz` → `{ ok: true }`
- POST `/ingest` (multipart/form-data)
  - fields: `file` (PDF), `lang` (default `eng`), `collection_id` (default `default`)
  - header (optional): `x-api-key: <RAG_API_KEY>`
  - response: `{ ok, filename, pages, num_chunks, collection_id, steps, total_ms }`
- POST `/chat` (application/json)
  - body: `{ session_id?, message, collection_id?, k? }`
  - header (optional): `x-api-key: <RAG_API_KEY>`
  - response: `{ answer, top_chunks, meta, history }`

Notes:

- Embeddings are initialized lazily and use `OPENAI_API_KEY` from `.env` directly (no need to export in the shell).
- Indices and chunks are stored under `backend/app/storage/index/<collection_id>`.

## 2) Frontend setup

Folder: `frontend/`

```powershell
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:5173. The frontend calls the backend at `http://localhost:8000` by default (`src/lib/api.ts`).

## 3) Typical workflow

1. Start backend (as above)
2. Start frontend
3. In the UI:
   - Upload a PDF (≤ 10 MB)
   - Wait for processing (upload → extract → chunk → embed → index)
   - Ask questions; the assistant answers from your indexed document

## Configuration reference (`backend/app/core/config.py`)

- `OPENAI_API_KEY` (required): OpenAI API key
- `RAG_API_KEY` (optional): If set, backend requires header `x-api-key`
- `DATA_DIR`, `INDEX_DIR`, `UPLOAD_DIR`: Storage folders (defaults point to `backend/app/storage/...`)
- Retrieval knobs: `K_FAISS`, `K_BM25`, `K_MERGED`, `K_PROMPT`, `FUSION_ALPHA`, `CONF_MIN`
- OCR: `TESSERACT_CMD`, `TESSDATA_PREFIX`, `OCR_THRESHOLD`
- CORS: `CORS_ORIGINS` (string or comma-separated list)

## Troubleshooting

- Uvicorn not found in venv
  - Install into the venv: `./myenv/Scripts/pip.exe install uvicorn[standard]`
- OpenAI key errors during startup
  - Ensure `backend/.env` has a valid `OPENAI_API_KEY`
  - The project passes the key directly to OpenAI clients; no shell export required
- CORS blocked in the browser
  - Make sure your frontend origin (e.g., `http://localhost:5173`) is listed in `CORS_ORIGINS`
- FAISS install issues on Windows
  - Use `faiss-cpu` (already in `requirements.txt`); ensure you’re on Python 3.11+
- OCR doesn’t work on scanned PDFs
  - Install Tesseract and configure `TESSERACT_CMD`/`TESSDATA_PREFIX` in `.env`
- “Only PDF files are supported” in UI
  - Ensure the file has `.pdf` extension and `application/pdf` content type; limit is 10 MB

## Project structure

```
backend/
   app/
      core/          # settings
      models/        # pydantic schemas
      routers/       # /healthz, /ingest, /chat
      services/      # rag, pdf, chunker, memory
      storage/       # uploads + indices (runtime)
frontend/
   src/             # React app (Vite + TS)
```

## Security

- Never commit real API keys. Use `.env` locally.
- Set `RAG_API_KEY` to require `x-api-key` on `/ingest` and `/chat`.

---

Made with ❤️ to chat with your documents.
