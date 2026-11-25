import React, { useState, useMemo } from 'react';
import { Database, Plus, Search, Loader2, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { InternshipPosting, VectorIndexStatus } from '../types/career';
import { validateInternshipPosting } from '../utils/matchingEngine';

interface TabKnowledgeBaseProps {
  internships: InternshipPosting[];
  domains: string[];
  locations: string[];
  ragStatus: VectorIndexStatus;
  onInternshipAdded: (posting: InternshipPosting, updatedRagStatus: VectorIndexStatus) => void;
  onIndexRebuilt: (status: VectorIndexStatus) => void;
}

const PAGE_SIZE = 15;

export function TabKnowledgeBase({
  internships,
  domains,
  locations,
  ragStatus,
  onInternshipAdded,
  onIndexRebuilt,
}: TabKnowledgeBaseProps) {
  const [domainFilter, setDomainFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPosting, setSelectedPosting] = useState<InternshipPosting | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [newJob, setNewJob] = useState({
    job_title: '',
    company: '',
    location: 'Bengaluru',
    domain: 'AI/Generative AI',
    stipend: '₹35,000/month',
    duration: '6 Months',
    required_skills: '',
    preferred_skills: '',
    education_requirements: 'Pursuing B.Tech / M.Tech in Computer Science or AI',
    experience_requirements: '1+ relevant software or AI project',
    qualifications: 'Strong engineering fundamentals and problem-solving skills.',
    responsibilities: '',
    job_description: '',
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return internships.filter((item) => {
      if (domainFilter !== 'All' && item.domain !== domainFilter) return false;
      if (locationFilter !== 'All' && item.location !== locationFilter) return false;
      if (q) {
        const hay = `${item.job_id} ${item.job_title} ${item.company} ${item.required_skills.join(' ')} ${item.preferred_skills.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [internships, domainFilter, locationFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleRebuildIndex = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIndexing(true);
    setIndexProgress(15);

    const ticker = window.setInterval(() => {
      setIndexProgress((prev) => (prev < 88 ? prev + 9 : prev));
    }, 450);

    try {
      const response = await fetch('/api/rag/index', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Vector indexing failed.');
      }
      setIndexProgress(100);
      onIndexRebuilt(data.status as VectorIndexStatus);
      setSuccessMsg(data.message || 'Vector index built successfully.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Indexing failed.');
    } finally {
      window.clearInterval(ticker);
      setIndexing(false);
    }
  };

  const handleAddPosting = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: Partial<InternshipPosting> = {
      job_title: newJob.job_title.trim(),
      company: newJob.company.trim(),
      location: newJob.location,
      domain: newJob.domain,
      stipend: newJob.stipend.trim(),
      duration: newJob.duration.trim(),
      required_skills: newJob.required_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      preferred_skills: newJob.preferred_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      education_requirements: newJob.education_requirements.trim(),
      experience_requirements: newJob.experience_requirements.trim(),
      qualifications: newJob.qualifications.trim(),
      responsibilities: newJob.responsibilities
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      job_description: newJob.job_description.trim(),
    };

    const validationErrors = validateInternshipPosting(payload);
    if (validationErrors.length > 0) {
      setErrorMsg(validationErrors.join(' '));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/internships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add internship.');
      }
      onInternshipAdded(data.posting as InternshipPosting, data.rag_status as VectorIndexStatus);
      setSuccessMsg(
        `Added ${data.posting.job_id}: ${data.posting.job_title} at ${data.posting.company}. Rebuild the RAG index to embed the new posting.`,
      );
      setShowAddForm(false);
      setNewJob({
        ...newJob,
        job_title: '',
        company: '',
        required_skills: '',
        preferred_skills: '',
        responsibilities: '',
        job_description: '',
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add internship.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Internship Knowledge Base &amp; RAG Index
          </h2>
          <p className="text-sm text-slate-600">
            Milestone 2.1 &amp; 2.2 · Curated dataset of Indian tech-hub internships indexed with{' '}
            <span className="font-mono text-xs text-slate-700">gemini-embedding-001</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {showAddForm ? 'Close Form' : 'Add Internship'}
          </button>
          <button
            type="button"
            disabled={indexing}
            onClick={handleRebuildIndex}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {indexing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
            {indexing ? 'Embedding Postings...' : 'Build Vector Index'}
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Total Internships</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {internships.length}
          </p>
        </div>
        <div className="border-l border-slate-100 pl-4">
          <p className="text-xs text-slate-500">Domains · Hubs</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {domains.length} <span className="text-slate-300">/</span> {locations.length}
          </p>
        </div>
        <div className="border-l border-slate-100 pl-4">
          <p className="text-xs text-slate-500">Indexed Chunks</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {ragStatus.indexed ? `${ragStatus.indexed_count}/${ragStatus.total_postings}` : '0'}
          </p>
        </div>
        <div className="border-l border-slate-100 pl-4">
          <p className="text-xs text-slate-500">Vector Store State</p>
          <p
            className={`mt-1.5 text-sm font-semibold ${
              ragStatus.indexed ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {ragStatus.indexed
              ? `Ready (${ragStatus.dimension}-d · ${ragStatus.model})`
              : 'Not Indexed Yet'}
          </p>
        </div>
      </div>

      {indexing && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-blue-900">
            <span>Chunking and embedding {internships.length} postings via Gemini API...</span>
            <span className="font-mono tabular-nums">{indexProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full bg-blue-700 transition-all duration-300"
              style={{ width: `${indexProgress}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add New Internship Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddPosting}
          className="rounded-lg border border-slate-200 bg-white p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-900">Add New Internship Posting</h3>
            <button
              type="button"
              aria-label="Close add internship form"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="new-job-title" className="mb-1 block text-xs font-medium text-slate-700">
                Job Title
              </label>
              <input
                id="new-job-title"
                type="text"
                value={newJob.job_title}
                onChange={(e) => setNewJob({ ...newJob, job_title: e.target.value })}
                placeholder="Agentic AI Engineering Intern"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-job-company" className="mb-1 block text-xs font-medium text-slate-700">
                Company
              </label>
              <input
                id="new-job-company"
                type="text"
                value={newJob.company}
                onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                placeholder="Infosys Innovation Hub"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-job-location" className="mb-1 block text-xs font-medium text-slate-700">
                Location
              </label>
              <select
                id="new-job-location"
                value={newJob.location}
                onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                {['Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Remote'].map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="new-job-domain" className="mb-1 block text-xs font-medium text-slate-700">
                Domain
              </label>
              <select
                id="new-job-domain"
                value={newJob.domain}
                onChange={(e) => setNewJob({ ...newJob, domain: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                {[
                  'AI/Generative AI',
                  'Software Engineering',
                  'Data Science',
                  'Full-Stack Web Dev',
                  'Cloud/DevOps',
                  'UI/UX Design',
                  'Product/Business',
                ].map((dom) => (
                  <option key={dom} value={dom}>
                    {dom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-job-req" className="mb-1 block text-xs font-medium text-slate-700">
                Required Skills (comma-separated)
              </label>
              <input
                id="new-job-req"
                type="text"
                value={newJob.required_skills}
                onChange={(e) => setNewJob({ ...newJob, required_skills: e.target.value })}
                placeholder="Python, RAG, Gemini API, FastAPI"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-job-pref" className="mb-1 block text-xs font-medium text-slate-700">
                Preferred Skills (comma-separated)
              </label>
              <input
                id="new-job-pref"
                type="text"
                value={newJob.preferred_skills}
                onChange={(e) => setNewJob({ ...newJob, preferred_skills: e.target.value })}
                placeholder="ChromaDB, Docker, Pydantic"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="new-job-desc" className="mb-1 block text-xs font-medium text-slate-700">
                Job Description
              </label>
              <textarea
                id="new-job-desc"
                rows={3}
                value={newJob.job_description}
                onChange={(e) => setNewJob({ ...newJob, job_description: e.target.value })}
                placeholder="Describe role objectives, team context, and expected deliverables..."
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-job-resp" className="mb-1 block text-xs font-medium text-slate-700">
                Responsibilities (one per line)
              </label>
              <textarea
                id="new-job-resp"
                rows={3}
                value={newJob.responsibilities}
                onChange={(e) => setNewJob({ ...newJob, responsibilities: e.target.value })}
                placeholder="Build semantic retrieval pipelines&#10;Write evaluation benchmarks"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Internship Posting
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar + High-Density Data Table */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <label htmlFor="kb-search" className="sr-only">
              Search internships
            </label>
            <input
              id="kb-search"
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by job ID, title, company, or skill..."
              className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="kb-domain" className="sr-only">
              Filter by domain
            </label>
            <select
              id="kb-domain"
              value={domainFilter}
              onChange={(e) => {
                setDomainFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="All">All Domains ({domains.length})</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label htmlFor="kb-location" className="sr-only">
              Filter by location
            </label>
            <select
              id="kb-location"
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="All">All Locations ({locations.length})</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-4 py-2.5 whitespace-nowrap">Job ID</th>
                <th className="px-4 py-2.5">Role &amp; Company</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Domain</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Location</th>
                <th className="px-4 py-2.5">Required Skills</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Stipend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No internship postings match the current filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((job) => {
                  const isActive = selectedPosting?.job_id === job.job_id;
                  return (
                    <tr
                      key={job.job_id}
                      onClick={() => setSelectedPosting(isActive ? null : job)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        isActive ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
                        {job.job_id}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{job.job_title}</div>
                        <div className="text-xs text-slate-500">{job.company}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                        {job.domain}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                        {job.location}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {job.required_skills.join(' · ')}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {job.stipend}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          <span className="tabular-nums">
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} postings
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="font-mono tabular-nums">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Selected Internship Detail Inspector */}
      {selectedPosting && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs text-slate-500">
                {selectedPosting.job_id} · {selectedPosting.domain} · {selectedPosting.location} ·{' '}
                {selectedPosting.duration} · {selectedPosting.stipend}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {selectedPosting.job_title} — {selectedPosting.company}
              </h3>
            </div>
            <button
              type="button"
              aria-label="Close posting detail"
              onClick={() => setSelectedPosting(null)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm leading-relaxed text-slate-700">{selectedPosting.job_description}</p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-900">Key Responsibilities</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-700">
                {selectedPosting.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-slate-900">Required Skills: </span>
                <span className="text-slate-700">{selectedPosting.required_skills.join(', ')}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900">Preferred Skills: </span>
                <span className="text-slate-700">{selectedPosting.preferred_skills.join(', ')}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900">Education: </span>
                <span className="text-slate-700">{selectedPosting.education_requirements}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900">Experience: </span>
                <span className="text-slate-700">{selectedPosting.experience_requirements}</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
