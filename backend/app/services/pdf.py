import io, os, re
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from typing import Tuple
from app.core.config import settings

if settings.TESSDATA_PREFIX:
    os.environ["TESSDATA_PREFIX"] = settings.TESSDATA_PREFIX
if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

def _clean(text: str) -> str:
    text = (text or "").replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def extract_text_with_ocr_fallback(pdf_bytes: bytes, lang: str = "eng") -> Tuple[str, int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    parts = []
    for i, page in enumerate(doc):
        text = page.get_text("text") or ""
        text = _clean(text)
        if len(text) < settings.OCR_THRESHOLD:
            pix = page.get_pixmap(dpi=300)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            try:
                text = pytesseract.image_to_string(img, lang=lang)
            except pytesseract.TesseractError:
                text = pytesseract.image_to_string(img, lang="eng")
            text = _clean(text)
        if text:
            parts.append(f"[Page {i+1}] {text}")
    return "\n\n".join(parts), len(doc)