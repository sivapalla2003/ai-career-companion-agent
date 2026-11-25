"""Evaluation & Validation Suite (Milestone 2.4) for RAG + Matching Agent."""

from __future__ import annotations

import statistics
from typing import Callable, Optional

from models.schemas import (
    CandidateProfile,
    EducationItem,
    EvaluationMetricRow,
    ExperienceItem,
    MatchResult,
    ProjectItem,
)
from services.matching_agent import JobResumeMatchingAgent
from services.rag_pipeline import InternshipRAGPipeline

SAMPLE_PROFILES: list[tuple[str, set[str], CandidateProfile]] = [
    (
        "AI/ML Engineer",
        {"AI/Generative AI", "Data Science", "Software Engineering"},
        CandidateProfile(
            student_id="EVAL-AIML-01",
            full_name="Aarav Deshmukh",
            email="aarav.deshmukh@iitb.ac.in",
            skills=[
                "Python",
                "PyTorch",
                "LangChain",
                "RAG",
                "Gemini API",
                "ChromaDB",
                "FAISS",
                "FastAPI",
                "Scikit-learn",
                "SQL",
                "Docker",
                "Git",
            ],
            education=[
                EducationItem(
                    degree="B.Tech in Computer Science and Engineering (AI Specialization)",
                    institution="IIT Bombay",
                    year="2026",
                    cgpa="8.9/10",
                )
            ],
            experience=[
                ExperienceItem(
                    role="Research Intern - Applied NLP",
                    company="TCS Research Bengaluru",
                    duration="May 2025 - Jul 2025",
                    highlights=[
                        "Built a hybrid dense-sparse RAG retrieval pipeline over 50k technical manuals improving Recall@5 by 19%.",
                        "Fine-tuned LoRA adapters for domain entity extraction using PyTorch and Hugging Face.",
                    ],
                )
            ],
            projects=[
                ProjectItem(
                    title="DocuMind Agentic RAG Assistant",
                    tech_stack=["Python", "Gemini API", "ChromaDB", "FastAPI", "Pydantic"],
                    description="Multi-document Q&A assistant with semantic chunking, citation verification, and evaluation harness.",
                ),
                ProjectItem(
                    title="Medical X-Ray Vision Classifier",
                    tech_stack=["PyTorch", "OpenCV", "MLflow", "Docker"],
                    description="Trained ConvNeXt classification model reaching 0.93 AUC on chest radiograph screening.",
                ),
            ],
            certifications=[
                "DeepLearning.AI Generative AI with LLMs",
                "Google Cloud Machine Learning Engineer Track",
            ],
            preferred_roles=[
                "AI/ML Engineering Intern",
                "Generative AI Intern",
                "LLM Application Developer Intern",
            ],
        ),
    ),
    (
        "Frontend React Developer",
        {"Full-Stack Web Dev", "UI/UX Design", "Software Engineering"},
        CandidateProfile(
            student_id="EVAL-FE-02",
            full_name="Ananya Nair",
            email="ananya.nair@nitk.edu.in",
            skills=[
                "React",
                "TypeScript",
                "JavaScript",
                "Next.js",
                "Tailwind CSS",
                "HTML5",
                "CSS3",
                "Redux Toolkit",
                "REST APIs",
                "Figma",
                "Jest",
                "Git",
            ],
            education=[
                EducationItem(
                    degree="B.Tech in Information Technology",
                    institution="NIT Surathkal",
                    year="2026",
                    cgpa="8.6/10",
                )
            ],
            experience=[
                ExperienceItem(
                    role="Frontend Engineering Intern",
                    company="Zoho Corp Chennai",
                    duration="Dec 2024 - Feb 2025",
                    highlights=[
                        "Migrated legacy dashboard widgets to React 19 and TypeScript, reducing bundle size by 28%.",
                        "Implemented WCAG AA accessible keyboard navigation across complex data tables.",
                    ],
                )
            ],
            projects=[
                ProjectItem(
                    title="DesignPulse Component System",
                    tech_stack=["React", "TypeScript", "Tailwind CSS", "Storybook", "Figma"],
                    description="Reusable 35-component UI library with automated visual regression tests and theme tokens.",
                ),
                ProjectItem(
                    title="FinTrack Personal Expense Dashboard",
                    tech_stack=["Next.js", "TypeScript", "Recharts", "REST APIs"],
                    description="Interactive budgeting web app with CSV imports and category breakdown charts.",
                ),
            ],
            certifications=["Meta Front-End Developer Professional Certificate"],
            preferred_roles=[
                "Frontend Developer Intern",
                "React.js Intern",
                "Full-Stack Web Developer Intern",
            ],
        ),
    ),
    (
        "Data Analyst",
        {"Data Science", "Product/Business"},
        CandidateProfile(
            student_id="EVAL-DA-03",
            full_name="Rohan Kulkarni",
            email="rohan.kulkarni@vit.ac.in",
            skills=[
                "SQL",
                "Python",
                "Pandas",
                "NumPy",
                "Power BI",
                "Tableau",
                "Excel",
                "Statistics",
                "A/B Testing",
                "PostgreSQL",
                "Data Visualization",
                "ETL",
            ],
            education=[
                EducationItem(
                    degree="B.Tech in Data Science and Analytics",
                    institution="VIT Vellore",
                    year="2026",
                    cgpa="8.7/10",
                )
            ],
            experience=[
                ExperienceItem(
                    role="Business Intelligence Intern",
                    company="Swiggy Analytics Pune",
                    duration="May 2025 - Jul 2025",
                    highlights=[
                        "Authored complex PostgreSQL cohort queries tracking 30-day rider retention across 12 cities.",
                        "Built automated Power BI executive scorecards saving 6 hours of weekly manual reporting.",
                    ],
                )
            ],
            projects=[
                ProjectItem(
                    title="E-Commerce Funnel & Churn Diagnostics",
                    tech_stack=["Python", "Pandas", "SQL", "Tableau"],
                    description="Analyzed 400k checkout sessions to isolate drop-off causes and lift conversion by 4.2% in simulation.",
                ),
                ProjectItem(
                    title="Supply Chain Demand Forecaster",
                    tech_stack=["Python", "Prophet", "Excel", "Power BI"],
                    description="Weekly SKU demand forecasting dashboard reducing stockout alerts across 4 regional hubs.",
                ),
            ],
            certifications=[
                "Google Data Analytics Professional Certificate",
                "Microsoft Power BI Data Analyst Associate",
            ],
            preferred_roles=[
                "Data Analyst Intern",
                "Business Intelligence Intern",
                "Product Analytics Intern",
            ],
        ),
    ),
    (
        "Business/Product Intern",
        {"Product/Business", "UI/UX Design", "Data Science"},
        CandidateProfile(
            student_id="EVAL-PM-04",
            full_name="Meera Krishnan",
            email="meera.krishnan@iimindore.ac.in",
            skills=[
                "Product Strategy",
                "PRD Writing",
                "User Research",
                "SQL",
                "Figma",
                "Jira",
                "Agile",
                "Market Analysis",
                "Excel",
                "A/B Testing",
                "Wireframing",
                "Stakeholder Management",
            ],
            education=[
                EducationItem(
                    degree="Integrated Programme in Management (BBA + MBA)",
                    institution="IIM Indore",
                    year="2026",
                    cgpa="8.5/10",
                )
            ],
            experience=[
                ExperienceItem(
                    role="Product Management Intern",
                    company="Razorpay Bengaluru",
                    duration="Apr 2025 - Jun 2025",
                    highlights=[
                        "Drafted PRDs and user stories for merchant onboarding KYC flow, cutting drop-off by 11%.",
                        "Conducted 25+ SMB user interviews and prioritized backlog items using RICE scoring.",
                    ],
                )
            ],
            projects=[
                ProjectItem(
                    title="CampusPay Split-Billing Product Teardown & Prototype",
                    tech_stack=["Figma", "Jira", "SQL", "Excel"],
                    description="End-to-end product discovery, competitive benchmarking, KPI tree, and clickable prototype.",
                ),
                ProjectItem(
                    title="SaaS Pricing & Funnel Experimentation Plan",
                    tech_stack=["A/B Testing", "Product Analytics", "Market Analysis"],
                    description="Designed freemium-to-pro upgrade experiments and GTM launch playbook.",
                ),
            ],
            certifications=[
                "Product School Product Management Certificate",
                "Atlassian Agile Project Management",
            ],
            preferred_roles=[
                "Product Management Intern",
                "Business Analyst Intern",
                "Product Strategy Intern",
            ],
        ),
    ),
]


def _compute_skill_accuracy(profile: CandidateProfile, results: list[MatchResult]) -> float:
    """Verify matched_skills reported by the agent truly align with candidate skills (hallucination check)."""
    candidate_tokens = {s.lower().strip() for s in profile.skills}
    if not results:
        return 0.0
    total_claimed = 0
    verified = 0
    for res in results:
        for skill in res.matched_skills:
            total_claimed += 1
            norm = skill.lower().strip()
            if any(norm in cand or cand in norm for cand in candidate_tokens):
                verified += 1
    if total_claimed == 0:
        return 100.0
    return round((verified / total_claimed) * 100.0, 1)


def run_evaluation_benchmark(
    rag_pipeline: InternshipRAGPipeline,
    matching_agent: JobResumeMatchingAgent,
    top_k: int = 8,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
) -> tuple[list[EvaluationMetricRow], dict[str, list[MatchResult]]]:
    """Run end-to-end RAG retrieval & matching validation across all 4 diverse sample profiles."""
    rows: list[EvaluationMetricRow] = []
    detailed_matches: dict[str, list[MatchResult]] = {}
    total = len(SAMPLE_PROFILES)

    for idx, (track_label, expected_domains, profile) in enumerate(SAMPLE_PROFILES, start=1):
        if progress_callback:
            progress_callback(idx - 1, total, f"Benchmarking {profile.full_name} ({track_label})...")

        matches = matching_agent.match_candidate(profile, top_k=top_k)
        detailed_matches[profile.student_id] = matches

        relevant_count = sum(1 for m in matches if m.domain in expected_domains)
        precision_at_k = round((relevant_count / max(1, len(matches))) * 100.0, 1)
        scores = [m.match_score for m in matches]
        avg_score = round(statistics.mean(scores), 1) if scores else 0.0
        top_score = max(scores) if scores else 0
        std_dev = round(statistics.pstdev(scores), 2) if len(scores) > 1 else 0.0
        skill_acc = _compute_skill_accuracy(profile, matches)

        strong = sum(1 for m in matches if m.recommendation_tier == "Strong Match")
        good = sum(1 for m in matches if m.recommendation_tier == "Good Fit")
        stretch = sum(1 for m in matches if m.recommendation_tier == "Stretch Role")
        top_role = f"{matches[0].job_title} @ {matches[0].company}" if matches else "N/A"
        status = "Pass" if (precision_at_k >= 70.0 and skill_acc >= 85.0 and top_score >= 70) else "Needs Review"

        rows.append(
            EvaluationMetricRow(
                student_id=profile.student_id,
                student_name=profile.full_name,
                target_track=track_label,
                top_k_retrieved=len(matches),
                domain_precision_at_k=precision_at_k,
                avg_match_score=avg_score,
                top_match_score=top_score,
                score_consistency_std=std_dev,
                skill_match_accuracy=skill_acc,
                strong_matches=strong,
                good_fits=good,
                stretch_roles=stretch,
                top_recommended_role=top_role,
                status=status,
            )
        )

    if progress_callback:
        progress_callback(total, total, "Evaluation benchmark complete across all 4 student profiles.")

    return rows, detailed_matches
