import re
from typing import List, Tuple
import tiktoken

ENC_EMB = tiktoken.encoding_for_model("text-embedding-3-large")
PAGE_HEADER_RE = re.compile(r"\[Page\s+(\d+)\]\s*")

def token_len(s: str) -> int:
    return len(ENC_EMB.encode(s))

def sentence_split(text: str) -> List[str]:
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text: return []
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

def split_by_pages(text: str) -> List[Tuple[int, str]]:
    parts = PAGE_HEADER_RE.split(text)
    out: List[Tuple[int, str]] = []
    it = iter(parts)
    _ = next(it, "")
    while True:
        pnum = next(it, None)
        if pnum is None: break
        body = next(it, "")
        try:
            page_no = int(pnum)
        except ValueError:
            continue
        out.append((page_no, body.strip()))
    return out

def page_chunks(page_no: int, page_text: str, max_tokens: int = 500) -> List[str]:
    sents = sentence_split(page_text)
    chunks, buf = [], []
    cur = 0
    def flush():
        nonlocal buf, cur
        if not buf: return
        chunks.append(f"[Page {page_no}] {' '.join(buf).strip()}")
        buf, cur = [], 0
    for s in sents:
        t = token_len(s)
        if cur + t <= max_tokens:
            buf.append(s); cur += t
        else:
            flush()
            if t > max_tokens:
                words, tmp = s.split(), []
                for w in words:
                    tmp.append(w)
                    if token_len(' '.join(tmp)) > max_tokens:
                        chunks.append(f"[Page {page_no}] {' '.join(tmp[:-1]).strip()}")
                        tmp = [w]
                if tmp: chunks.append(f"[Page {page_no}] {' '.join(tmp)}")
            else:
                buf, cur = [s], t
    flush()
    return chunks

def build_chunks(text: str) -> List[str]:
    all_chunks: List[str] = []
    for pno, ptext in split_by_pages(text):
        all_chunks.extend(page_chunks(pno, ptext))
    return all_chunks