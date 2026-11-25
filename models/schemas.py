"""Strict Pydantic v2 schemas for the AI Career Companion Agent."""

from __future__ import annotations

from typing import Literal, Union
from pydantic import BaseModel, Field, field_validator


class EducationItem(BaseModel):
    degree: str = Field(..., description="Degree title, e.g., B.Tech in Computer Science")
    institution: str = Field(..., description="University or college name")
    year: str = Field(..., description="Graduation year or expected year, e.g., 2026")
    cgpa: str = Field(default="N/A", description="CGPA or percentage score")


class ExperienceItem(BaseModel):
    role: str = Field(..., description="Internship or work role title")
    company: str = Field(..., description="Organization or company name")
    duration: str = Field(..., description="Timeframe, e.g., May 2025 - Jul 2025")
    highlights: list[str] = Field(
        default_factory=list,
        description="Measurable impact bullets and engineering contributions",
    )


class ProjectItem(BaseModel):
    title: str = Field(..., description="Project title")
    tech_stack: list[str] = Field(
        default_factory=list,
        description="Frameworks, languages, and tools used",
    )
    description: str = Field(..., description="Concise summary of project goals and results")


class CandidateProfile(BaseModel):
    student_id: str = Field(default="", description="Unique student identifier")
    full_name: str = Field(..., description="Candidate full name")
    email: str = Field(default="", description="Candidate contact email")
    skills: list[str] = Field(
        default_factory=list,
        description="Normalized list of technical and domain skills",
    )
    education: list[EducationItem] = Field(
        default_factory=list,
        description="Academic credentials",
    )
    experience: list[ExperienceItem] = Field(
        default_factory=list,
        description="Internships, fellowships, or relevant work experience",
    )
    projects: list[ProjectItem] = Field(
        default_factory=list,
        description="Academic or personal engineering projects",
    )
    certifications: list[str] = Field(
        default_factory=list,
        description="Relevant certifications and courses",
    )
    preferred_roles: list[str] = Field(
        default_factory=list,
        description="Target internship roles inferred or selected by the student",
    )

    @field_validator("skills", "certifications", "preferred_roles", mode="before")
    @classmethod
    def _clean_string_list(cls, value: object) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        seen: set[str] = set()
        cleaned: list[str] = []
        for item in list(value):  # type: ignore[arg-type]
            text = str(item).strip()
            if text and text.lower() not in seen:
                seen.add(text.lower())
                cleaned.append(text)
        return cleaned


class InternshipPosting(BaseModel):
    job_id: str = Field(..., description="Unique internship identifier, e.g., INT-001")
    job_title: str = Field(..., description="Internship role title")
    company: str = Field(..., description="Hiring company name")
    location: str = Field(..., description="Primary hub or Remote")
    domain: str = Field(
        default="Software Engineering",
        description="Primary functional track",
    )
    stipend: str = Field(default="₹25,000/month", description="Monthly stipend range")
    duration: str = Field(default="6 Months", description="Internship duration")
    job_description: str = Field(..., description="Detailed role overview")
    responsibilities: list[str] = Field(
        default_factory=list,
        description="Key day-to-day responsibilities",
    )
    required_skills: list[str] = Field(
        default_factory=list,
        description="Mandatory technical and analytical skills",
    )
    preferred_skills: list[str] = Field(
        default_factory=list,
        description="Nice-to-have skills",
    )
    qualifications: str = Field(..., description="General candidate eligibility")
    experience_requirements: str = Field(..., description="Project or prior internship expectations")
    education_requirements: str = Field(..., description="Required degree or current academic track")


class MatchResult(BaseModel):
    job_id: str = Field(..., description="Matched internship job_id")
    job_title: str = Field(..., description="Internship title")
    company: str = Field(..., description="Company name")
    location: str = Field(default="", description="Internship location")
    domain: str = Field(default="", description="Internship domain")
    match_score: int = Field(..., ge=0, le=100, description="Holistic fit score 0-100")
    semantic_similarity: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Vector cosine similarity from RAG retrieval",
    )
    matched_skills: list[str] = Field(
        default_factory=list,
        description="Required and preferred skills found in candidate profile",
    )
    missing_skills: list[str] = Field(
        default_factory=list,
        description="Required skills absent from candidate profile",
    )
    education_match: Union[bool, str] = Field(
        ...,
        description="Whether candidate education meets job requirements",
    )
    experience_match: Union[bool, str] = Field(
        ...,
        description="Whether candidate projects/experience align with requirements",
    )
    reasoning: str = Field(
        ...,
        description="Detailed explanation of fit, strengths, and gaps",
    )
    recommendation_tier: Literal["Strong Match", "Good Fit", "Stretch Role"] = Field(
        ...,
        description="Actionable match classification",
    )


class EvaluationMetricRow(BaseModel):
    student_id: str
    student_name: str
    target_track: str
    top_k_retrieved: int
    domain_precision_at_k: float
    avg_match_score: float
    top_match_score: int
    score_consistency_std: float
    skill_match_accuracy: float
    strong_matches: int
    good_fits: int
    stretch_roles: int
    top_recommended_role: str
    status: Literal["Pass", "Needs Review"]
