"""Deterministic generator producing 160 deduplicated Indian tech-hub internship postings."""

from __future__ import annotations

import json
from pathlib import Path

LOCATIONS = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Remote"]

COMPANIES = [
    "Infosys Innovation Hub",
    "TCS Digital Labs",
    "Wipro AI Foundry",
    "Zoho Engineering",
    "Flipkart Commerce Tech",
    "Swiggy Data Platform",
    "Razorpay FinTech",
    "Freshworks Cloud",
    "PhonePe Systems",
    "Zomato Core Tech",
    "CRED Experience Labs",
    "Zerodha Rainmatter Tech",
    "Meesho Scale Engineering",
    "Postman API Platform",
    "BrowserStack Cloud",
    "Chargebee Revenue Ops",
    "LTIMindtree NextGen",
    "HCLTech Engineering",
    "Persistent Digital",
    "Atlassian India Labs",
    "Paytm Payments Tech",
    "Ola Krutrim AI",
    "Sarvam Applied AI",
    "Gupshup Conversational AI",
    "Hasura Data Graph",
    "CleverTap Analytics",
    "Druva Cloud Security",
    "Icertis Contract AI",
    "Unacademy Product Labs",
    "Groww Wealth Tech",
    "Nykaa Retail Tech",
    "Delhivery Logistics AI",
]

DOMAIN_TEMPLATES: dict[str, dict[str, object]] = {
    "Software Engineering": {
        "count": 25,
        "titles": [
            "Software Engineering Intern",
            "Backend Engineering Intern",
            "Distributed Systems Intern",
            "Platform Software Intern",
            "API & Microservices Intern",
        ],
        "required_pool": [
            ["Python", "SQL", "REST APIs", "Git", "Data Structures"],
            ["Java", "Spring Boot", "SQL", "REST APIs", "Git"],
            ["Go", "Microservices", "PostgreSQL", "Docker", "Git"],
            ["Node.js", "TypeScript", "SQL", "REST APIs", "Unit Testing"],
            ["C++", "Linux", "Data Structures", "Algorithms", "Git"],
        ],
        "preferred_pool": [
            ["Docker", "Redis", "FastAPI", "CI/CD"],
            ["Kafka", "Kubernetes", "AWS", "JUnit"],
            ["gRPC", "Prometheus", "Linux", "Redis"],
            ["GraphQL", "Docker", "MongoDB", "Jest"],
            ["Python", "CMake", "Docker", "System Design"],
        ],
        "responsibilities": [
            "Design, implement, and test clean backend services and RESTful APIs with senior engineers.",
            "Write automated unit and integration tests achieving >80% branch coverage.",
            "Profile database queries and optimize latency-critical service endpoints.",
            "Participate in sprint ceremonies, code reviews, and technical design documentation.",
        ],
        "education": "Pursuing B.Tech / B.E. / M.Tech / MCA in Computer Science, IT, or related engineering discipline.",
        "experience": "At least 1-2 academic or personal software projects demonstrating strong DSA and API engineering.",
        "qualifications": "Strong problem-solving skills, clean coding practices, and foundational CS coursework.",
        "stipend": "₹30,000 - ₹45,000/month",
    },
    "AI/Generative AI": {
        "count": 25,
        "titles": [
            "Generative AI Engineering Intern",
            "AI/ML Engineering Intern",
            "LLM & RAG Systems Intern",
            "Applied NLP Research Intern",
            "Computer Vision & AI Intern",
        ],
        "required_pool": [
            ["Python", "PyTorch", "RAG", "LangChain", "Gemini API"],
            ["Python", "Machine Learning", "Scikit-learn", "NLP", "SQL"],
            ["Python", "LLMs", "ChromaDB", "FAISS", "FastAPI"],
            ["Python", "Deep Learning", "Transformers", "Hugging Face", "Git"],
            ["Python", "PyTorch", "OpenCV", "NumPy", "Docker"],
        ],
        "preferred_pool": [
            ["ChromaDB", "FastAPI", "Pydantic", "Docker"],
            ["PyTorch", "MLflow", "AWS", "Vector Databases"],
            ["Gemini API", "Prompt Engineering", "Streamlit", "Evaluation Metrics"],
            ["LoRA", "ONNX", "Weights & Biases", "CUDA"],
            ["TensorRT", "FastAPI", "Kubernetes", "MLOps"],
        ],
        "responsibilities": [
            "Develop semantic chunking, embedding, and vector retrieval pipelines for enterprise RAG assistants.",
            "Design structured JSON prompting workflows and automated evaluation harnesses for LLM accuracy.",
            "Fine-tune and benchmark open-weight or foundation models on domain-specific datasets.",
            "Collaborate with product engineers to deploy low-latency AI inference microservices.",
        ],
        "education": "Pursuing B.Tech / M.Tech / MS in Computer Science, AI, Data Science, or Mathematics.",
        "experience": "Hands-on AI/ML or LLM project portfolio (RAG pipelines, PyTorch training, or NLP benchmarks).",
        "qualifications": "Solid grasp of linear algebra, probability, embeddings, and modern transformer architectures.",
        "stipend": "₹35,000 - ₹55,000/month",
    },
    "Data Science": {
        "count": 24,
        "titles": [
            "Data Analyst Intern",
            "Data Science Intern",
            "Business Intelligence Intern",
            "Product Analytics Intern",
            "Decision Science Intern",
        ],
        "required_pool": [
            ["SQL", "Python", "Pandas", "Power BI", "Excel"],
            ["Python", "SQL", "Statistics", "Scikit-learn", "Data Visualization"],
            ["SQL", "PostgreSQL", "Tableau", "ETL", "Excel"],
            ["SQL", "Python", "A/B Testing", "Statistics", "Tableau"],
            ["Python", "Pandas", "NumPy", "SQL", "Forecasting"],
        ],
        "preferred_pool": [
            ["Tableau", "PostgreSQL", "A/B Testing", "ETL"],
            ["XGBoost", "BigQuery", "Airflow", "Matplotlib"],
            ["Power BI", "dbt", "Python", "Snowflake"],
            ["Looker", "Product Analytics", "Mixpanel", "R"],
            ["Prophet", "Power BI", "Spark", "AWS"],
        ],
        "responsibilities": [
            "Query multi-million-row relational warehouses using SQL to uncover conversion and retention trends.",
            "Build self-serve Power BI / Tableau dashboards with clear KPI definitions for business leaders.",
            "Design and analyze controlled A/B experiments with rigorous statistical significance checks.",
            "Clean, validate, and document recurring analytical datasets and ETL transformations.",
        ],
        "education": "Pursuing B.Tech / B.Sc / M.Sc / MBA in Data Science, Statistics, Economics, or Computer Science.",
        "experience": "Demonstrated SQL + Python/BI analytics portfolio or prior analytics internship.",
        "qualifications": "Strong quantitative reasoning, clear executive storytelling, and high attention to data quality.",
        "stipend": "₹25,000 - ₹40,000/month",
    },
    "Full-Stack Web Dev": {
        "count": 24,
        "titles": [
            "Frontend React Developer Intern",
            "Full-Stack Web Developer Intern",
            "TypeScript UI Engineering Intern",
            "Next.js Application Intern",
            "Web Platform Engineering Intern",
        ],
        "required_pool": [
            ["React", "TypeScript", "JavaScript", "Tailwind CSS", "HTML5"],
            ["React", "Node.js", "TypeScript", "PostgreSQL", "REST APIs"],
            ["Next.js", "React", "TypeScript", "CSS3", "Git"],
            ["React", "Redux Toolkit", "JavaScript", "REST APIs", "Jest"],
            ["TypeScript", "React", "Express", "MongoDB", "Tailwind CSS"],
        ],
        "preferred_pool": [
            ["Next.js", "Figma", "Jest", "Accessibility"],
            ["Docker", "Redis", "Prisma", "Tailwind CSS"],
            ["GraphQL", "Playwright", "Storybook", "Web Performance"],
            ["TypeScript", "Vite", "CI/CD", "Figma"],
            ["PostgreSQL", "Docker", "Next.js", "AWS"],
        ],
        "responsibilities": [
            "Build responsive, WCAG AA accessible React + TypeScript user interfaces from Figma specifications.",
            "Integrate REST and real-time APIs with resilient loading, empty, and error states.",
            "Optimize Core Web Vitals, bundle sizes, and component rendering performance.",
            "Maintain reusable design system primitives and automated frontend test suites.",
        ],
        "education": "Pursuing B.Tech / B.E. / BCA / MCA in Computer Science, IT, or equivalent practical portfolio.",
        "experience": "Deployed web applications on GitHub demonstrating modern React, TypeScript, and API integration.",
        "qualifications": "Strong command of browser fundamentals, state management, and responsive CSS architecture.",
        "stipend": "₹25,000 - ₹42,000/month",
    },
    "Cloud/DevOps": {
        "count": 22,
        "titles": [
            "Cloud Engineering Intern",
            "DevOps & SRE Intern",
            "Platform Infrastructure Intern",
            "Kubernetes & CI/CD Intern",
            "Cloud Security Operations Intern",
        ],
        "required_pool": [
            ["Linux", "Docker", "AWS", "Git", "Bash"],
            ["Docker", "Kubernetes", "CI/CD", "Terraform", "Linux"],
            ["GCP", "Docker", "Python", "GitHub Actions", "Networking"],
            ["Azure", "Terraform", "Linux", "Monitoring", "SQL"],
            ["Linux", "AWS", "IAM", "Docker", "Python"],
        ],
        "preferred_pool": [
            ["Kubernetes", "Terraform", "Prometheus", "Python"],
            ["Helm", "Grafana", "AWS", "ArgoCD"],
            ["Terraform", "Cloud Run", "Prometheus", "Bash"],
            ["Kubernetes", "Ansible", "GitLab CI", "Go"],
            ["SIEM", "Kubernetes", "Terraform", "CloudWatch"],
        ],
        "responsibilities": [
            "Containerize backend and AI services using Docker and automate CI/CD build/test pipelines.",
            "Author reusable Terraform infrastructure-as-code modules for staging and sandbox environments.",
            "Configure structured logging, Prometheus metrics, and latency/error alerting dashboards.",
            "Assist SRE engineers with deployment runbooks, security hardening, and cost optimization.",
        ],
        "education": "Pursuing B.Tech / B.E. / M.Tech in Computer Science, Electronics, or Cloud Computing.",
        "experience": "Hands-on Linux administration, Docker containerization, or cloud lab deployments.",
        "qualifications": "Familiarity with networking fundamentals, version control workflows, and automation scripting.",
        "stipend": "₹28,000 - ₹45,000/month",
    },
    "UI/UX Design": {
        "count": 20,
        "titles": [
            "UI/UX Design Intern",
            "Product Design Intern",
            "Design Systems Intern",
            "UX Research & Prototyping Intern",
        ],
        "required_pool": [
            ["Figma", "Wireframing", "Prototyping", "User Research", "Design Systems"],
            ["Figma", "Interaction Design", "Usability Testing", "Information Architecture", "Typography"],
            ["Figma", "Auto Layout", "Accessibility", "HTML5", "CSS3"],
            ["User Research", "Figma", "Journey Mapping", "Prototyping", "A/B Testing"],
        ],
        "preferred_pool": [
            ["HTML5", "CSS3", "Tailwind CSS", "Micro-interactions"],
            ["Design Tokens", "Storybook", "Framer", "Analytics"],
            ["React", "TypeScript", "WCAG", "Visual Design"],
            ["Maze", "Notion", "Jira", "Product Strategy"],
        ],
        "responsibilities": [
            "Translate ambiguous product briefs into user flows, low-fidelity wireframes, and interactive Figma prototypes.",
            "Conduct moderated usability testing sessions and synthesize findings into prioritized UX fixes.",
            "Maintain consistent typography, spacing tokens, and WCAG AA contrast across web and mobile surfaces.",
            "Partner closely with frontend engineers during design handoff and QA review.",
        ],
        "education": "Pursuing B.Des / M.Des / B.Tech / BA in Human-Computer Interaction, Design, or related field.",
        "experience": "Curated design portfolio featuring 2+ end-to-end UX case studies with measurable outcomes.",
        "qualifications": "Strong visual hierarchy taste, user empathy, and structured design critique communication.",
        "stipend": "₹22,000 - ₹36,000/month",
    },
    "Product/Business": {
        "count": 20,
        "titles": [
            "Product Management Intern",
            "Business Analyst Intern",
            "Product Strategy Intern",
            "Growth & Product Operations Intern",
        ],
        "required_pool": [
            ["Product Strategy", "PRD Writing", "User Research", "SQL", "Agile"],
            ["Market Analysis", "Excel", "SQL", "Stakeholder Management", "Jira"],
            ["PRD Writing", "Wireframing", "A/B Testing", "Figma", "Product Analytics"],
            ["Agile", "Jira", "Excel", "User Research", "Data Visualization"],
        ],
        "preferred_pool": [
            ["Figma", "A/B Testing", "Jira", "Power BI"],
            ["Tableau", "Python", "Financial Modeling", "Agile"],
            ["SQL", "RICE Prioritization", "Mixpanel", "GTM Strategy"],
            ["Power BI", "SQL", "Product Strategy", "CRM"],
        ],
        "responsibilities": [
            "Author crisp Product Requirements Documents (PRDs), user stories, and acceptance criteria.",
            "Analyze funnel metrics, cohort retention, and competitor benchmarks to prioritize roadmap items.",
            "Coordinate sprint planning and UAT sign-off with engineering, design, and QA stakeholders.",
            "Synthesize customer interviews and support tickets into actionable product improvement hypotheses.",
        ],
        "education": "Pursuing MBA / BBA / B.Tech / Integrated Management from a recognized university.",
        "experience": "Prior product teardown, case competition finalist, startup internship, or campus leadership.",
        "qualifications": "Structured analytical thinking, crisp written communication, and cross-functional ownership.",
        "stipend": "₹25,000 - ₹40,000/month",
    },
}

FOCUS_AREAS = [
    "core platform reliability and high-throughput APIs",
    "enterprise customer onboarding and workflow automation",
    "real-time telemetry and developer productivity tooling",
    "consumer mobile commerce and personalization journeys",
    "fintech payments compliance and merchant self-service",
    "multi-tenant cloud SaaS collaboration experiences",
    "AI-assisted search, discovery, and knowledge retrieval",
    "supply-chain visibility and operational forecasting",
]


def generate_internships() -> list[dict[str, object]]:
    """Generate exactly 160 unique, deduplicated, clean internship records."""
    postings: list[dict[str, object]] = []
    seen_keys: set[tuple[str, str, str]] = set()
    job_counter = 1
    company_idx = 0

    for domain, cfg in DOMAIN_TEMPLATES.items():
        count: int = cfg["count"]  # type: ignore[assignment]
        titles: list[str] = cfg["titles"]  # type: ignore[assignment]
        req_pool: list[list[str]] = cfg["required_pool"]  # type: ignore[assignment]
        pref_pool: list[list[str]] = cfg["preferred_pool"]  # type: ignore[assignment]
        responsibilities: list[str] = cfg["responsibilities"]  # type: ignore[assignment]

        for i in range(count):
            title = titles[i % len(titles)]
            location = LOCATIONS[(job_counter + i) % len(LOCATIONS)]
            company = COMPANIES[company_idx % len(COMPANIES)]
            company_idx += 1

            # Ensure strict deduplication across (job_title, company, location)
            attempts = 0
            while (title, company, location) in seen_keys and attempts < len(COMPANIES):
                company = COMPANIES[company_idx % len(COMPANIES)]
                company_idx += 1
                attempts += 1
            seen_keys.add((title, company, location))

            req_skills = req_pool[i % len(req_pool)]
            pref_skills = pref_pool[i % len(pref_pool)]
            focus = FOCUS_AREAS[(job_counter + i) % len(FOCUS_AREAS)]
            duration = "6 Months" if (job_counter % 3 != 0) else "3 Months (Summer/Winter)"

            description = (
                f"Join {company} in {location} as a {title} within our {domain} group. "
                f"You will work alongside mentors on {focus}, contributing production deliverables "
                f"using {', '.join(req_skills[:3])} while gaining hands-on exposure to {', '.join(pref_skills[:2])}."
            )

            postings.append(
                {
                    "job_id": f"INT-{job_counter:03d}",
                    "job_title": title,
                    "company": company,
                    "location": location,
                    "domain": domain,
                    "stipend": cfg["stipend"],
                    "duration": duration,
                    "job_description": description,
                    "responsibilities": responsibilities,
                    "required_skills": req_skills,
                    "preferred_skills": pref_skills,
                    "qualifications": cfg["qualifications"],
                    "experience_requirements": cfg["experience"],
                    "education_requirements": cfg["education"],
                }
            )
            job_counter += 1

    assert len(postings) == 160, f"Expected 160 internships, got {len(postings)}"
    return postings


def main() -> None:
    out_path = Path("data/internships.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    records = generate_internships()
    out_path.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {len(records)} deduplicated internship postings at {out_path}")


if __name__ == "__main__":
    main()
