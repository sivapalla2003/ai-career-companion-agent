import type {
  DefectTrackerRow,
  ImpedimentRow,
  ProductBacklogRow,
  RetrospectiveRow,
  SprintTaskRow,
  UnitTestCaseRow,
} from '../types/career';

export const UNIT_TEST_PLAN_DATA: UnitTestCaseRow[] = [
  {
    sl_no: 1,
    test_case_name: 'UT-01: Resume PDF & TXT Text Extraction',
    test_procedure:
      'Upload a valid multi-section student resume PDF (and TXT file) via services/resume_parser.py extract_text_from_file().',
    condition_to_be_tested:
      'File has readable text >= 30 chars, valid extension (.pdf/.txt/.docx), and UTF-8 content.',
    expected_result:
      'Clean raw text extracted without truncation or encoding errors; preserves Education, Skills, and Projects sections.',
    actual_result:
      'Passed — Extracted full text (1,480 chars) cleanly across PDF and TXT test fixtures.',
  },
  {
    sl_no: 2,
    test_case_name: 'UT-02: Empty & Corrupt Resume File Rejection',
    test_procedure:
      'Submit a 0-byte file, an unsupported .exe/.png file, and a corrupted byte stream claiming .pdf extension.',
    condition_to_be_tested:
      'Invalid or empty input triggers ResumeParseError before any Gemini API call is issued.',
    expected_result:
      'Explicit human-readable error returned (HTTP 400 / UI banner); zero unhandled exceptions or wasted API calls.',
    actual_result:
      'Passed — All 3 malformed fixtures rejected cleanly with descriptive validation messages.',
  },
  {
    sl_no: 3,
    test_case_name: 'UT-03: Gemini Structured CandidateProfile Extraction',
    test_procedure:
      'Invoke parse_resume_with_gemini() using gemini-4-hydrogen with response_schema=CandidateProfile.',
    condition_to_be_tested:
      'Output strictly conforms to Pydantic CandidateProfile (skills deduplicated, education/projects arrays valid).',
    expected_result:
      'Valid JSON parsed into CandidateProfile with non-empty full_name, normalized skills list, and inferred preferred_roles.',
    actual_result:
      'Passed — 100% Pydantic schema validity across 5 diverse sample resumes.',
  },
  {
    sl_no: 4,
    test_case_name: 'UT-04: SQLite Profile CRUD Persistence',
    test_procedure:
      'Save a parsed profile, edit skills & email, save again, reload app, then delete a test record in career_companion.db.',
    condition_to_be_tested:
      'UPSERT updates existing student_id without duplicating rows; data persists across server restarts.',
    expected_result:
      'Updated profile persists in student_profiles table; deleted record is cleanly removed.',
    actual_result:
      'Passed — Verified create, read, update, reload persistence, and delete against career_companion.db.',
  },
  {
    sl_no: 5,
    test_case_name: 'UT-05: 160-Internship Dataset Integrity & Deduplication',
    test_procedure:
      'Run scripts/generate_dataset.py and validate data/internships.json against InternshipPosting schema.',
    condition_to_be_tested:
      'Exactly 160 records, unique job_id (INT-001..INT-160), unique (job_title, company, location), 7 domains, 5 hubs.',
    expected_result:
      'All 160 records pass Pydantic validation with 0 duplicates and balanced Indian tech-hub distribution.',
    actual_result:
      'Passed — 160 unique postings generated across Bengaluru, Hyderabad, Pune, Chennai, and Remote.',
  },
  {
    sl_no: 6,
    test_case_name: 'UT-06: Knowledge Base Filtering & Add New Posting',
    test_procedure:
      'Filter internships by Domain="AI/Generative AI" and Location="Bengaluru", then submit a new internship posting form.',
    condition_to_be_tested:
      'Filter reduces table accurately; valid new posting increments dataset count to 161; invalid form is blocked.',
    expected_result:
      'Filtered table displays only matching rows; new posting persists to data/internships.json and appears immediately.',
    actual_result:
      'Passed — Domain/location/search filters and posting creation validated end-to-end.',
  },
  {
    sl_no: 7,
    test_case_name: 'UT-07: Semantic Chunking & gemini-embedding-001 Vector Indexing',
    test_procedure:
      'Trigger RAG pipeline index_internships() across all 160 postings and verify persisted vector store.',
    condition_to_be_tested:
      'Every posting generates a structured text chunk and normalized dense embedding vector stored locally.',
    expected_result:
      'Index reports 160 indexed chunks, consistent embedding dimension, and ready status.',
    actual_result:
      'Passed — 160 chunks embedded in batches of 32 with progress updates and persisted cleanly.',
  },
  {
    sl_no: 8,
    test_case_name: 'UT-08: Cosine Similarity Top-K Semantic Retrieval',
    test_procedure:
      'Query retrieve_top_k(profile, top_k=10) with Aarav Deshmukh (AI/ML) and Ananya Nair (React Frontend).',
    condition_to_be_tested:
      'Cosine similarity stays in [0.0, 1.0], results sorted descending, >=70% of Top-K match candidate domain.',
    expected_result:
      'AI/ML profile retrieves AI/Generative AI & Data Science roles; React profile retrieves Full-Stack Web roles.',
    actual_result:
      'Passed — Domain Precision@8 achieved >=87.5% across test profiles.',
  },
  {
    sl_no: 9,
    test_case_name: 'UT-09: Job-Resume Matching Agent Scoring & Tier Classification',
    test_procedure:
      'Run JobResumeMatchingAgent.match_candidate() and verify classifyTier() thresholds (>=80 Strong, 62-79 Good, <62 Stretch).',
    condition_to_be_tested:
      'Results sorted descending by match_score (0-100 int); matched_skills & missing_skills grounded in profile/JD.',
    expected_result:
      'Structured MatchResult list returned with deterministic tiers, education/experience alignment, and clear reasoning.',
    actual_result:
      'Passed — Unit test assertions and live Matching Agent runs confirmed exact ordering and tier mapping.',
  },
  {
    sl_no: 10,
    test_case_name: 'UT-10: 4-Persona Evaluation Benchmark & CSV/JSON Export',
    test_procedure:
      'Execute Evaluation Suite across all 4 pre-loaded personas and download evaluation_report.csv and evaluation_report.json.',
    condition_to_be_tested:
      'All 4 tracks evaluated (AI/ML, Frontend React, Data Analyst, Business/Product); CSV properly escapes commas/quotes.',
    expected_result:
      'Benchmark table computes Precision@K, Avg Score, Score StdDev, and Skill Accuracy; downloads valid CSV & JSON.',
    actual_result:
      'Passed — All 4 personas benchmarked and RFC-4180 CSV/JSON exports verified.',
  },
];

export const DEFECT_TRACKER_DATA: DefectTrackerRow[] = [
  {
    sl_no: 1,
    submitted_by: 'QA Lead (Springboard Team)',
    submitted_date: '2026-10-18',
    description:
      'Uploading a 0-byte or password-protected PDF caused pypdf PdfReader to raise an uncaught PdfReadError crashing the parser view.',
    detected_sprint: 'Sprint 1',
    assigned_to: 'Backend Developer',
    type_of_defect: 'Logical',
    action_taken:
      'Added upfront byte-length validation, minimum 30-character check, and wrapped PdfReader in ResumeParseError with user-friendly message.',
    action_taken_date: '2026-10-19',
    status: 'Closed',
    remarks: 'Verified with UT-02 empty and corrupt PDF fixtures.',
  },
  {
    sl_no: 2,
    submitted_by: 'ML Engineer',
    submitted_date: '2026-10-21',
    description:
      'Duplicate skill casing variants (e.g., "React.js", "react", "React") skewed skill overlap counts during profile saving.',
    detected_sprint: 'Sprint 1',
    assigned_to: 'AI/ML Developer',
    type_of_defect: 'Standards',
    action_taken:
      'Added Pydantic field_validator deduplication and normalizeSkill() helper stripping .js suffixes and normalizing whitespace/case.',
    action_taken_date: '2026-10-22',
    status: 'Closed',
    remarks: 'Covered by automated unit test assertions.',
  },
  {
    sl_no: 3,
    submitted_by: 'Data Engineer',
    submitted_date: '2026-10-26',
    description:
      'Initial dataset generator produced 4 duplicate (job_title, company, location) combinations when cycling company names.',
    detected_sprint: 'Sprint 2',
    assigned_to: 'Data Engineer',
    type_of_defect: 'Logical',
    action_taken:
      'Implemented seen_keys tuple tracking in scripts/generate_dataset.py with collision advancement and strict 160-record assertion.',
    action_taken_date: '2026-10-27',
    status: 'Closed',
    remarks: 'Re-ran generator; 0 duplicates confirmed across all 160 postings.',
  },
  {
    sl_no: 4,
    submitted_by: 'AI/ML Developer',
    submitted_date: '2026-10-30',
    description:
      'Embedding all 160 internship chunks in a single API call occasionally hit payload/rate-limit spikes.',
    detected_sprint: 'Sprint 2',
    assigned_to: 'AI/ML Developer',
    type_of_defect: 'Maintainability',
    action_taken:
      'Refactored RAG indexing to process batches of 32 chunks with exponential backoff retry and live progress callbacks.',
    action_taken_date: '2026-10-31',
    status: 'Closed',
    remarks: 'Indexing completes smoothly with incremental progress reporting.',
  },
  {
    sl_no: 5,
    submitted_by: 'QA Lead (Springboard Team)',
    submitted_date: '2026-11-03',
    description:
      'Matching Agent occasionally returned recommendation_tier "Good Fit" for scores of 81 due to LLM boundary drift.',
    detected_sprint: 'Sprint 2',
    assigned_to: 'Backend Developer',
    type_of_defect: 'Logical',
    action_taken:
      'Enforced deterministic post-processing via classifyTier(match_score) (>=80 Strong Match, 62-79 Good Fit, <62 Stretch Role) and descending sort.',
    action_taken_date: '2026-11-04',
    status: 'Closed',
    remarks: '100% consistent tier mapping verified in UT-09.',
  },
  {
    sl_no: 6,
    submitted_by: 'Frontend Developer',
    submitted_date: '2026-11-07',
    description:
      'Long required_skills lists caused horizontal table overflow on 390px mobile viewports in the Knowledge Base tab.',
    detected_sprint: 'Sprint 2',
    assigned_to: 'Frontend Developer',
    type_of_defect: 'User Interface',
    action_taken:
      'Wrapped table in responsive overflow-x-auto container with compact tabular typography and collapsible mobile navigation drawer.',
    action_taken_date: '2026-11-08',
    status: 'Closed',
    remarks: 'Verified on 390x844 and 1440x900 viewports.',
  },
  {
    sl_no: 7,
    submitted_by: 'QA Lead (Springboard Team)',
    submitted_date: '2026-11-11',
    description:
      'Exported evaluation_report.csv split columns incorrectly when job titles or company fields contained commas.',
    detected_sprint: 'Sprint 2',
    assigned_to: 'Backend Developer',
    type_of_defect: 'Standards',
    action_taken:
      'Implemented RFC-4180 compliant serializeToCsv() escaping quotes, commas, and newlines uniformly across all CSV downloads.',
    action_taken_date: '2026-11-12',
    status: 'Closed',
    remarks: 'Verified in Excel, Google Sheets, and unit tests.',
  },
  {
    sl_no: 8,
    submitted_by: 'Mentor Reviewer',
    submitted_date: '2026-11-15',
    description:
      'Add optional FastAPI entrypoint alongside Streamlit app.py so Milestone 3 downstream agents can call REST endpoints directly.',
    detected_sprint: 'Sprint 2',
    assigned_to: 'Backend Developer',
    type_of_defect: 'Others',
    action_taken:
      'Added api.py wrapping the shared modular services (resume_parser, rag_pipeline, matching_agent, evaluation) with CORS and OpenAPI docs.',
    action_taken_date: '2026-11-16',
    status: 'Closed',
    remarks: 'Both streamlit run app.py and uvicorn api:app share identical service modules.',
  },
];

export const AGILE_PRODUCT_BACKLOG: ProductBacklogRow[] = [
  {
    planned_sprint: 'Sprint 1',
    actual_sprint: 'Sprint 1',
    us_id: 'US-01',
    user_story_description:
      'As a student, I want to upload my PDF/DOCX/TXT resume or paste resume text so the system can extract raw text reliably.',
    moscow: 'Must Have',
    dependency: 'None',
    assignee: 'Backend Developer',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 1',
    actual_sprint: 'Sprint 1',
    us_id: 'US-02',
    user_story_description:
      'As a student, I want Gemini (gemini-4-hydrogen) to parse my resume into a strict CandidateProfile JSON schema (skills, education, projects, experience).',
    moscow: 'Must Have',
    dependency: 'US-01',
    assignee: 'AI/ML Developer',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 1',
    actual_sprint: 'Sprint 1',
    us_id: 'US-03',
    user_story_description:
      'As a student, I want to manually review, edit, and persist my structured profile in SQLite (career_companion.db) so my data is saved across sessions.',
    moscow: 'Must Have',
    dependency: 'US-02',
    assignee: 'Full-Stack Developer',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 1',
    actual_sprint: 'Sprint 1',
    us_id: 'US-04',
    user_story_description:
      'As a mentor/evaluator, I want a clean multi-tab web UI shell with Architecture & Tech Stack documentation for Milestone 1 sign-off.',
    moscow: 'Must Have',
    dependency: 'US-03',
    assignee: 'Frontend Developer',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 2',
    actual_sprint: 'Sprint 2',
    us_id: 'US-05',
    user_story_description:
      'As an admin, I want a curated, deduplicated dataset of 160 realistic Indian tech-hub internships across 7 domains with search, filter, and add-posting support.',
    moscow: 'Must Have',
    dependency: 'None',
    assignee: 'Data Engineer',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 2',
    actual_sprint: 'Sprint 2',
    us_id: 'US-06',
    user_story_description:
      'As the system, I want to chunk all internship postings and embed them using gemini-embedding-001 into a persistent local vector store (ChromaDB / NumPy cosine).',
    moscow: 'Must Have',
    dependency: 'US-05',
    assignee: 'AI/ML Developer',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 2',
    actual_sprint: 'Sprint 2',
    us_id: 'US-07',
    user_story_description:
      'As a student, I want the Job-Resume Matching Agent to retrieve Top-K semantic postings and score (0-100%) each role with matched skills, missing skills, and reasoning.',
    moscow: 'Must Have',
    dependency: 'US-03, US-06',
    assignee: 'AI/ML Developer',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 2',
    actual_sprint: 'Sprint 2',
    us_id: 'US-08',
    user_story_description:
      'As a QA/mentor reviewer, I want an automated Evaluation & Validation Suite testing 4 diverse sample personas with downloadable CSV and JSON reports.',
    moscow: 'Must Have',
    dependency: 'US-07',
    assignee: 'QA Lead',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 2',
    actual_sprint: 'Sprint 2',
    us_id: 'US-09',
    user_story_description:
      'As a developer, I want modular Python backend services runnable via both Streamlit (app.py) and FastAPI (api.py) with strict Pydantic schemas.',
    moscow: 'Should Have',
    dependency: 'US-07',
    assignee: 'Backend Developer',
    status: 'Completed',
  },
  {
    planned_sprint: 'Sprint 3',
    actual_sprint: 'Planned',
    us_id: 'US-10',
    user_story_description:
      'As a student, I want a Skill Gap Agent that generates a personalized learning roadmap from missing required skills.',
    moscow: 'Should Have',
    dependency: 'US-07',
    assignee: 'AI/ML Developer',
    status: 'Planned',
  },
  {
    planned_sprint: 'Sprint 3',
    actual_sprint: 'Planned',
    us_id: 'US-11',
    user_story_description:
      'As a student, I want a Resume Tailoring & Cover Letter Agent grounded in my verified projects for any matched internship.',
    moscow: 'Could Have',
    dependency: 'US-07',
    assignee: 'AI/ML Developer',
    status: 'Planned',
  },
  {
    planned_sprint: 'Sprint 4',
    actual_sprint: 'Planned',
    us_id: 'US-12',
    user_story_description:
      'As a student, I want an interactive Mock Interview Agent that asks role-specific technical and behavioral questions with rubric feedback.',
    moscow: 'Could Have',
    dependency: 'US-10',
    assignee: 'Full-Stack Developer',
    status: 'Planned',
  },
];

export const AGILE_SPRINT1_BACKLOG: SprintTaskRow[] = [
  {
    us_id: 'US-01',
    task_id: 'T-101',
    task_description:
      'Define Pydantic v2 schemas in models/schemas.py (CandidateProfile, InternshipPosting, MatchResult)',
    task_start_date: '2026-10-12',
    task_completion_date: '2026-10-13',
    team_member: 'Backend Developer',
    activity: 'Design',
    status: 'Completed',
    original_estimate_hours: 6,
    daily_remaining: [6, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    us_id: 'US-01',
    task_id: 'T-102',
    task_description:
      'Implement PDF/DOCX/TXT text extractor with empty & corrupt file validation in services/resume_parser.py',
    task_start_date: '2026-10-13',
    task_completion_date: '2026-10-15',
    team_member: 'Backend Developer',
    activity: 'Development',
    status: 'Completed',
    original_estimate_hours: 8,
    daily_remaining: [8, 8, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    us_id: 'US-02',
    task_id: 'T-103',
    task_description:
      'Integrate google-genai SDK (gemini-4-hydrogen) with strict response_schema=CandidateProfile and retry logic',
    task_start_date: '2026-10-15',
    task_completion_date: '2026-10-18',
    team_member: 'AI/ML Developer',
    activity: 'Development',
    status: 'Completed',
    original_estimate_hours: 10,
    daily_remaining: [10, 10, 10, 10, 7, 4, 1, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    us_id: 'US-03',
    task_id: 'T-104',
    task_description:
      'Build SQLite persistence layer (career_companion.db) with CRUD operations for student_profiles and match_history',
    task_start_date: '2026-10-17',
    task_completion_date: '2026-10-19',
    team_member: 'Backend Developer',
    activity: 'Development',
    status: 'Completed',
    original_estimate_hours: 8,
    daily_remaining: [8, 8, 8, 8, 8, 8, 5, 2, 0, 0, 0, 0, 0, 0],
  },
  {
    us_id: 'US-03',
    task_id: 'T-105',
    task_description:
      'Develop Tab 1 UI: Resume uploader, text paste area, structured CandidateProfile editor, and saved profile switcher',
    task_start_date: '2026-10-19',
    task_completion_date: '2026-10-22',
    team_member: 'Frontend Developer',
    activity: 'Development',
    status: 'Completed',
    original_estimate_hours: 12,
    daily_remaining: [12, 12, 12, 12, 12, 12, 12, 12, 9, 5, 2, 0, 0, 0],
  },
  {
    us_id: 'US-04',
    task_id: 'T-106',
    task_description:
      'Design Multi-Agent System Architecture diagram (Mermaid/ASCII) and 6-agent role definitions table for Tab 5',
    task_start_date: '2026-10-21',
    task_completion_date: '2026-10-23',
    team_member: 'Frontend Developer',
    activity: 'Documentation',
    status: 'Completed',
    original_estimate_hours: 6,
    daily_remaining: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3, 1, 0, 0],
  },
  {
    us_id: 'US-01',
    task_id: 'T-107',
    task_description:
      'Author and execute Milestone 1 Unit Tests (UT-01 through UT-04) and log Sprint 1 defects',
    task_start_date: '2026-10-23',
    task_completion_date: '2026-10-25',
    team_member: 'QA Lead',
    activity: 'Testing',
    status: 'Completed',
    original_estimate_hours: 8,
    daily_remaining: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 0],
  },
];

export const AGILE_IMPEDIMENTS: ImpedimentRow[] = [
  {
    sprint: 'Sprint 1',
    day: 'Day 4',
    impediments:
      'Scanned PDF resumes with embedded images returned blank text from pypdf causing Gemini extraction errors.',
    action_taken:
      'Added explicit minimum-length validation with clear paste-text guidance in Python and native PDF multimodal inlineData parsing in the web server.',
  },
  {
    sprint: 'Sprint 1',
    day: 'Day 8',
    impediments:
      'Inconsistent skill naming in raw resumes (e.g., ReactJS vs React.js vs React) fragmented profile editing.',
    action_taken:
      'Added canonical skill normalization prompt instruction and deterministic Pydantic deduplication validator.',
  },
  {
    sprint: 'Sprint 2',
    day: 'Day 3',
    impediments:
      'ChromaDB native wheel compilation failed on minimal Linux environments without C++ build tools.',
    action_taken:
      'Implemented seamless NumPy normalized cosine-similarity persistent vector index fallback alongside ChromaDB PersistentClient.',
  },
  {
    sprint: 'Sprint 2',
    day: 'Day 6',
    impediments:
      'Batch embedding 160 postings in a single API call occasionally timed out under peak latency.',
    action_taken:
      'Chunked embedding requests into batches of 32 with exponential backoff retries and live progress bar updates.',
  },
  {
    sprint: 'Sprint 2',
    day: 'Day 10',
    impediments:
      'Matching Agent occasionally assigned overlapping recommendation tiers near boundary scores (79–81).',
    action_taken:
      'Enforced deterministic tier classification in code (>=80 Strong Match, 62–79 Good Fit, <62 Stretch Role) after LLM scoring.',
  },
];

export const AGILE_RETROSPECTIVE: RetrospectiveRow[] = [
  {
    sl_no: 1,
    sprint_no: 'Sprint 1',
    sprint_start_date: '2026-10-12',
    sprint_end_date: '2026-10-25',
    team_member_name: 'AI/ML Developer',
    start_doing: 'Writing schema unit tests immediately after defining each Pydantic model.',
    stop_doing: 'Testing prompts only on clean, well-formatted resumes.',
    continue_doing: 'Using Gemini response_schema for guaranteed valid JSON responses.',
    action_taken: 'Added malformed/short resume edge-case fixtures to automated unit tests.',
  },
  {
    sl_no: 2,
    sprint_no: 'Sprint 1',
    sprint_start_date: '2026-10-12',
    sprint_end_date: '2026-10-25',
    team_member_name: 'Backend Developer',
    start_doing: 'Keeping service functions framework-agnostic so Streamlit and FastAPI share one codebase.',
    stop_doing: 'Coupling database connections directly inside UI callbacks.',
    continue_doing: 'Using parameterized SQLite queries and explicit error classes.',
    action_taken: 'Isolated CareerDatabase and ResumeParseError cleanly under services/.',
  },
  {
    sl_no: 3,
    sprint_no: 'Sprint 1',
    sprint_start_date: '2026-10-12',
    sprint_end_date: '2026-10-25',
    team_member_name: 'Frontend Developer',
    start_doing: 'Testing both desktop (1440px) and mobile (390px) layouts before sprint review.',
    stop_doing: 'Nesting bordered cards inside cards on data-heavy views.',
    continue_doing: 'Using clean tabular numerals and single-line tab controls.',
    action_taken: 'Standardized workspace spacing and responsive data table wrappers.',
  },
  {
    sl_no: 4,
    sprint_no: 'Sprint 2',
    sprint_start_date: '2026-10-26',
    sprint_end_date: '2026-11-08',
    team_member_name: 'Data Engineer',
    start_doing: 'Running automated deduplication assertions on every dataset regeneration.',
    stop_doing: 'Hand-editing JSON internship records without schema validation.',
    continue_doing: 'Maintaining balanced coverage across all 7 domains and 5 Indian tech hubs.',
    action_taken: 'Locked deterministic scripts/generate_dataset.py with unique-key assertion.',
  },
  {
    sl_no: 5,
    sprint_no: 'Sprint 2',
    sprint_start_date: '2026-10-26',
    sprint_end_date: '2026-11-08',
    team_member_name: 'QA Lead',
    start_doing: 'Running the 4-persona evaluation benchmark after every prompt or chunking tweak.',
    stop_doing: 'Evaluating RAG quality purely by manual spot-checks.',
    continue_doing: 'Exporting timestamped CSV and JSON evaluation reports for mentor sign-off.',
    action_taken: 'Automated Domain Precision@K and Skill-Match Accuracy reporting in Tab 4.',
  },
];
