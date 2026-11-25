import React, { useState, useRef } from 'react';
import { Upload, FileText, Plus, Trash2, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { CandidateProfile, EducationItem, ExperienceItem, ProjectItem } from '../types/career';
import { SAMPLE_RESUME_TEXT } from '../data/sampleProfiles';
import { validateCandidateProfile } from '../utils/matchingEngine';

interface TabProfileParserProps {
  profiles: CandidateProfile[];
  activeProfile: CandidateProfile;
  onSelectProfile: (profile: CandidateProfile) => void;
  onProfileSaved: (profile: CandidateProfile) => void;
  onProfileDeleted: (studentId: string) => void;
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TabProfileParser({
  profiles,
  activeProfile,
  onSelectProfile,
  onProfileSaved,
  onProfileDeleted,
}: TabProfileParserProps) {
  const [draft, setDraft] = useState<CandidateProfile>(activeProfile);
  const [skillsInput, setSkillsInput] = useState(activeProfile.skills.join(', '));
  const [rolesInput, setRolesInput] = useState(activeProfile.preferred_roles.join(', '));
  const [certsInput, setCertsInput] = useState(activeProfile.certifications.join(', '));

  const [resumeText, setResumeText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadIntoEditor = (profile: CandidateProfile) => {
    setDraft(profile);
    setSkillsInput(profile.skills.join(', '));
    setRolesInput(profile.preferred_roles.join(', '));
    setCertsInput(profile.certifications.join(', '));
    onSelectProfile(profile);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleNewBlankProfile = () => {
    const blank: CandidateProfile = {
      student_id: '',
      full_name: '',
      email: '',
      skills: [],
      education: [{ degree: '', institution: '', year: '2026', cgpa: '' }],
      experience: [],
      projects: [{ title: '', tech_stack: [], description: '' }],
      certifications: [],
      preferred_roles: [],
    };
    setDraft(blank);
    setSkillsInput('');
    setRolesInput('');
    setCertsInput('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleParseResume = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFile && resumeText.trim().length < 30) {
      setErrorMsg('Upload a PDF/TXT resume or paste at least 30 characters of resume text.');
      return;
    }

    setParsing(true);
    try {
      let response: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        response = await fetch('/api/resume/parse', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/resume/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume_text: resumeText }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse resume via Gemini.');
      }

      const parsed = data.profile as CandidateProfile;
      setDraft(parsed);
      setSkillsInput(parsed.skills.join(', '));
      setRolesInput(parsed.preferred_roles.join(', '));
      setCertsInput(parsed.certifications.join(', '));
      setSuccessMsg(
        `Extracted structured CandidateProfile for ${parsed.full_name} using gemini-4-hydrogen. Review fields and save to SQLite.`,
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected parsing error.');
    } finally {
      setParsing(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: CandidateProfile = {
      ...draft,
      skills: splitCsv(skillsInput),
      preferred_roles: splitCsv(rolesInput),
      certifications: splitCsv(certsInput),
    };

    const validationErrors = validateCandidateProfile(payload);
    if (validationErrors.length > 0) {
      setErrorMsg(validationErrors.join(' '));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not save profile to database.');
      }
      const saved = data.profile as CandidateProfile;
      setDraft(saved);
      setSkillsInput(saved.skills.join(', '));
      setRolesInput(saved.preferred_roles.join(', '));
      setCertsInput(saved.certifications.join(', '));
      onProfileSaved(saved);
      setSuccessMsg(`Saved profile ${saved.full_name} (${saved.student_id}) to career_companion.db.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (studentId: string) => {
    setDeletingId(studentId);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed.');
      }
      onProfileDeleted(studentId);
      setSuccessMsg(`Deleted profile ${studentId}.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const updateEducation = (index: number, patch: Partial<EducationItem>) => {
    setDraft((prev) => ({
      ...prev,
      education: prev.education.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const updateExperience = (index: number, patch: Partial<ExperienceItem>) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const updateProject = (index: number, patch: Partial<ProjectItem>) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Student Profile &amp; Resume Parser
        </h2>
        <p className="text-sm text-slate-600">
          Milestone 1 · Extract structured candidate profiles from PDF or plain-text resumes with Gemini{' '}
          <span className="font-mono text-xs text-slate-700">gemini-4-hydrogen</span> and persist edits to SQLite.
        </p>
      </div>

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

      {/* Top Row: Ingestion + Saved Profiles */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Resume Upload & Paste */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Resume Ingestion</h3>
              <p className="text-xs text-slate-500">
                Upload PDF or TXT file, or paste resume text below
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setResumeText(SAMPLE_RESUME_TEXT);
                setErrorMsg(null);
              }}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              Load Sample Resume
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                id="resume-file-input"
                type="file"
                accept=".pdf,.txt,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setErrorMsg(null);
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Upload className="h-3.5 w-3.5 text-slate-500" />
                Choose PDF / TXT File
              </button>
              {selectedFile ? (
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-slate-400 tabular-nums">
                    ({Math.max(1, Math.round(selectedFile.size / 1024))} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-500 underline hover:text-slate-900"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500">No file selected</span>
              )}
            </div>

            <div>
              <label htmlFor="resume-text-area" className="mb-1.5 block text-xs font-medium text-slate-700">
                Or Paste Raw Resume Text
              </label>
              <textarea
                id="resume-text-area"
                rows={7}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste education, technical skills, projects, and internship history here..."
                className="w-full rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-500">
                Strict JSON output validated against CandidateProfile schema
              </span>
              <button
                type="button"
                disabled={parsing}
                onClick={handleParseResume}
                className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {parsing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {parsing ? 'Parsing with Gemini...' : 'Parse Resume with Gemini'}
              </button>
            </div>
          </div>
        </section>

        {/* Saved Student Profiles */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Saved Profiles ({profiles.length})
              </h3>
              <p className="text-xs text-slate-500">Persisted in SQLite career_companion.db</p>
            </div>
            <button
              type="button"
              onClick={handleNewBlankProfile}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New Profile
            </button>
          </div>

          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {profiles.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No saved profiles yet. Parse a resume or create one manually.
              </p>
            ) : (
              profiles.map((p) => {
                const isSelected = p.student_id === draft.student_id;
                return (
                  <div
                    key={p.student_id}
                    className={`flex items-center justify-between gap-3 py-3 transition-colors ${
                      isSelected ? 'bg-blue-50/50 -mx-3 px-3 rounded-md' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadIntoEditor(p)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">
                          {p.full_name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0">
                          {p.student_id}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {p.preferred_roles[0] || p.email} · {p.skills.length} skills
                      </p>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete profile ${p.full_name}`}
                      disabled={deletingId === p.student_id}
                      onClick={() => handleDeleteProfile(p.student_id)}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Structured Candidate Profile Editor */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-lg border border-slate-200 bg-white p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Structured Candidate Profile Editor
            </h3>
            <p className="text-xs text-slate-500">
              Review and refine extracted attributes before saving to SQLite
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Basic Identity */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="profile-fullname" className="mb-1 block text-xs font-medium text-slate-700">
              Full Name
            </label>
            <input
              id="profile-fullname"
              type="text"
              value={draft.full_name}
              onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              placeholder="e.g., Priya Venkatesh"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-1 block text-xs font-medium text-slate-700">
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="student@university.edu"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-id" className="mb-1 block text-xs font-medium text-slate-700">
              Student ID (auto-generated if blank)
            </label>
            <input
              id="profile-id"
              type="text"
              value={draft.student_id}
              onChange={(e) => setDraft({ ...draft, student_id: e.target.value })}
              placeholder="STU-AUTO"
              className="w-full rounded-md border border-slate-200 font-mono text-xs px-3 py-2.5 text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Comma-Separated Structured Lists */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="profile-skills" className="mb-1 block text-xs font-medium text-slate-700">
              Technical Skills (comma-separated)
            </label>
            <textarea
              id="profile-skills"
              rows={3}
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="Python, PyTorch, RAG, SQL, FastAPI"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-roles" className="mb-1 block text-xs font-medium text-slate-700">
              Preferred Internship Roles
            </label>
            <textarea
              id="profile-roles"
              rows={3}
              value={rolesInput}
              onChange={(e) => setRolesInput(e.target.value)}
              placeholder="Generative AI Intern, Backend Engineering Intern"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-certs" className="mb-1 block text-xs font-medium text-slate-700">
              Certifications
            </label>
            <textarea
              id="profile-certs"
              rows={3}
              value={certsInput}
              onChange={(e) => setCertsInput(e.target.value)}
              placeholder="DeepLearning.AI Generative AI with LLMs"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Education Section */}
        <div className="border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Education</h4>
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  education: [
                    ...prev.education,
                    { degree: '', institution: '', year: '2026', cgpa: '' },
                  ],
                }))
              }
              className="text-xs font-medium text-blue-700 hover:text-blue-900"
            >
              + Add Education
            </button>
          </div>
          <div className="space-y-3">
            {draft.education.map((edu, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
                <div className="md:col-span-5">
                  <label className="mb-1 block text-[11px] text-slate-500">Degree</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEducation(idx, { degree: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="mb-1 block text-[11px] text-slate-500">Institution</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEducation(idx, { institution: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-1 block text-[11px] text-slate-500">Year</label>
                  <input
                    type="text"
                    value={edu.year}
                    onChange={(e) => updateEducation(idx, { year: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-1 block text-[11px] text-slate-500">CGPA</label>
                  <input
                    type="text"
                    value={edu.cgpa}
                    onChange={(e) => updateEducation(idx, { cgpa: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums"
                  />
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    aria-label={`Remove education row ${idx + 1}`}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        education: prev.education.filter((_, i) => i !== idx),
                      }))
                    }
                    className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Section */}
        <div className="border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Projects</h4>
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  projects: [...prev.projects, { title: '', tech_stack: [], description: '' }],
                }))
              }
              className="text-xs font-medium text-blue-700 hover:text-blue-900"
            >
              + Add Project
            </button>
          </div>
          <div className="space-y-4">
            {draft.projects.map((proj, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-12 items-start">
                <div className="md:col-span-3">
                  <label className="mb-1 block text-[11px] text-slate-500">Project Title</label>
                  <input
                    type="text"
                    value={proj.title}
                    onChange={(e) => updateProject(idx, { title: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-[11px] text-slate-500">Tech Stack</label>
                  <input
                    type="text"
                    value={proj.tech_stack.join(', ')}
                    onChange={(e) => updateProject(idx, { tech_stack: splitCsv(e.target.value) })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="mb-1 block text-[11px] text-slate-500">Description</label>
                  <input
                    type="text"
                    value={proj.description}
                    onChange={(e) => updateProject(idx, { description: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="md:col-span-1 flex justify-end pt-5">
                  <button
                    type="button"
                    aria-label={`Remove project ${idx + 1}`}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        projects: prev.projects.filter((_, i) => i !== idx),
                      }))
                    }
                    className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experience Section */}
        <div className="border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Experience &amp; Internships</h4>
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  experience: [
                    ...prev.experience,
                    { role: '', company: '', duration: '', highlights: [] },
                  ],
                }))
              }
              className="text-xs font-medium text-blue-700 hover:text-blue-900"
            >
              + Add Experience
            </button>
          </div>
          {draft.experience.length === 0 ? (
            <p className="text-xs text-slate-500">No prior internships listed yet.</p>
          ) : (
            <div className="space-y-4">
              {draft.experience.map((exp, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-12 items-start">
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-[11px] text-slate-500">Role</label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => updateExperience(idx, { role: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-[11px] text-slate-500">Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExperience(idx, { company: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-[11px] text-slate-500">Duration</label>
                    <input
                      type="text"
                      value={exp.duration}
                      onChange={(e) => updateExperience(idx, { duration: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-[11px] text-slate-500">Key Highlight</label>
                    <input
                      type="text"
                      value={exp.highlights.join(' | ')}
                      onChange={(e) =>
                        updateExperience(idx, {
                          highlights: e.target.value
                            .split('|')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end pt-5">
                    <button
                      type="button"
                      aria-label={`Remove experience ${idx + 1}`}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.filter((_, i) => i !== idx),
                        }))
                      }
                      className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
