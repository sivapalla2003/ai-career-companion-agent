import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { CandidateProfile, MatchResult, VectorIndexStatus } from '../types/career';

interface TabMatchingAgentProps {
  profiles: CandidateProfile[];
  selectedProfileId: string;
  onSelectProfileId: (id: string) => void;
  ragStatus: VectorIndexStatus;
  onNavigateToRag: () => void;
}

export function TabMatchingAgent({
  profiles,
  selectedProfileId,
  onSelectProfileId,
  ragStatus,
  onNavigateToRag,
}: TabMatchingAgentProps) {
  const [topK, setTopK] = useState(10);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [runMeta, setRunMeta] = useState<{
    run_id: string;
    model: string;
    embedding_model: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedProfile = profiles.find((p) => p.student_id === selectedProfileId) ?? profiles[0];

  const handleRunMatch = async () => {
    if (!selectedProfile) {
      setErrorMsg('Create and save a student profile first in Tab 1.');
      return;
    }

    setRunning(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedProfile.student_id,
          top_k: topK,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Matching Agent request failed.');
      }
      setResults(data.results as MatchResult[]);
      setRunMeta({
        run_id: data.run_id,
        model: data.model,
        embedding_model: data.embedding_model,
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Matching failed.');
    } finally {
      setRunning(false);
    }
  };

  const tierTextClass = (tier: MatchResult['recommendation_tier']) => {
    if (tier === 'Strong Match') return 'text-emerald-700';
    if (tier === 'Good Fit') return 'text-blue-700';
    return 'text-amber-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Job-Resume Matching Agent
        </h2>
        <p className="text-sm text-slate-600">
          Milestone 2.3 · Semantic RAG Top-K retrieval paired with{' '}
          <span className="font-mono text-xs text-slate-700">gemini-4-hydrogen</span> structured
          0–100% scoring, skill gap extraction, and fit reasoning.
        </p>
      </div>

      {!ragStatus.indexed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            Dense Gemini vector index is not built yet. Matching will use lexical cosine pre-filtering until you build the{' '}
            <span className="font-mono text-xs">gemini-embedding-001</span> index.
          </span>
          <button
            type="button"
            onClick={onNavigateToRag}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline hover:text-amber-700 whitespace-nowrap shrink-0"
          >
            Go to RAG Index
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Agent Control Bar */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6">
            <label htmlFor="match-profile-select" className="mb-1.5 block text-xs font-medium text-slate-700">
              Select Saved Student Profile
            </label>
            <select
              id="match-profile-select"
              value={selectedProfile?.student_id ?? ''}
              onChange={(e) => onSelectProfileId(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {profiles.map((p) => (
                <option key={p.student_id} value={p.student_id}>
                  {p.full_name} ({p.student_id}) — {p.preferred_roles[0] || `${p.skills.length} skills`}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="match-topk-select" className="mb-1.5 block text-xs font-medium text-slate-700">
              RAG Top-K Candidates
            </label>
            <select
              id="match-topk-select"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums"
            >
              {[5, 8, 10, 12, 15].map((k) => (
                <option key={k} value={k}>
                  Top {k} Internships
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex md:justify-end">
            <button
              type="button"
              disabled={running || !selectedProfile}
              onClick={handleRunMatch}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-md bg-blue-700 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {running ? 'Evaluating Matches...' : 'Run Matching Agent'}
            </button>
          </div>
        </div>

        {selectedProfile && (
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Candidate Skills: </span>
            {selectedProfile.skills.join(' · ')}
          </div>
        )}
      </section>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {runMeta && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Run ID: <span className="font-mono text-slate-800">{runMeta.run_id}</span></span>
          <span aria-hidden="true">·</span>
          <span>Reasoning: <span className="font-mono text-slate-800">{runMeta.model}</span></span>
          <span aria-hidden="true">·</span>
          <span>Retrieval: <span className="font-mono text-slate-800">{runMeta.embedding_model}</span></span>
        </div>
      )}

      {/* Results List */}
      {results.length === 0 && !running ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-900">No match run executed yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Select a student profile above and click Run Matching Agent to score Top-K semantic internships.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((match, idx) => (
            <article
              key={`${match.job_id}-${idx}`}
              className="rounded-lg border border-slate-200 bg-white p-6 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-700">#{idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{match.job_id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{match.domain}</span>
                    <span aria-hidden="true">·</span>
                    <span>{match.location}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Cosine {(match.semantic_similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    {match.job_title} <span className="font-normal text-slate-500">at</span>{' '}
                    {match.company}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {match.match_score}%
                  </div>
                  <div className={`text-xs font-semibold ${tierTextClass(match.recommendation_tier)}`}>
                    {match.recommendation_tier}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Matched Skills ({match.matched_skills.length})
                  </p>
                  <p className="mt-1 text-slate-700">
                    {match.matched_skills.length > 0 ? match.matched_skills.join(' · ') : 'None identified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    Missing / Gap Skills ({match.missing_skills.length})
                  </p>
                  <p className="mt-1 text-slate-700">
                    {match.missing_skills.length > 0 ? match.missing_skills.join(' · ') : 'No critical gaps'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600 md:grid-cols-2">
                <div>
                  <span className="font-semibold text-slate-800">Education Alignment: </span>
                  <span>{String(match.education_match)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Experience Alignment: </span>
                  <span>{String(match.experience_match)}</span>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-700">{match.reasoning}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
