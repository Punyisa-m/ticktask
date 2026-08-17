from sentence_transformers import SentenceTransformer


embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")


def chunk_text(text: str, chunk_size: int = 200) -> list[str]:
    """
    Split long text into smaller chunks based on sentences and paragraphs.
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