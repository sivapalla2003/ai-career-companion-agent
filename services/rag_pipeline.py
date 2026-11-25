"""RAG Knowledge Base & Vector Indexing pipeline using gemini-embedding-001."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Callable, Optional

import numpy as np
from google import genai

from models.schemas import CandidateProfile, InternshipPosting

try:
    import chromadb
except ImportError:  # pragma: no cover - optional fallback
    chromadb = None  # type: ignore[assignment]

EMBEDDING_MODEL = "gemini-embedding-001"
DEFAULT_DATA_PATH = Path("data/internships.json")
DEFAULT_VECTOR_DIR = Path("data/vector_store")


def build_internship_chunk(posting: InternshipPosting) -> str:
    """Create a semantically rich, structured document chunk for an internship posting."""
    return (
        f"Role: {posting.job_title} at {posting.company} ({posting.location}) | Domain: {posting.domain}\n"
        f"Required Skills: {', '.join(posting.required_skills)}\n"
        f"Preferred Skills: {', '.join(posting.preferred_skills)}\n"
        f"Education: {posting.education_requirements} | Experience: {posting.experience_requirements}\n"
        f"Qualifications: {posting.qualifications}\n"
        f"Responsibilities: {'; '.join(posting.responsibilities)}\n"
        f"Description: {posting.job_description}"
    )


def build_profile_query(profile: CandidateProfile) -> str:
    """Build a focused semantic query string from a CandidateProfile."""
    edu_summary = "; ".join(f"{e.degree} ({e.institution})" for e in profile.education)
    proj_summary = "; ".join(
        f"{p.title} [{', '.join(p.tech_stack)}]: {p.description}" for p in profile.projects[:4]
    )
    exp_summary = "; ".join(f"{e.role} at {e.company}" for e in profile.experience[:3])
    return (
        f"Target Roles: {', '.join(profile.preferred_roles)}\n"
        f"Core Skills: {', '.join(profile.skills)}\n"
        f"Education: {edu_summary}\n"
        f"Experience: {exp_summary}\n"
        f"Projects: {proj_summary}"
    )


class InternshipRAGPipeline:
    """Handles chunking, Gemini embeddings, persistent vector storage, and Top-K retrieval."""

    def __init__(
        self,
        data_path: str | Path = DEFAULT_DATA_PATH,
        vector_dir: str | Path = DEFAULT_VECTOR_DIR,
        api_key: str | None = None,
    ) -> None:
        self.data_path = Path(data_path)
        self.vector_dir = Path(vector_dir)
        self.vector_dir.mkdir(parents=True, exist_ok=True)
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.numpy_index_path = self.vector_dir / "embeddings_index.npz"
        self.meta_index_path = self.vector_dir / "metadata_index.json"

    def load_internships(self) -> list[InternshipPosting]:
        if not self.data_path.exists():
            return []
        raw = json.loads(self.data_path.read_text(encoding="utf-8"))
        return [InternshipPosting.model_validate(item) for item in raw]

    def save_internships(self, postings: list[InternshipPosting]) -> None:
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        serialized = [p.model_dump() for p in postings]
        self.data_path.write_text(json.dumps(serialized, indent=2, ensure_ascii=False), encoding="utf-8")

    def add_internship(self, posting: InternshipPosting) -> list[InternshipPosting]:
        postings = self.load_internships()
        if any(p.job_id == posting.job_id for p in postings):
            raise ValueError(f"Internship job_id '{posting.job_id}' already exists.")
        postings.append(posting)
        self.save_internships(postings)
        return postings

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is required to generate embeddings.")
        client = genai.Client(api_key=self.api_key)
        vectors: list[list[float]] = []
        batch_size = 20
        model_chain = [EMBEDDING_MODEL, "gemini-embedding-2"]

        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            batch_done = False
            last_err: Exception | None = None
            for model_name in list(model_chain):
                for attempt in range(3):
                    try:
                        response = client.models.embed_content(
                            model=model_name,
                            contents=batch,
                        )
                        for emb in response.embeddings:
                            vectors.append(list(emb.values))
                        if start == 0 and model_name != model_chain[0]:
                            model_chain = [model_name]
                        batch_done = True
                        break
                    except Exception as exc:
                        last_err = exc
                        if attempt < 2:
                            time.sleep(0.8 * (2**attempt))
                if batch_done:
                    break
            if not batch_done:
                raise RuntimeError(f"Embedding batch failed after retries and failover: {last_err}")
            if start + batch_size < len(texts):
                time.sleep(0.12)
        return vectors

    def index_internships(
        self,
        postings: Optional[list[InternshipPosting]] = None,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
    ) -> dict[str, object]:
        """Chunk, embed with gemini-embedding-001, and persist to ChromaDB + NumPy index."""
        records = postings if postings is not None else self.load_internships()
        if not records:
            raise ValueError("No internship postings available to index.")

        chunks = [build_internship_chunk(p) for p in records]
        total = len(chunks)
        all_vectors: list[list[float]] = []
        batch_size = 32

        for start in range(0, total, batch_size):
            end = min(start + batch_size, total)
            if progress_callback:
                progress_callback(start, total, f"Embedding postings {start + 1}–{end} of {total}...")
            batch_vecs = self._embed_batch(chunks[start:end])
            all_vectors.extend(batch_vecs)

        matrix = np.asarray(all_vectors, dtype=np.float32)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized = matrix / norms

        np.savez_compressed(self.numpy_index_path, embeddings=normalized)
        meta_payload = {
            "model": EMBEDDING_MODEL,
            "count": total,
            "dimension": int(normalized.shape[1]),
            "job_ids": [p.job_id for p in records],
            "chunks": chunks,
        }
        self.meta_index_path.write_text(json.dumps(meta_payload, indent=2), encoding="utf-8")

        backend_used = "numpy-cosine"
        if chromadb is not None:
            chroma_client = chromadb.PersistentClient(path=str(self.vector_dir / "chroma"))
            try:
                chroma_client.delete_collection("internships")
            except Exception:
                pass
            collection = chroma_client.create_collection(
                name="internships",
                metadata={"hnsw:space": "cosine"},
            )
            collection.add(
                ids=[p.job_id for p in records],
                embeddings=all_vectors,
                documents=chunks,
                metadatas=[
                    {
                        "job_title": p.job_title,
                        "company": p.company,
                        "location": p.location,
                        "domain": p.domain,
                    }
                    for p in records
                ],
            )
            backend_used = "chromadb+numpy"

        if progress_callback:
            progress_callback(total, total, f"Indexed {total} postings into {backend_used}.")

        return {
            "indexed_count": total,
            "dimension": int(normalized.shape[1]),
            "backend": backend_used,
            "model": EMBEDDING_MODEL,
        }

    def is_indexed(self) -> bool:
        return self.numpy_index_path.exists() and self.meta_index_path.exists()

    def retrieve_top_k(
        self,
        query: str | CandidateProfile,
        top_k: int = 10,
    ) -> list[tuple[InternshipPosting, float]]:
        """Retrieve Top-K semantically similar internships using cosine similarity."""
        if not self.is_indexed():
            raise RuntimeError("Vector index has not been built yet. Run index_internships() first.")

        query_text = build_profile_query(query) if isinstance(query, CandidateProfile) else query
        query_vec = np.asarray(self._embed_batch([query_text])[0], dtype=np.float32)
        q_norm = np.linalg.norm(query_vec)
        if q_norm > 0:
            query_vec = query_vec / q_norm

        data = np.load(self.numpy_index_path)
        matrix = data["embeddings"]
        meta = json.loads(self.meta_index_path.read_text(encoding="utf-8"))
        job_ids: list[str] = meta["job_ids"]

        scores = matrix @ query_vec
        top_indices = np.argsort(scores)[::-1][:top_k]

        postings_by_id = {p.job_id: p for p in self.load_internships()}
        results: list[tuple[InternshipPosting, float]] = []
        for idx in top_indices:
            job_id = job_ids[int(idx)]
            posting = postings_by_id.get(job_id)
            if posting is not None:
                sim = float(max(0.0, min(1.0, scores[int(idx)])))
                results.append((posting, round(sim, 4)))
        return results
