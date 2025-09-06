from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.core.config import settings
from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag import active_collection, search_similar_chunks, chunks_map
from app.services.memory import add_turn, get_summary, get_formatted_history
from langchain_openai import ChatOpenAI

router = APIRouter()

_llm_instance = None

def get_llm():
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = ChatOpenAI(
            model=settings.LLM_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            temperature=0.7,
            max_tokens=512
        )
    return _llm_instance

SYSTEM_PROMPT = (
    "You are a helpful, concise customer-service assistant."
    " Use the provided CONTEXT from the knowledge base when relevant."
    " If information is missing, ask a brief follow-up question or say you don't know."
    " Maintain a professional, friendly tone; include actionable steps.")

def _require_api_key(x_api_key: Optional[str]):
    if settings.RAG_API_KEY and x_api_key != settings.RAG_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

@router.get("/chat/test")
async def test_chat():
    return {"status": "Chat router is working", "active_collection": active_collection}

@router.post("/chat")
async def chat(data: ChatRequest, x_api_key: Optional[str] = Header(default=None)):
    try:
        _require_api_key(x_api_key)
        sid = data.session_id or "default"
        cid = data.collection_id or active_collection

        if cid not in chunks_map or not chunks_map[cid]:
            answer = "I don't have any documents loaded yet. Please upload a PDF first."
            add_turn(sid, data.message, answer)
            return ChatResponse(answer=answer, top_chunks=[], meta={}, history=[])

        dense_chunks, dense_sims = search_similar_chunks(data.message, k=5, collection_id=cid)
        
        if not dense_sims or max(dense_sims) < settings.CONF_MIN:
            answer = "I couldn't find this in our knowledge base. Could you clarify or provide more details?"
            add_turn(sid, data.message, answer)
            return ChatResponse(answer=answer, top_chunks=[], meta={}, history=[])

        context = "\n\n---\n\n".join(dense_chunks[:data.k])
        summary = get_summary(sid)
        formatted_history = get_formatted_history(sid)

        system_content = f"{SYSTEM_PROMPT}\n\nContext from documents:\n{context}"
        if summary:
            system_content += f"\n\nConversation summary: {summary}"
        if formatted_history:
            system_content += f"\n\nPrevious messages:\n{formatted_history}"

        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": data.message}
        ]

        llm = get_llm()
        response = llm.invoke(messages)
        answer = response.content.strip()

        add_turn(sid, data.message, answer)
        
        return ChatResponse(
            answer=answer, 
            top_chunks=dense_chunks[:data.k], 
            meta={"k": data.k}, 
            history=[]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))