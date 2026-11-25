import React, { useEffect, useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';

interface RepoFile {
  path: string;
  lines: number;
  bytes: number;
  content: string;
}

const AGENT_ROLES = [
  {
    agent: 'Job-Resume Matching Agent',
    milestone: 'Milestone 2 · Implemented',
    responsibility:
      'Retrieves Top-K semantic internship postings via RAG cosine search and computes weighted 0–100% scores, matched/missing skills, education/experience alignment, and recommendation tiers.',
    stack: 'gemini-4-hydrogen · ChromaDB / NumPy · Pydantic',
  },
  {
    agent: 'Skill Gap Agent',
    milestone: 'Milestone 3 · Planned',
    responsibility:
      'Aggregates missing required skills across target internships and constructs prioritized multi-week upskilling plans with project milestones.',
    stack: 'gemini-4-hydrogen · Competency Taxonomy',
  },
  {
    agent: 'Resume Tailoring Agent',
    milestone: 'Milestone 3 · Planned',
    responsibility:
      'Refines project descriptions and ATS keyword emphasis strictly from verified CandidateProfile evidence without fabricating experience.',
    stack: 'gemini-4-hydrogen · CandidateProfile Schema',
  },
  {
    agent: 'Cover Letter Agent',
    milestone: 'Milestone 3 · Planned',
    responsibility:
      'Generates concise, role-specific cover letters grounded in matched student projects and the employer responsibilities list.',
    stack: 'gemini-4-hydrogen · InternshipPosting Context',
  },
  {
    agent: 'Interview Preparation Agent',
    milestone: 'Milestone 4 · Planned',
    responsibility:
      'Conducts adaptive technical and behavioral mock interviews tailored to missing skills and evaluates answers against structured rubrics.',
    stack: 'gemini-4-hydrogen · Session Memory',
  },
  {
    agent: 'Career Companion Assistant',
    milestone: 'Milestone 4 · Planned',
    responsibility:
      'Central orchestrator routing student questions across matching, skill-gap analysis, resume review, and interview prep tools.',
    stack: 'gemini-4-hydrogen · Multi-Tool Router',
  },
];

export function TabArchitecture() {
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('app.py');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/repo-files')
      .then((r) => r.json())
      .then((data) => {
        const files = (data.files ?? []) as RepoFile[];
        setRepoFiles(files);
        if (files.length > 0) setSelectedPath(files[0].path);
      })
      .catch(() => {
        setRepoFiles([]);
      });
  }, []);

  const activeFile = repoFiles.find((f) => f.path === selectedPath) ?? repoFiles[0];

  const handleDownloadFile = (file: RepoFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || file.path;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Architecture &amp; Tech Stack
        </h2>
        <p className="text-sm text-slate-600">
          Infosys Springboard 7.0 Multi-Agent System Architecture, RAG Data Flow, Agent Role
          Definitions, and Modular Python Streamlit / FastAPI Source Code.
        </p>
      </div>

      {/* System Architecture Visual Diagram */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            End-to-End Multi-Agent Data Flow Diagram
          </h3>
          <p className="text-xs text-slate-500">
            Milestone 1 (Structured Resume Ingestion) + Milestone 2 (RAG Indexing, Semantic Matching &amp; Evaluation) + Downstream Agents
          </p>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox="0 0 980 340"
            className="w-full min-w-[760px] h-auto"
            role="img"
            aria-label="Multi-Agent System Architecture Diagram"
          >
            <defs>
              <marker
                id="arrow-slate"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
              </marker>
            </defs>

            {/* Row 1: Milestone 1 & Milestone 2.1-2.2 */}
            <rect x="20" y="20" width="220" height="84" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="36" y="46" fontSize="12" fontWeight="700" fill="#0f172a">1. Resume Ingestion (M1)</text>
            <text x="36" y="66" fontSize="11" fill="#475569">PDF / DOCX / TXT Parser</text>
            <text x="36" y="84" fontSize="11" fill="#1d4ed8">gemini-4-hydrogen Schema</text>

            <line x1="240" y1="62" x2="290" y2="62" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow-slate)" />

            <rect x="295" y="20" width="205" height="84" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="311" y="46" fontSize="12" fontWeight="700" fill="#0f172a">SQLite Profile Store</text>
            <text x="311" y="66" fontSize="11" fill="#475569">career_companion.db</text>
            <text x="311" y="84" fontSize="11" fill="#475569">Validated CandidateProfile</text>

            <rect x="540" y="20" width="205" height="84" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="556" y="46" fontSize="12" fontWeight="700" fill="#0f172a">2. Knowledge Base (M2.1)</text>
            <text x="556" y="66" fontSize="11" fill="#475569">160 Deduplicated Postings</text>
            <text x="556" y="84" fontSize="11" fill="#475569">7 Domains · 5 Tech Hubs</text>

            <line x1="745" y1="62" x2="780" y2="62" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow-slate)" />

            <rect x="785" y="20" width="175" height="84" rx="8" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
            <text x="801" y="46" fontSize="12" fontWeight="700" fill="#1e3a8a">RAG Vector Index</text>
            <text x="801" y="66" fontSize="11" fill="#1d4ed8">gemini-embedding-001</text>
            <text x="801" y="84" fontSize="11" fill="#475569">ChromaDB / NumPy</text>

            {/* Connectors to Matching Agent */}
            <path d="M 397 104 L 397 148 L 440 148" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow-slate)" />
            <path d="M 872 104 L 872 148 L 710 148" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow-slate)" />

            {/* Row 2: Matching Agent + Evaluation */}
            <rect x="445" y="122" width="260" height="84" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" />
            <text x="463" y="148" fontSize="12" fontWeight="700" fill="#1e3a8a">3. Job-Resume Matching Agent (M2.3)</text>
            <text x="463" y="168" fontSize="11" fill="#1e40af">Top-K Cosine Retrieval + 0–100% Scoring</text>
            <text x="463" y="186" fontSize="11" fill="#475569">Matched/Missing Skills + Reasoning</text>

            <line x1="445" y1="164" x2="290" y2="164" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow-slate)" />

            <rect x="20" y="122" width="265" height="84" rx="8" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
            <text x="36" y="148" fontSize="12" fontWeight="700" fill="#14532d">4. Evaluation Suite (M2.4)</text>
            <text x="36" y="168" fontSize="11" fill="#166534">4 Sample Personas · Precision@K</text>
            <text x="36" y="186" fontSize="11" fill="#475569">CSV &amp; JSON Benchmark Reports</text>

            {/* Row 3: Downstream Multi-Agent Layer */}
            <line x1="575" y1="206" x2="575" y2="236" stroke="#64748b" strokeWidth="1.5" />
            <line x1="105" y1="236" x2="865" y2="236" stroke="#94a3b8" strokeWidth="1.2" />

            {[
              { x: 20, title: 'Skill Gap Agent', sub: 'Upskilling Roadmap' },
              { x: 210, title: 'Resume Agent', sub: 'ATS Bullet Tailoring' },
              { x: 400, title: 'Cover Letter Agent', sub: 'Grounded Outreach' },
              { x: 590, title: 'Interview Agent', sub: 'Mock Q&A Rubrics' },
              { x: 780, title: 'Career Assistant', sub: 'Tool Orchestrator' },
            ].map((node) => (
              <g key={node.title}>
                <line x1={node.x + 85} y1="236" x2={node.x + 85} y2="255" stroke="#94a3b8" strokeWidth="1.2" markerEnd="url(#arrow-slate)" />
                <rect x={node.x} y="258" width="175" height="62" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="4 3" />
                <text x={node.x + 14} y="284" fontSize="11.5" fontWeight="600" fill="#0f172a">{node.title}</text>
                <text x={node.x + 14} y="303" fontSize="10.5" fill="#64748b">{node.sub}</text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      {/* 6 Multi-Agent Role Definitions */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Multi-Agent Role Definitions (Mentor Submission Matrix)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-4 py-2.5 whitespace-nowrap">Agent Name</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Delivery Phase</th>
                <th className="px-4 py-2.5">Core Responsibility</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Models &amp; Stores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {AGENT_ROLES.map((item) => (
                <tr key={item.agent} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {item.agent}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <span
                      className={
                        item.milestone.includes('Implemented')
                          ? 'font-semibold text-emerald-700'
                          : 'text-slate-600'
                      }
                    >
                      {item.milestone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-slate-700">
                    {item.responsibility}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {item.stack}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modular Python Streamlit & FastAPI Codebase Explorer */}
      {repoFiles.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Python Streamlit &amp; FastAPI Source Repository
              </h3>
              <p className="text-xs text-slate-500">
                Complete production-ready Python files generated in workspace — run locally via{' '}
                <span className="font-mono text-slate-700">streamlit run app.py</span> or{' '}
                <span className="font-mono text-slate-700">uvicorn api:app</span>
              </p>
            </div>
            {activeFile && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadFile(activeFile)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download {activeFile.path.split('/').pop()}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="border-b border-slate-200 bg-slate-50/70 p-3 lg:col-span-3 lg:border-b-0 lg:border-r">
              <div className="space-y-1">
                {repoFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedPath(file.path)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors ${
                      activeFile?.path === file.path
                        ? 'bg-blue-700 font-medium text-white'
                        : 'text-slate-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="font-mono truncate">{file.path}</span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ml-2 shrink-0 ${
                        activeFile?.path === file.path ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {file.lines}L
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-9 bg-slate-950 text-slate-100 overflow-x-auto max-h-[420px]">
              <pre className="p-4 font-mono text-xs leading-relaxed">
                <code>{activeFile?.content}</code>
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
