from sentence_transformers import SentenceTransformer

# โหลด model ครั้งเดียวตอน server start (ไม่ใช่ทุกครั้งที่เรียกฟังก์ชัน)
embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")


def chunk_text(text: str, chunk_size: int = 200) -> list[str]:
    """
    แบ่ง text ยาว ๆ ออกเป็นชิ้นเล็ก ๆ ตามประโยค/ย่อหน้า
    """
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) < chunk_size:
            current_chunk += " " + para
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para

    if current_chunk:
        chunks.append(current_chunk.strip())

    if not chunks:
        chunks = [text.strip()]

    return chunks


def embed_text(text: str) -> list[float]:
    vector = embedding_model.encode(text)
    return vector.tolist()