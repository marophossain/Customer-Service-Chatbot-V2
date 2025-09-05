from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, ingest, chat
import os

app = FastAPI(title="Customer Service Chatbot API")

# Allow both with and without trailing slashes
origins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5173/", "http://localhost:5174/", "http://localhost:5175/", "http://localhost:5176/"]
print(f"CORS origins configured: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ingest.router)
app.include_router(chat.router)

@app.get("/")
async def root():
    return {"status": "ok", "endpoints": ["/healthz", "/ingest", "/chat"]}