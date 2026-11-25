"""Resume text extraction (PDF/DOCX/TXT) and Gemini structured JSON parsing."""

from __future__ import annotations

import io
import os
import time
import uuid
from pathlib import Path
from typing import BinaryIO, Union

from google import genai
from google.genai import types
from pypdf import PdfReader

from models.schemas import CandidateProfile

try:
    from docx import Document as DocxDocument
except ImportError:  # pragma: no cover - optional dependency
    DocxDocument = None  # type: ignore[assignment]

GEMINI_MODEL = "gemini-4-hydrogen"


class ResumeParseError(ValueError):
    """Raised when resume extraction or structured parsing fails."""


def extract_text_from_file(
    file_obj: Union[BinaryIO, bytes, str, Path],
    filename: str = "resume.txt",
) -> str:
    """Extract clean text from PDF, DOCX, or TXT inputs with robust error handling."""
    suffix = Path(filename).suffix.lower()

    if isinstance(file_obj, (str, Path)):
        path = Path(file_obj)
        if not path.exists():
            raise ResumeParseError(f"File not found: {path}")
        raw_bytes = path.read_bytes()
        suffix = path.suffix.lower()
    elif isinstance(file_obj, bytes):
        raw_bytes = file_obj
    else:
        raw_bytes = file_obj.read()

    if not raw_bytes or len(raw_bytes.strip()) == 0:
        raise ResumeParseError("Uploaded resume file is empty. Provide a valid PDF, DOCX, or TXT file.")

    if suffix == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(raw_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n".join(pages).strip()
        except Exception as exc:
            raise ResumeParseError(
                f"Unable to read PDF file '{filename}'. Ensure the PDF is not password-protected or corrupted."
            ) from exc
    elif suffix == ".docx":
        if DocxDocument is None:
            raise ResumeParseError("python-docx is not installed. Run `pip install python-docx`.")
        try:
            doc = DocxDocument(io.BytesIO(raw_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            text = "\n".join(paragraphs).strip()
        except Exception as exc:
            raise ResumeParseError(f"Unable to parse DOCX file '{filename}': {exc}") from exc
    elif suffix in {".txt", ".md", ""}:
        try:
            text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = raw_bytes.decode("latin-1", errors="ignore")
        text = text.strip()
    else:
        raise ResumeParseError(
            f"Unsupported resume format '{suffix}'. Supported formats: .pdf, .docx, .txt."
        )

    if len(text) < 30:
        raise ResumeParseError(
            "Extracted resume text is too short (<30 chars). If this is a scanned image PDF, paste the text directly."
        )
    return text


GEMINI_MODEL_CHAIN = ("gemini-4-hydrogen", "gemini-3.1-flash-lite")


def _is_transient_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("503", "unavailable", "high demand", "429", "resource_exhausted", "500", "504", "404")
    )


def parse_resume_with_gemini(
    resume_text: str,
    api_key: str | None = None,
    max_retries: int = 3,
) -> CandidateProfile:
    """Parse raw resume text into a validated CandidateProfile using Gemini response_schema."""
    cleaned_text = (resume_text or "").strip()
    if len(cleaned_text) < 30:
        raise ResumeParseError("Resume text must contain at least 30 characters before parsing.")

    resolved_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not resolved_key:
        raise ResumeParseError(
            "GEMINI_API_KEY is not set in the environment. Export GEMINI_API_KEY before parsing."
        )

    client = genai.Client(api_key=resolved_key)
    prompt = (
        "You are an expert technical recruiter and structured resume parser for university internships. "
        "Extract every factual detail from the resume below into the exact CandidateProfile JSON schema. "
        "Normalize technical skill names (e.g., 'React.js' -> 'React', 'PyTorch' -> 'PyTorch'), "
        "infer 2-4 realistic preferred_roles if not explicitly stated, and never fabricate degrees or companies.\n\n"
        f"RESUME TEXT:\n{cleaned_text}"
    )

    last_error: Exception | None = None
    for model_name in GEMINI_MODEL_CHAIN:
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=CandidateProfile,
                    ),
                )
                if not response.text:
                    raise ResumeParseError("Gemini returned an empty response during resume parsing.")
                profile = CandidateProfile.model_validate_json(response.text)
                if not profile.student_id:
                    profile = profile.model_copy(
                        update={"student_id": f"STU-{uuid.uuid4().hex[:8].upper()}"}
                    )
                return profile
            except Exception as exc:
                last_error = exc
                if not _is_transient_error(exc):
                    raise ResumeParseError(f"Gemini resume parsing failed: {exc}") from exc
                if attempt < max_retries - 1:
                    time.sleep(0.9 * (2**attempt))

    raise ResumeParseError(
        f"Gemini models are temporarily experiencing high demand after automatic retries and failover: {last_error}"
    )
