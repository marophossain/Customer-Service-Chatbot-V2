# 🤖 Customer Service Chatbot V2

A modern AI-powered document assistant that allows you to chat with your PDF documents instantly. Built with React, FastAPI, LangChain, and OpenAI's latest models.

## ✨ Features

- 📄 **PDF Document Processing**: Upload and analyze PDF documents up to 10MB
- 🧠 **AI-Powered Q&A**: Ask questions and get intelligent answers from your documents
- 🔍 **Semantic Search**: Advanced vector search using OpenAI embeddings
- 💬 **Real-time Chat**: Interactive chat interface with message history
- 🎨 **Modern UI**: Dark theme with responsive design and smooth animations
- 🔒 **Secure**: API key protection and secure document handling
- ⚡ **Fast**: Optimized chunking and indexing for quick responses

## 🛠️ Tech Stack

**Frontend:**

- React 18 with TypeScript
- Vite for fast development
- CSS Modules for styling
- Responsive design with modern UI components

**Backend:**

- FastAPI for high-performance API
- LangChain for document processing
- FAISS for vector similarity search
- OpenAI GPT-4o Mini for chat responses
- OpenAI text-embedding-3-small for embeddings

**Models:**

- Chat model: `gpt-4o-mini`
- Embeddings: `text-embedding-3-small`
- Storage: Vector indices with FAISS

## 📋 Prerequisites

- **Python 3.11+** - For backend development
- **Node.js 18+** - With npm for frontend development
- **OpenAI API Key** - Required for AI functionality
- **Tesseract OCR** (Optional) - For scanned PDF processing
  - Windows: Download from [GitHub releases](https://github.com/tesseract-ocr/tesseract)
  - Set `TESSERACT_CMD` in `.env` if installed in non-default location

## 🚀 Quick Start

### 1️⃣ Clone and Setup

```powershell
git clone https://github.com/marophossain/Customer-Service-Chatbot-V2.git
cd Customer-Service-Chatbot-V2
```

### 2️⃣ Backend Setup

1. **Configure Environment Variables**

   Create `backend/.env` with your OpenAI API key:

   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   RAG_API_KEY=                    # Optional API protection
   LLM_MODEL=gpt-4o-mini
   EMBEDDING_MODEL=text-embedding-3-small
   DATA_DIR=storage
   INDEX_DIR=storage/index
   UPLOAD_DIR=storage/uploads
   CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176

   # Optional OCR settings
   # TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe
   # TESSDATA_PREFIX=C:\\Program Files\\Tesseract-OCR\\tessdata
   ```

2. **Create Virtual Environment**

   ```powershell
   cd backend
   python -m venv myenv
   .\myenv\Scripts\Activate.ps1
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Start Backend Server**

   ```powershell
   # Make sure you're in the backend directory with activated virtual environment
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   ✅ Backend will be available at: http://127.0.0.1:8000

### 3️⃣ Frontend Setup

1. **Install Dependencies**

   ```powershell
   cd frontend
   npm install
   ```

2. **Start Development Server**

   ```powershell
   npm run dev
   ```

   ✅ Frontend will be available at: http://localhost:5173 (or http://localhost:5174)

## 💻 How to Use

1. **Start Both Servers**

   - Backend: http://127.0.0.1:8000
   - Frontend: http://localhost:5173

2. **Upload a Document**

   - Click "Choose File" or drag & drop a PDF (≤ 10MB)
   - Wait for processing (extraction → chunking → embedding → indexing)

3. **Start Chatting**
   - Ask questions about your document
   - Get AI-powered answers with context from your PDF
   - Use suggested prompts or ask anything specific

## 🔧 API Reference

### Backend Endpoints

#### Health Check

```http
GET /healthz
Response: { "ok": true }
```

#### Document Ingestion

```http
POST /ingest
Content-Type: multipart/form-data
Headers: x-api-key (optional)

Fields:
- file: PDF file (required)
- lang: Language code (default: "eng")
- collection_id: Document collection (default: "default")

Response:
{
  "ok": true,
  "filename": "document.pdf",
  "pages": 10,
  "num_chunks": 25,
  "collection_id": "default",
  "steps": [...],
  "total_ms": 5000
}
```

#### Chat

```http
POST /chat
Content-Type: application/json
Headers: x-api-key (optional)

Body:
{
  "session_id": "uuid-string",
  "message": "Your question here",
  "collection_id": "default",
  "k": 5
}

Response:
{
  "answer": "AI response",
  "top_chunks": ["relevant", "document", "chunks"],
  "meta": { "k": 5 },
  "history": []
}
```

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

**Made with ❤️ by [marophossain](https://github.com/marophossain)**

_Chat with your documents intelligently!_

## ⚙️ Configuration

### Environment Variables (`backend/.env`)

| Variable          | Required | Description              | Default                  |
| ----------------- | -------- | ------------------------ | ------------------------ |
| `OPENAI_API_KEY`  | ✅       | OpenAI API key           | -                        |
| `RAG_API_KEY`     | ❌       | API protection key       | -                        |
| `LLM_MODEL`       | ❌       | OpenAI chat model        | `gpt-4o-mini`            |
| `EMBEDDING_MODEL` | ❌       | OpenAI embedding model   | `text-embedding-3-small` |
| `DATA_DIR`        | ❌       | Storage directory        | `storage`                |
| `INDEX_DIR`       | ❌       | Vector index directory   | `storage/index`          |
| `UPLOAD_DIR`      | ❌       | Upload directory         | `storage/uploads`        |
| `CORS_ORIGINS`    | ❌       | Allowed frontend origins | `http://localhost:5173`  |

### Advanced Settings (`backend/app/core/config.py`)

| Setting        | Description                  | Default |
| -------------- | ---------------------------- | ------- |
| `K_FAISS`      | FAISS search results         | 30      |
| `K_BM25`       | BM25 search results          | 50      |
| `K_MERGED`     | Merged search results        | 20      |
| `K_PROMPT`     | Results sent to LLM          | 8       |
| `FUSION_ALPHA` | Search fusion weight         | 0.6     |
| `CONF_MIN`     | Minimum confidence threshold | 0.20    |

## 🏗️ Project Structure

```
📦 Customer-Service-Chatbot-V2
├── 📁 backend/
│   ├── 📁 app/
│   │   ├── 📁 core/           # Configuration settings
│   │   ├── 📁 models/         # Pydantic schemas
│   │   ├── 📁 routers/        # API endpoints
│   │   ├── 📁 services/       # Business logic
│   │   └── 📁 storage/        # Runtime data (uploads, indices)
│   ├── 📁 myenv/              # Virtual environment
│   ├── 📄 requirements.txt    # Python dependencies
│   └── 📄 .env               # Environment variables
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── 📁 lib/           # API utilities
│   │   ├── 📄 app.tsx        # Main React component
│   │   ├── 📄 main.tsx       # App entry point
│   │   └── 📄 App.module.css # Styling
│   ├── 📄 package.json       # Node dependencies
│   └── 📄 vite.config.ts     # Vite configuration
├── 📄 .gitignore            # Git ignore rules
└── 📄 README.md             # This file
```

## 🛠️ Enhanced Troubleshooting

### Common Issues

#### Backend Issues

- **Uvicorn not found**: `pip install uvicorn[standard]` in virtual environment
- **OpenAI API errors**: Verify `OPENAI_API_KEY` in `backend/.env`
- **FAISS installation**: Use `faiss-cpu` package (included in requirements)
- **CORS errors**: Add your frontend URL to `CORS_ORIGINS` in `.env`

#### Frontend Issues

- **Port conflicts**: Frontend auto-assigns available port (5173, 5174, etc.)
- **API connection**: Ensure backend is running on http://127.0.0.1:8000
- **File upload errors**: Check file size (≤10MB) and PDF format

#### OCR Issues

- **Scanned PDFs**: Install Tesseract OCR and configure paths in `.env`
- **OCR quality**: Adjust `OCR_THRESHOLD` setting for better results

### Performance Tips

- **Large documents**: Consider splitting very large PDFs for better performance
- **Memory usage**: Monitor system memory when processing multiple documents
- **API costs**: Use smaller `k` values to reduce token usage

## 🔐 Enhanced Security

- **API Keys**: Never commit real API keys to version control
- **Environment**: Use `.env` files for local development only
- **Protection**: Set `RAG_API_KEY` to require authentication on endpoints
- **CORS**: Configure `CORS_ORIGINS` to restrict frontend access

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit changes: `git commit -m "Add feature description"`
5. Push to branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **OpenAI** for providing powerful language models
- **LangChain** for document processing framework
- **FastAPI** for high-performance web framework
- **React** for modern frontend development
