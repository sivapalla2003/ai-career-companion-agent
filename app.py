"""AI Career Companion Agent — Infosys Springboard 7.0 (Milestones 1 & 2) Streamlit App."""

from __future__ import annotations

import json
import os
from io import StringIO

import pandas as pd
import streamlit as st

from models.schemas import (
    CandidateProfile,
    EducationItem,
    ExperienceItem,
    InternshipPosting,
    ProjectItem,
)
from services.database import CareerDatabase
from services.evaluation import SAMPLE_PROFILES, run_evaluation_benchmark
from services.matching_agent import JobResumeMatchingAgent
from services.rag_pipeline import InternshipRAGPipeline
from services.resume_parser import (
    ResumeParseError,
    extract_text_from_file,
    parse_resume_with_gemini,
)

st.set_page_config(
    page_title="AI Career Companion Agent — Infosys Springboard 7.0",
    page_icon="🎯",
    layout="wide",
)

db = CareerDatabase("career_companion.db")
rag = InternshipRAGPipeline(data_path="data/internships.json", vector_dir="data/vector_store")
agent = JobResumeMatchingAgent(rag_pipeline=rag)

# Seed sample profiles into SQLite on first run so evaluators can test immediately
if not db.list_profiles():
    for _, _, sample in SAMPLE_PROFILES:
        db.save_profile(sample)

st.title("AI Career Companion Agent")
st.caption(
    "Infosys Springboard 7.0 Internship Project — Milestone 1 (Resume Parser & Student Profile) "
    "& Milestone 2 (RAG Knowledge Base, Job-Resume Matching Agent, Evaluation Suite)"
)

if not os.environ.get("GEMINI_API_KEY"):
    st.warning(
        "GEMINI_API_KEY environment variable is not set. Set `export GEMINI_API_KEY=...` "
        "to enable live Gemini parsing, `gemini-embedding-001` indexing, and matching."
    )

tab1, tab2, tab3, tab4, tab5 = st.tabs(
    [
        "1. Student Profile & Resume Parser",
        "2. Internship Knowledge Base & RAG Index",
        "3. Job-Resume Matching Agent",
        "4. Evaluation & Validation Suite",
        "5. Architecture & Tech Stack",
    ]
)

# ---------------------------------------------------------------------------
# TAB 1: Student Profile & Resume Parser (Milestone 1)
# ---------------------------------------------------------------------------
with tab1:
    st.header("Student Profile & Structured Resume Parser (Milestone 1)")
    col_in, col_saved = st.columns([3, 2])

    with col_in:
        st.subheader("Upload or Paste Resume")
        uploaded = st.file_uploader("Upload PDF, DOCX, or TXT resume", type=["pdf", "docx", "txt"])
        pasted_text = st.text_area(
            "Or paste raw resume text",
            height=200,
            placeholder="Paste student resume text here (education, skills, projects, internships)...",
        )

        if st.button("Parse Resume with Gemini (gemini-4-hydrogen)", type="primary"):
            try:
                raw_text = (
                    extract_text_from_file(uploaded.read(), uploaded.name)
                    if uploaded is not None
                    else pasted_text.strip()
                )
                with st.spinner("Extracting structured CandidateProfile JSON via Gemini..."):
                    parsed_profile = parse_resume_with_gemini(raw_text)
                st.session_state["draft_profile"] = parsed_profile.model_dump()
                st.success(f"Parsed profile for {parsed_profile.full_name}. Review and save below.")
            except ResumeParseError as exc:
                st.error(str(exc))
            except Exception as exc:
                st.error(f"Unexpected parsing error: {exc}")

    with col_saved:
        st.subheader("Saved Student Profiles (SQLite)")
        saved_profiles = db.list_profiles()
        if saved_profiles:
            selected_load = st.selectbox(
                "Load existing profile into editor",
                options=saved_profiles,
                format_func=lambda p: f"{p.full_name} ({p.student_id})",
            )
            c_load, c_del = st.columns(2)
            with c_load:
                if st.button("Load Selected Profile", use_container_width=True):
                    st.session_state["draft_profile"] = selected_load.model_dump()
                    st.rerun()
            with c_del:
                if st.button("Delete Selected", use_container_width=True):
                    db.delete_profile(selected_load.student_id)
                    st.success(f"Deleted {selected_load.student_id}")
                    st.rerun()
        else:
            st.info("No saved profiles in career_companion.db yet.")

    st.divider()
    st.subheader("Structured Candidate Profile Editor")
    draft = st.session_state.get("draft_profile") or (
        saved_profiles[0].model_dump() if saved_profiles else None
    )

    if draft:
        with st.form("profile_editor_form"):
            c1, c2, c3 = st.columns(3)
            student_id = c1.text_input("Student ID", value=draft.get("student_id", ""))
            full_name = c2.text_input("Full Name", value=draft.get("full_name", ""))
            email = c3.text_input("Email", value=draft.get("email", ""))

            skills_csv = st.text_input(
                "Technical Skills (comma-separated)",
                value=", ".join(draft.get("skills", [])),
            )
            roles_csv = st.text_input(
                "Preferred Internship Roles (comma-separated)",
                value=", ".join(draft.get("preferred_roles", [])),
            )
            certs_csv = st.text_input(
                "Certifications (comma-separated)",
                value=", ".join(draft.get("certifications", [])),
            )

            edu_json = st.text_area(
                "Education (JSON list)",
                value=json.dumps(draft.get("education", []), indent=2),
                height=120,
            )
            exp_json = st.text_area(
                "Experience (JSON list)",
                value=json.dumps(draft.get("experience", []), indent=2),
                height=140,
            )
            proj_json = st.text_area(
                "Projects (JSON list)",
                value=json.dumps(draft.get("projects", []), indent=2),
                height=140,
            )

            if st.form_submit_button("Save Profile to SQLite (career_companion.db)", type="primary"):
                try:
                    updated = CandidateProfile(
                        student_id=student_id,
                        full_name=full_name,
                        email=email,
                        skills=[s.strip() for s in skills_csv.split(",") if s.strip()],
                        preferred_roles=[r.strip() for r in roles_csv.split(",") if r.strip()],
                        certifications=[c.strip() for c in certs_csv.split(",") if c.strip()],
                        education=[EducationItem.model_validate(x) for x in json.loads(edu_json or "[]")],
                        experience=[ExperienceItem.model_validate(x) for x in json.loads(exp_json or "[]")],
                        projects=[ProjectItem.model_validate(x) for x in json.loads(proj_json or "[]")],
                    )
                    saved = db.save_profile(updated)
                    st.session_state["draft_profile"] = saved.model_dump()
                    st.success(f"Saved profile {saved.student_id} ({saved.full_name}) to career_companion.db.")
                except Exception as exc:
                    st.error(f"Validation error while saving profile: {exc}")

# ---------------------------------------------------------------------------
# TAB 2: Internship Knowledge Base & RAG Index (Milestone 2.1 & 2.2)
# ---------------------------------------------------------------------------
with tab2:
    st.header("Internship Knowledge Base & RAG Vector Index (Milestone 2.1 & 2.2)")
    postings = rag.load_internships()

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total Curated Postings", len(postings))
    m2.metric("Domains Covered", len({p.domain for p in postings}))
    m3.metric("Tech Hubs", len({p.location for p in postings}))
    m4.metric("Vector Index Status", "Ready" if rag.is_indexed() else "Not Built")

    idx_col, add_col = st.columns([1, 1])
    with idx_col:
        if st.button("Chunk, Embed (gemini-embedding-001) & Build Vector Index", type="primary"):
            progress_bar = st.progress(0.0)
            status_box = st.empty()

            def _on_progress(done: int, total: int, message: str) -> None:
                progress_bar.progress(min(1.0, done / max(1, total)))
                status_box.info(message)

            try:
                stats = rag.index_internships(postings=postings, progress_callback=_on_progress)
                st.success(
                    f"Indexed {stats['indexed_count']} postings (dim={stats['dimension']}) "
                    f"using {stats['backend']}."
                )
            except Exception as exc:
                st.error(f"Indexing failed: {exc}")

    with add_col:
        with st.expander("Add New Internship Posting to Dataset"):
            with st.form("add_posting_form"):
                new_id = st.text_input("Job ID", value=f"INT-{len(postings) + 1:03d}")
                new_title = st.text_input("Job Title", placeholder="Generative AI Research Intern")
                new_company = st.text_input("Company", placeholder="Infosys Innovation Hub")
                new_loc = st.selectbox("Location", ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Remote"])
                new_domain = st.selectbox(
                    "Domain",
                    [
                        "AI/Generative AI",
                        "Software Engineering",
                        "Data Science",
                        "Full-Stack Web Dev",
                        "Cloud/DevOps",
                        "UI/UX Design",
                        "Product/Business",
                    ],
                )
                new_req = st.text_input("Required Skills (comma-separated)", placeholder="Python, PyTorch, RAG")
                new_pref = st.text_input("Preferred Skills (comma-separated)", placeholder="ChromaDB, FastAPI")
                new_desc = st.text_area("Job Description")
                new_resp = st.text_area("Responsibilities (one per line)")
                new_edu = st.text_input("Education Requirements", value="Pursuing B.Tech/M.Tech in CS/AI")
                new_exp = st.text_input("Experience Requirements", value="1+ relevant project")
                new_qual = st.text_input("Qualifications", value="Strong analytical and coding fundamentals")

                if st.form_submit_button("Add Internship Posting"):
                    try:
                        new_posting = InternshipPosting(
                            job_id=new_id.strip(),
                            job_title=new_title.strip(),
                            company=new_company.strip(),
                            location=new_loc,
                            domain=new_domain,
                            job_description=new_desc.strip(),
                            responsibilities=[r.strip() for r in new_resp.splitlines() if r.strip()],
                            required_skills=[s.strip() for s in new_req.split(",") if s.strip()],
                            preferred_skills=[s.strip() for s in new_pref.split(",") if s.strip()],
                            qualifications=new_qual.strip(),
                            experience_requirements=new_exp.strip(),
                            education_requirements=new_edu.strip(),
                        )
                        rag.add_internship(new_posting)
                        st.success(f"Added {new_posting.job_id}: {new_posting.job_title}. Rebuild index to include it.")
                        st.rerun()
                    except Exception as exc:
                        st.error(f"Could not add posting: {exc}")

    st.divider()
    f1, f2, f3 = st.columns(3)
    domains = ["All"] + sorted({p.domain for p in postings})
    locations = ["All"] + sorted({p.location for p in postings})
    sel_domain = f1.selectbox("Filter by Domain", domains)
    sel_loc = f2.selectbox("Filter by Location", locations)
    search_q = f3.text_input("Search title, company, or skill")

    filtered = [
        p
        for p in postings
        if (sel_domain == "All" or p.domain == sel_domain)
        and (sel_loc == "All" or p.location == sel_loc)
        and (
            not search_q.strip()
            or search_q.lower() in p.job_title.lower()
            or search_q.lower() in p.company.lower()
            or any(search_q.lower() in s.lower() for s in p.required_skills)
        )
    ]

    df_jobs = pd.DataFrame(
        [
            {
                "Job ID": p.job_id,
                "Title": p.job_title,
                "Company": p.company,
                "Domain": p.domain,
                "Location": p.location,
                "Required Skills": ", ".join(p.required_skills),
                "Stipend": p.stipend,
            }
            for p in filtered
        ]
    )
    st.dataframe(df_jobs, use_container_width=True, hide_index=True)

# ---------------------------------------------------------------------------
# TAB 3: Job-Resume Matching Agent (Milestone 2.3)
# ---------------------------------------------------------------------------
with tab3:
    st.header("Job-Resume Matching Agent (Milestone 2.3)")
    profiles = db.list_profiles()
    if not profiles:
        st.info("Create and save a student profile in Tab 1 first.")
    else:
        c_prof, c_topk = st.columns([3, 1])
        chosen_profile = c_prof.selectbox(
            "Select Saved Student Profile",
            options=profiles,
            format_func=lambda p: f"{p.full_name} — {', '.join(p.preferred_roles[:2])} ({p.student_id})",
        )
        top_k = c_topk.slider("Top-K RAG Candidates", min_value=3, max_value=15, value=10)

        if st.button("Run Job-Resume Matching Agent", type="primary"):
            if not rag.is_indexed():
                st.error("Vector index is not built yet. Go to Tab 2 and click Build Vector Index.")
            else:
                try:
                    with st.spinner("Retrieving Top-K via RAG and scoring with gemini-4-hydrogen..."):
                        results = agent.match_candidate(chosen_profile, top_k=top_k)
                        db.save_match_run(chosen_profile.student_id, results, top_k=top_k)
                    st.session_state["latest_matches"] = results
                except Exception as exc:
                    st.error(f"Matching Agent error: {exc}")

        results = st.session_state.get("latest_matches", [])
        for rank, res in enumerate(results, start=1):
            with st.container(border=True):
                h1, h2 = st.columns([4, 1])
                h1.subheader(f"#{rank} {res.job_title} — {res.company}")
                h1.caption(
                    f"{res.job_id} · {res.domain} · {res.location} · "
                    f"RAG Cosine Similarity: {res.semantic_similarity:.2f}"
                )
                h2.metric("Match Score", f"{res.match_score}%", delta=res.recommendation_tier)

                s1, s2 = st.columns(2)
                s1.markdown(f"**Matched Skills:** {', '.join(res.matched_skills) or 'None'}")
                s2.markdown(f"**Missing Skills:** {', '.join(res.missing_skills) or 'None'}")
                st.markdown(
                    f"**Education Match:** {res.education_match} | "
                    f"**Experience Match:** {res.experience_match}"
                )
                st.write(res.reasoning)

# ---------------------------------------------------------------------------
# TAB 4: Evaluation & Validation Suite (Milestone 2.4)
# ---------------------------------------------------------------------------
with tab4:
    st.header("Evaluation & Validation Suite (Milestone 2.4)")
    st.write(
        "Benchmarks retrieval relevance (Domain Precision@K), score consistency, and skill-matching "
        "accuracy across 4 diverse student personas: AI/ML Engineer, Frontend React Developer, "
        "Data Analyst, and Business/Product Intern."
    )

    with st.expander("Inspect Pre-loaded Evaluation Profiles (4 Personas)"):
        for track, _, prof in SAMPLE_PROFILES:
            st.markdown(
                f"- **{prof.full_name}** ({track}): `{', '.join(prof.skills[:8])}`"
            )

    if st.button("Run Evaluation Benchmark", type="primary"):
        if not rag.is_indexed():
            st.error("Build the RAG vector index in Tab 2 before running the benchmark.")
        else:
            pbar = st.progress(0.0)
            pstatus = st.empty()

            def _eval_progress(done: int, total: int, msg: str) -> None:
                pbar.progress(min(1.0, done / max(1, total)))
                pstatus.info(msg)

            try:
                rows, detailed = run_evaluation_benchmark(
                    rag_pipeline=rag,
                    matching_agent=agent,
                    top_k=8,
                    progress_callback=_eval_progress,
                )
                st.session_state["eval_rows"] = [r.model_dump() for r in rows]
                st.session_state["eval_detailed"] = {
                    k: [m.model_dump() for m in v] for k, v in detailed.items()
                }
            except Exception as exc:
                st.error(f"Evaluation benchmark failed: {exc}")

    eval_rows = st.session_state.get("eval_rows")
    if eval_rows:
        df_eval = pd.DataFrame(eval_rows)
        st.dataframe(df_eval, use_container_width=True, hide_index=True)

        csv_buf = StringIO()
        df_eval.to_csv(csv_buf, index=False)
        json_str = json.dumps(
            {
                "summary": eval_rows,
                "detailed_matches": st.session_state.get("eval_detailed", {}),
            },
            indent=2,
        )
        d1, d2 = st.columns(2)
        d1.download_button(
            "Download evaluation_report.csv",
            data=csv_buf.getvalue(),
            file_name="evaluation_report.csv",
            mime="text/csv",
        )
        d2.download_button(
            "Download evaluation_report.json",
            data=json_str,
            file_name="evaluation_report.json",
            mime="application/json",
        )

# ---------------------------------------------------------------------------
# TAB 5: Architecture & Tech Stack
# ---------------------------------------------------------------------------
with tab5:
    st.header("Multi-Agent System Architecture & Tech Stack")
    st.markdown(
        """
```
+-------------------------------------------------------------------------+
|                 AI Career Companion Agent (Streamlit / API)             |
+------------------------------------+------------------------------------+
                                     |
          +--------------------------+--------------------------+
          v                                                     v
+---------------------------+                         +---------------------------+
|  Milestone 1: Ingestion   |                         | Milestone 2.1 & 2.2: RAG  |
|  - PDF/DOCX/TXT Extractor |                         | - 160 Curated Postings    |
|  - Gemini 4 Hydrogen      |                         | - Semantic Chunker        |
|    (response_schema)      |                         | - gemini-embedding-001    |
|  - SQLite Profile Store   |                         | - ChromaDB / NumPy Index  |
+-------------+-------------+                         +-------------+-------------+
              |                                                     |
              +--------------------------+--------------------------+
                                         v
                      +-------------------------------------+
                      | Milestone 2.3: Matching Agent       |
                      | - Cosine Top-K Retrieval            |
                      | - Gemini Structured Scoring (0-100) |
                      | - Skill Gap & Tier Reasoning        |
                      +------------------+------------------+
                                         |
          +---------------+--------------+---------------+---------------+
          v               v              v               v               v
   [Skill Gap      [Resume Tailor  [Cover Letter   [Mock Interview [Career Chat
     Agent]            Agent]          Agent]           Agent]        Assistant]
```
"""
    )

    st.subheader("Multi-Agent Role Definitions")
    agent_defs = pd.DataFrame(
        [
            {
                "Agent": "Job-Resume Matching Agent",
                "Milestone": "Milestone 2 (Implemented)",
                "Primary Responsibility": "Retrieves Top-K postings via RAG and performs holistic 0-100 scoring, skill matching, and fit reasoning.",
                "Model / Store": "gemini-4-hydrogen + ChromaDB / NumPy",
            },
            {
                "Agent": "Skill Gap Agent",
                "Milestone": "Milestone 3 (Planned)",
                "Primary Responsibility": "Clusters missing required skills across target internships and generates sequenced learning roadmaps.",
                "Model / Store": "gemini-4-hydrogen + Curated Syllabus",
            },
            {
                "Agent": "Resume Tailoring Agent",
                "Milestone": "Milestone 3 (Planned)",
                "Primary Responsibility": "Rewrites project bullet points and ATS keywords to align truthfully with a selected internship.",
                "Model / Store": "gemini-4-hydrogen + CandidateProfile",
            },
            {
                "Agent": "Cover Letter Agent",
                "Milestone": "Milestone 3 (Planned)",
                "Primary Responsibility": "Drafts role-specific cover letters grounded in verified student achievements and company context.",
                "Model / Store": "gemini-4-hydrogen + InternshipPosting",
            },
            {
                "Agent": "Interview Preparation Agent",
                "Milestone": "Milestone 4 (Planned)",
                "Primary Responsibility": "Conducts adaptive technical & behavioral mock interviews with rubric-based feedback.",
                "Model / Store": "gemini-4-hydrogen + Session Memory",
            },
            {
                "Agent": "Career Companion Assistant",
                "Milestone": "Milestone 4 (Planned)",
                "Primary Responsibility": "Orchestrator routing student queries across matching, skill-gap, resume, and interview tools.",
                "Model / Store": "gemini-4-hydrogen Tool Router",
            },
        ]
    )
    st.dataframe(agent_defs, use_container_width=True, hide_index=True)
