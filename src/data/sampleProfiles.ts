import type { EvaluationPersona } from '../types/career';

export const EVALUATION_PERSONAS: EvaluationPersona[] = [
  {
    track_label: 'AI/ML Engineer',
    expected_domains: ['AI/Generative AI', 'Data Science', 'Software Engineering'],
    profile: {
      student_id: 'EVAL-AIML-01',
      full_name: 'Aarav Deshmukh',
      email: 'aarav.deshmukh@iitb.ac.in',
      skills: [
        'Python',
        'PyTorch',
        'LangChain',
        'RAG',
        'Gemini API',
        'ChromaDB',
        'FAISS',
        'FastAPI',
        'Scikit-learn',
        'SQL',
        'Docker',
        'Git',
      ],
      education: [
        {
          degree: 'B.Tech in Computer Science and Engineering (AI Specialization)',
          institution: 'IIT Bombay',
          year: '2026',
          cgpa: '8.9/10',
        },
      ],
      experience: [
        {
          role: 'Research Intern - Applied NLP',
          company: 'TCS Research Bengaluru',
          duration: 'May 2025 - Jul 2025',
          highlights: [
            'Built a hybrid dense-sparse RAG retrieval pipeline over 50k technical manuals improving Recall@5 by 19%.',
            'Fine-tuned LoRA adapters for domain entity extraction using PyTorch and Hugging Face.',
          ],
        },
      ],
      projects: [
        {
          title: 'DocuMind Agentic RAG Assistant',
          tech_stack: ['Python', 'Gemini API', 'ChromaDB', 'FastAPI', 'Pydantic'],
          description:
            'Multi-document Q&A assistant with semantic chunking, citation verification, and evaluation harness.',
        },
        {
          title: 'Medical X-Ray Vision Classifier',
          tech_stack: ['PyTorch', 'OpenCV', 'MLflow', 'Docker'],
          description:
            'Trained ConvNeXt classification model reaching 0.93 AUC on chest radiograph screening.',
        },
      ],
      certifications: [
        'DeepLearning.AI Generative AI with LLMs',
        'Google Cloud Machine Learning Engineer Track',
      ],
      preferred_roles: [
        'AI/ML Engineering Intern',
        'Generative AI Intern',
        'LLM Application Developer Intern',
      ],
    },
  },
  {
    track_label: 'Frontend React Developer',
    expected_domains: ['Full-Stack Web Dev', 'UI/UX Design', 'Software Engineering'],
    profile: {
      student_id: 'EVAL-FE-02',
      full_name: 'Ananya Nair',
      email: 'ananya.nair@nitk.edu.in',
      skills: [
        'React',
        'TypeScript',
        'JavaScript',
        'Next.js',
        'Tailwind CSS',
        'HTML5',
        'CSS3',
        'Redux Toolkit',
        'REST APIs',
        'Figma',
        'Jest',
        'Git',
      ],
      education: [
        {
          degree: 'B.Tech in Information Technology',
          institution: 'NIT Surathkal',
          year: '2026',
          cgpa: '8.6/10',
        },
      ],
      experience: [
        {
          role: 'Frontend Engineering Intern',
          company: 'Zoho Corp Chennai',
          duration: 'Dec 2024 - Feb 2025',
          highlights: [
            'Migrated legacy dashboard widgets to React 19 and TypeScript, reducing bundle size by 28%.',
            'Implemented WCAG AA accessible keyboard navigation across complex data tables.',
          ],
        },
      ],
      projects: [
        {
          title: 'DesignPulse Component System',
          tech_stack: ['React', 'TypeScript', 'Tailwind CSS', 'Storybook', 'Figma'],
          description:
            'Reusable 35-component UI library with automated visual regression tests and theme tokens.',
        },
        {
          title: 'FinTrack Personal Expense Dashboard',
          tech_stack: ['Next.js', 'TypeScript', 'Recharts', 'REST APIs'],
          description:
            'Interactive budgeting web app with CSV imports and category breakdown charts.',
        },
      ],
      certifications: ['Meta Front-End Developer Professional Certificate'],
      preferred_roles: [
        'Frontend Developer Intern',
        'React.js Intern',
        'Full-Stack Web Developer Intern',
      ],
    },
  },
  {
    track_label: 'Data Analyst',
    expected_domains: ['Data Science', 'Product/Business'],
    profile: {
      student_id: 'EVAL-DA-03',
      full_name: 'Rohan Kulkarni',
      email: 'rohan.kulkarni@vit.ac.in',
      skills: [
        'SQL',
        'Python',
        'Pandas',
        'NumPy',
        'Power BI',
        'Tableau',
        'Excel',
        'Statistics',
        'A/B Testing',
        'PostgreSQL',
        'Data Visualization',
        'ETL',
      ],
      education: [
        {
          degree: 'B.Tech in Data Science and Analytics',
          institution: 'VIT Vellore',
          year: '2026',
          cgpa: '8.7/10',
        },
      ],
      experience: [
        {
          role: 'Business Intelligence Intern',
          company: 'Swiggy Analytics Pune',
          duration: 'May 2025 - Jul 2025',
          highlights: [
            'Authored complex PostgreSQL cohort queries tracking 30-day rider retention across 12 cities.',
            'Built automated Power BI executive scorecards saving 6 hours of weekly manual reporting.',
          ],
        },
      ],
      projects: [
        {
          title: 'E-Commerce Funnel & Churn Diagnostics',
          tech_stack: ['Python', 'Pandas', 'SQL', 'Tableau'],
          description:
            'Analyzed 400k checkout sessions to isolate drop-off causes and lift conversion by 4.2% in simulation.',
        },
        {
          title: 'Supply Chain Demand Forecaster',
          tech_stack: ['Python', 'Prophet', 'Excel', 'Power BI'],
          description:
            'Weekly SKU demand forecasting dashboard reducing stockout alerts across 4 regional hubs.',
        },
      ],
      certifications: [
        'Google Data Analytics Professional Certificate',
        'Microsoft Power BI Data Analyst Associate',
      ],
      preferred_roles: [
        'Data Analyst Intern',
        'Business Intelligence Intern',
        'Product Analytics Intern',
      ],
    },
  },
  {
    track_label: 'Business/Product Intern',
    expected_domains: ['Product/Business', 'UI/UX Design', 'Data Science'],
    profile: {
      student_id: 'EVAL-PM-04',
      full_name: 'Meera Krishnan',
      email: 'meera.krishnan@iimindore.ac.in',
      skills: [
        'Product Strategy',
        'PRD Writing',
        'User Research',
        'SQL',
        'Figma',
        'Jira',
        'Agile',
        'Market Analysis',
        'Excel',
        'A/B Testing',
        'Wireframing',
        'Stakeholder Management',
      ],
      education: [
        {
          degree: 'Integrated Programme in Management (BBA + MBA)',
          institution: 'IIM Indore',
          year: '2026',
          cgpa: '8.5/10',
        },
      ],
      experience: [
        {
          role: 'Product Management Intern',
          company: 'Razorpay Bengaluru',
          duration: 'Apr 2025 - Jun 2025',
          highlights: [
            'Drafted PRDs and user stories for merchant onboarding KYC flow, cutting drop-off by 11%.',
            'Conducted 25+ SMB user interviews and prioritized backlog items using RICE scoring.',
          ],
        },
      ],
      projects: [
        {
          title: 'CampusPay Split-Billing Product Teardown & Prototype',
          tech_stack: ['Figma', 'Jira', 'SQL', 'Excel'],
          description:
            'End-to-end product discovery, competitive benchmarking, KPI tree, and clickable prototype.',
        },
        {
          title: 'SaaS Pricing & Funnel Experimentation Plan',
          tech_stack: ['A/B Testing', 'Product Analytics', 'Market Analysis'],
          description:
            'Designed freemium-to-pro upgrade experiments and GTM launch playbook.',
        },
      ],
      certifications: [
        'Product School Product Management Certificate',
        'Atlassian Agile Project Management',
      ],
      preferred_roles: [
        'Product Management Intern',
        'Business Analyst Intern',
        'Product Strategy Intern',
      ],
    },
  },
];

export const SAMPLE_RESUME_TEXT = `PRIYA VENKATESH
priya.venkatesh@iiith.ac.in | Bengaluru, India | github.com/priya-v-ai

EDUCATION
B.Tech in Computer Science and Engineering — IIIT Hyderabad (2022 – 2026) | CGPA: 9.04/10

TECHNICAL SKILLS
Languages: Python, TypeScript, SQL, C++
AI & Data: PyTorch, LangChain, Gemini API, RAG, ChromaDB, FAISS, Hugging Face, Scikit-learn, Pandas
Backend & Cloud: FastAPI, Docker, PostgreSQL, REST APIs, Git, Linux

EXPERIENCE
Machine Learning Intern — Freshworks Cloud, Chennai (May 2025 – Jul 2025)
- Built a semantic ticket triage service using Gemini embeddings and FAISS, cutting manual routing time by 34%.
- Created automated Pydantic schema extraction benchmarks achieving 97.5% JSON validity across 1,200 test tickets.

PROJECTS
1. CodeSentinel PR Reviewer (Python, Gemini API, FastAPI, Docker)
   Automated pull-request reviewer detecting security regressions and generating inline test suggestions.
2. FinDoc Semantic Search Engine (Python, ChromaDB, PyTorch, Streamlit)
   Chunked and indexed 12,000 annual financial filings with hybrid reranking and citation links.

CERTIFICATIONS
- Infosys Springboard Generative AI Foundation Certification
- DeepLearning.AI Building Systems with LLM APIs

TARGET ROLES
Generative AI Engineering Intern, AI/ML Engineering Intern, LLM & RAG Systems Intern`;
