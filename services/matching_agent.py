"""Job-Resume Matching Agent combining RAG retrieval with Gemini structured scoring."""

from __future__ import annotations

import os
import time
from typing import Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from models.schemas import CandidateProfile, InternshipPosting, MatchResult
from services.rag_pipeline import InternshipRAGPipeline

GEMINI_MODEL = "gemini-4-hydrogen"


class _BatchMatchPayload(BaseModel):
    evaluations: list[MatchResult] = Field(
        ...,
        description="Structured match evaluation for every candidate internship provided",
    )


def classify_tier(score: int) -> str:
    if score >= 80:
        return "Strong Match"
    if score >= 62:
        return "Good Fit"
    return "Stretch Role"


class JobResumeMatchingAgent:
    """Retrieves Top-K postings via RAG and performs holistic structured scoring via Gemini."""

    def __init__(
        self,
        rag_pipeline: InternshipRAGPipeline,
        api_key: Optional[str] = None,
    ) -> None:
        self.rag_pipeline = rag_pipeline
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")

    def match_candidate(
        self,
        profile: CandidateProfile,
        top_k: int = 10,
    ) -> list[MatchResult]:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is required to run the Matching Agent.")

        retrieved = self.rag_pipeline.retrieve_top_k(profile, top_k=top_k)
        if not retrieved:
            return []

        similarity_lookup = {posting.job_id: sim for posting, sim in retrieved}
        posting_lookup = {posting.job_id: posting for posting, _ in retrieved}

        jobs_context = [
            {
                "job_id": posting.job_id,
                "job_title": posting.job_title,
                "company": posting.company,
                "location": posting.location,
                "domain": posting.domain,
                "semantic_similarity": sim,
                "required_skills": posting.required_skills,
                "preferred_skills": posting.preferred_skills,
                "education_requirements": posting.education_requirements,
                "experience_requirements": posting.experience_requirements,
                "responsibilities": posting.responsibilities,
            }
            for posting, sim in retrieved
        ]

        prompt = (
            "You are the Job-Resume Matching Agent for an AI Career Companion platform. "
            "Evaluate the candidate profile against EVERY internship posting listed below. "
            "Score each internship strictly from 0 to 100 using these weights:\n"
            "- Required skills alignment: 45%\n"
            "- Preferred skills & project relevance: 25%\n"
            "- Experience & responsibilities alignment: 15%\n"
            "- Education requirements alignment: 15%\n\n"
            "Rules:\n"
            "1. Only place skills actually present (or direct synonyms) in the candidate profile into matched_skills.\n"
            "2. List required skills missing from the candidate profile in missing_skills.\n"
            "3. Set recommendation_tier: >=80 -> 'Strong Match', 62-79 -> 'Good Fit', <62 -> 'Stretch Role'.\n"
            "4. Provide concise, actionable reasoning referencing concrete projects, skills, and gaps.\n\n"
            f"CANDIDATE PROFILE:\n{profile.model_dump_json(indent=2)}\n\n"
            f"CANDIDATE INTERNSHIPS (TOP-{len(jobs_context)} RAG RETRIEVAL):\n{jobs_context}"
        )

        client = genai.Client(api_key=self.api_key)
        last_error: Exception | None = None
        for model_name in (GEMINI_MODEL, "gemini-3.1-flash-lite"):
            for attempt in range(3):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=_BatchMatchPayload,
                        ),
                    )
                    parsed = _BatchMatchPayload.model_validate_json(response.text or '{"evaluations": []}')
                    enriched: list[MatchResult] = []
                    for item in parsed.evaluations:
                        posting = posting_lookup.get(item.job_id)
                        tier = classify_tier(item.match_score)
                        enriched.append(
                            item.model_copy(
                                update={
                                    "semantic_similarity": similarity_lookup.get(item.job_id, item.semantic_similarity),
                                    "location": posting.location if posting else item.location,
                                    "domain": posting.domain if posting else item.domain,
                                    "recommendation_tier": tier,
                                }
                            )
                        )
                    enriched.sort(key=lambda r: r.match_score, reverse=True)
                    return enriched
                except Exception as exc:
                    last_error = exc
                    msg = str(exc).lower()
                    transient = any(
                        t in msg for t in ("503", "unavailable", "high demand", "429", "resource_exhausted", "500", "504", "404")
                    )
                    if not transient:
                        raise RuntimeError(f"Matching Agent error: {exc}") from exc
                    if attempt < 2:
                        time.sleep(0.9 * (2**attempt))

        raise RuntimeError(
            f"Gemini models are temporarily experiencing high demand after automatic retries and failover: {last_error}"
        )
