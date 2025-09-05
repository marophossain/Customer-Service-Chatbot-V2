from typing import Dict, List, Any

# Simple in-process memory; swap for Redis in prod
CHAT_HISTORY: Dict[str, List[Dict[str, str]]] = {}
ROLLING_SUMMARY: Dict[str, str] = {}

def add_turn(session_id: str, user: str, bot: str):
    """Add a conversation turn to the history"""
    history = CHAT_HISTORY.setdefault(session_id, [])
    history.extend([
        {"type": "human", "content": user}, 
        {"type": "ai", "content": bot}
    ])
    CHAT_HISTORY[session_id] = history[-12:]  # Keep last 12 messages

def get_summary(session_id: str) -> str:
    """Get conversation summary for the session"""
    return ROLLING_SUMMARY.get(session_id, "")

def get_short_history(session_id: str):
    """Get recent conversation history formatted for the chat endpoint"""
    history = CHAT_HISTORY.get(session_id, [])[-8:]  # Last 8 messages
    # Convert to simple objects that can be used in the chat endpoint
    result = []
    for msg in history:
        if msg["type"] == "human":
            result.append(type('Message', (), {'type': 'user', 'content': msg["content"]})())
        else:
            result.append(type('Message', (), {'type': 'assistant', 'content': msg["content"]})())
    return result

def get_formatted_history(session_id: str) -> str:
    """Get conversation history as a formatted string"""
    history = CHAT_HISTORY.get(session_id, [])[-8:]
    if not history:
        return "No previous conversation."
    
    formatted_lines = []
    for msg in history:
        role = "User" if msg["type"] == "human" else "Assistant"
        formatted_lines.append(f"{role}: {msg['content']}")
    
    return "\n".join(formatted_lines)