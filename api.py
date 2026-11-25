"""Optional FastAPI wrapper exposing the exact same modular Python backend services."""

from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.schemas import CandidateProfile, InternshipPosting
from services.database import CareerDatabase
from services.evaluation import run_evaluation_benchmark
from services.matching_agent import JobResumeMatchingAgent
from services.rag_pipeline import InternshipRAGPipeline
from services.resume_parser import (
    ResumeParseError,
    extract_text_from_file,
    parse_resume_with_gemini,
)

app = FastAPI(title="AI Career Companion Agent API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db = CareerDatabase("career_companion.db")
rag = InternshipRAGPipeline(data_path="data/internships.json", vector_dir="data/vector_store")
agent = JobResumeMatchingAgent(rag_pipeline=rag)


class ParseTextRequest(BaseModel):
    resume_text: str


class MatchRequest(BaseModel):
    student_id: str
    top_k: int = 10


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "internships_loaded": len(rag.load_internships()),
        "vector_indexed": rag.is_indexed(),
    }


@app.post("/api/parse-resume-text")
def parse_resume_text(req: ParseTextRequest) -> dict[str, object]:
    try:
        profile = parse_resume_with_gemini(req.resume_text)
        return profile.model_dump()
    except ResumeParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/parse-resume-file")
async def parse_resume_file(file: UploadFile = File(...)) -> dict[str, object]:
    try:
        raw_bytes = await file.read()
        text = extract_text_from_file(raw_bytes, file.filename or "resume.txt")
        profile = parse_resume_with_gemini(text)
        return profile.model_dump()
    except ResumeParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/profiles")
def list_profiles() -> list[dict[str, object]]:
    return [p.model_dump() for p in db.list_profiles()]


@app.post("/api/profiles")
def save_profile(profile: CandidateProfile) -> dict[str, object]:
    return db.save_profile(profile).model_dump()


@app.get("/api/internships")
def list_internships() -> list[dict[str, object]]:
    return [p.model_dump() for p in rag.load_internships()]


@app.post("/api/internships")
def add_internship(posting: InternshipPosting) -> dict[str, object]:
    try:
        updated = rag.add_internship(posting)
        return {"count": len(updated), "added": posting.model_dump()}
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/rag/index")
def build_index() -> dict[str, object]:
    return rag.index_internships()


@app.post("/api/match")
def run_match(req: MatchRequest) -> list[dict[str, object]]:
    profile = db.get_profile(req.student_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile {req.student_id} not found.")
    results = agent.match_candidate(profile, top_k=req.top_k)
    db.save_match_run(profile.student_id, results, top_k=req.top_k)
    return [r.model_dump() for r in results]


@app.post("/api/evaluate")
def run_evaluation(top_k: int = 8) -> dict[str, object]:
    rows, detailed = run_evaluation_benchmark(rag, agent, top_k=top_k)
    return {
        "summary": [r.model_dump() for r in rows],
        "detailed": {k: [m.model_dump() for m in v] for k, v in detailed.items()},
    }
