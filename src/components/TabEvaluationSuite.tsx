import React, { useState } from 'react';
import { Play, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { EvaluationBenchmarkResponse, EvaluationMetricRow } from '../types/career';
import { EVALUATION_PERSONAS } from '../data/sampleProfiles';
import { serializeToCsv } from '../utils/matchingEngine';

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function TabEvaluationSuite() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<EvaluationBenchmarkResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setRunning(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top_k: 8 }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Evaluation benchmark failed.');
      }
      setReport(data as EvaluationBenchmarkResponse);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!report) return;
    const csv = serializeToCsv<EvaluationMetricRow & Record<string, unknown>>(
      report.summary as Array<EvaluationMetricRow & Record<string, unknown>>,
      [
        { key: 'student_id', header: 'Student ID' },
        { key: 'student_name', header: 'Student Name' },
        { key: 'target_track', header: 'Target Track' },
        { key: 'top_k_retrieved', header: 'Top-K Retrieved' },
        { key: 'domain_precision_at_k', header: 'Domain Precision@K (%)' },
        { key: 'avg_match_score', header: 'Avg Match Score' },
        { key: 'top_match_score', header: 'Top Match Score' },
        { key: 'score_consistency_std', header: 'Score StdDev' },
        { key: 'skill_match_accuracy', header: 'Skill Match Accuracy (%)' },
        { key: 'strong_matches', header: 'Strong Matches' },
        { key: 'good_fits', header: 'Good Fits' },
        { key: 'stretch_roles', header: 'Stretch Roles' },
        { key: 'top_recommended_role', header: 'Top Recommended Role' },
        { key: 'status', header: 'Validation Status' },
      ],
    );
    triggerDownload(csv, 'evaluation_report.csv', 'text/csv;charset=utf-8;');
  };

  const handleDownloadJson = () => {
    if (!report) return;
    triggerDownload(
      JSON.stringify(report, null, 2),
      'evaluation_report.json',
      'application/json;charset=utf-8;',
    );
  };

  const avgPrecision = report
    ? (
        report.summary.reduce((acc, r) => acc + r.domain_precision_at_k, 0) /
        Math.max(1, report.summary.length)
      ).toFixed(1)
    : null;

  const avgSkillAcc = report
    ? (
        report.summary.reduce((acc, r) => acc + r.skill_match_accuracy, 0) /
        Math.max(1, report.summary.length)
      ).toFixed(1)
    : null;

  const avgScore = report
    ? (
        report.summary.reduce((acc, r) => acc + r.avg_match_score, 0) /
        Math.max(1, report.summary.length)
      ).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Evaluation &amp; Validation Suite
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Milestone 2.4 · Automated multi-persona benchmark measuring retrieval relevance, score
            consistency, and skill-matching accuracy across 4 diverse student tracks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {report && (
            <>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download JSON
              </button>
            </>
          )}
          <button
            type="button"
            disabled={running}
            onClick={handleRunBenchmark}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {running ? 'Running 4-Persona Benchmark...' : 'Run Evaluation Benchmark'}
          </button>
        </div>
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

      {/* 4 Pre-Loaded Evaluation Personas */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Pre-Loaded Benchmark Student Personas (4 Tracks)
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {EVALUATION_PERSONAS.map((persona) => (
            <div
              key={persona.profile.student_id}
              className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-12 md:items-center"
            >
              <div className="md:col-span-3">
                <div className="text-sm font-semibold text-slate-900">
                  {persona.profile.full_name}
                </div>
                <div className="text-xs text-slate-500">
                  {persona.track_label} · <span className="font-mono">{persona.profile.student_id}</span>
                </div>
              </div>
              <div className="md:col-span-3 text-xs text-slate-600">
                <span className="font-medium text-slate-800">Expected Domains: </span>
                {persona.expected_domains.join(', ')}
              </div>
              <div className="md:col-span-6 text-xs text-slate-600">
                <span className="font-medium text-slate-800">Core Skills: </span>
                {persona.profile.skills.slice(0, 8).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benchmark Output */}
      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Mean Domain Precision@8</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {avgPrecision}%
              </p>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <p className="text-xs text-slate-500">Mean Skill-Match Accuracy</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {avgSkillAcc}%
              </p>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <p className="text-xs text-slate-500">Mean Top-8 Score</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {avgScore}%
              </p>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <p className="text-xs text-slate-500">Models Verified</p>
              <p className="mt-1.5 font-mono text-xs font-medium text-slate-800">
                {report.model}
              </p>
              <p className="font-mono text-[11px] text-slate-500 truncate">
                {report.embedding_model}
              </p>
            </div>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Benchmark Results Summary
              </div>
              <span className="font-mono text-xs text-slate-500">
                Completed {new Date(report.run_at).toLocaleTimeString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-2.5">Student &amp; Track</th>
                    <th className="px-4 py-2.5 text-right whitespace-nowrap">Precision@8</th>
                    <th className="px-4 py-2.5 text-right whitespace-nowrap">Avg / Top</th>
                    <th className="px-4 py-2.5 text-right whitespace-nowrap">StdDev</th>
                    <th className="px-4 py-2.5 text-right whitespace-nowrap">Skill Acc</th>
                    <th className="px-4 py-2.5">Top Recommended Role</th>
                    <th className="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.summary.map((row) => (
                    <tr key={row.student_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{row.student_name}</div>
                        <div className="text-xs text-slate-500">{row.target_track}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                        {row.domain_precision_at_k.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {row.avg_match_score.toFixed(1)} / {row.top_match_score}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {row.score_consistency_std.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                        {row.skill_match_accuracy.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {row.top_recommended_role}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold">
                        <span
                          className={
                            row.status === 'Pass' ? 'text-emerald-700' : 'text-amber-700'
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
