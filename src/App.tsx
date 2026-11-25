import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Database,
  GitCompareArrows,
  BarChart3,
  Layers,
  FileSpreadsheet,
  Menu,
  X,
} from 'lucide-react';
import type { CandidateProfile, InternshipPosting, VectorIndexStatus } from './types/career';
import { EVALUATION_PERSONAS } from './data/sampleProfiles';
import { TabProfileParser } from './components/TabProfileParser';
import { TabKnowledgeBase } from './components/TabKnowledgeBase';
import { TabMatchingAgent } from './components/TabMatchingAgent';
import { TabEvaluationSuite } from './components/TabEvaluationSuite';
import { TabArchitecture } from './components/TabArchitecture';
import { TabDeliverables } from './components/TabDeliverables';

type TabKey = 'profile' | 'knowledge' | 'matching' | 'evaluation' | 'architecture' | 'deliverables';

const NAV_ITEMS: Array<{
  key: TabKey;
  label: string;
  breadcrumb: string;
  milestone: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'profile',
    label: 'Profile & Resume',
    breadcrumb: 'Milestone 1 / Student Profile & Resume Parser',
    milestone: 'Milestone 1',
    icon: UserCheck,
  },
  {
    key: 'knowledge',
    label: 'Knowledge Base & RAG',
    breadcrumb: 'Milestone 2.1–2.2 / Internship Knowledge Base & RAG',
    milestone: 'Milestone 2.1–2.2',
    icon: Database,
  },
  {
    key: 'matching',
    label: 'Matching Agent',
    breadcrumb: 'Milestone 2.3 / Job-Resume Matching Agent',
    milestone: 'Milestone 2.3',
    icon: GitCompareArrows,
  },
  {
    key: 'evaluation',
    label: 'Evaluation Suite',
    breadcrumb: 'Milestone 2.4 / Evaluation & Validation Benchmark',
    milestone: 'Milestone 2.4',
    icon: BarChart3,
  },
  {
    key: 'architecture',
    label: 'Architecture & Code',
    breadcrumb: 'Architecture / Multi-Agent System & Python Repo',
    milestone: 'System Design',
    icon: Layers,
  },
  {
    key: 'deliverables',
    label: '3 Template Files',
    breadcrumb: 'Deliverables / Unit Test, Defect Tracker & Agile',
    milestone: 'Mentor Pack',
    icon: FileSpreadsheet,
  },
];

const DEFAULT_RAG_STATUS: VectorIndexStatus = {
  indexed: false,
  indexed_count: 0,
  total_postings: 160,
  dimension: 0,
  model: 'gemini-embedding-001',
  backend: 'Local Vector Store',
  updated_at: null,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profiles, setProfiles] = useState<CandidateProfile[]>(
    EVALUATION_PERSONAS.map((p) => p.profile),
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    EVALUATION_PERSONAS[0].profile.student_id,
  );
  const [internships, setInternships] = useState<InternshipPosting[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [ragStatus, setRagStatus] = useState<VectorIndexStatus>(DEFAULT_RAG_STATUS);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const [profRes, intRes] = await Promise.all([
          fetch('/api/profiles'),
          fetch('/api/internships'),
        ]);
        if (!active) return;

        if (profRes.ok) {
          const profData = await profRes.json();
          const list = (profData.profiles ?? []) as CandidateProfile[];
          if (list.length > 0) {
            setProfiles(list);
            setSelectedProfileId(list[0].student_id);
          }
        }

        if (intRes.ok) {
          const intData = await intRes.json();
          setInternships((intData.internships ?? []) as InternshipPosting[]);
          setDomains((intData.domains ?? []) as string[]);
          setLocations((intData.locations ?? []) as string[]);
          if (intData.rag_status) {
            setRagStatus(intData.rag_status as VectorIndexStatus);
          }
        }
      } catch {
        // Keep seeded defaults if network hiccups
      } finally {
        if (active) setBootLoading(false);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const activeProfile =
    profiles.find((p) => p.student_id === selectedProfileId) ??
    profiles[0] ??
    EVALUATION_PERSONAS[0].profile;

  const activeNav = NAV_ITEMS.find((n) => n.key === activeTab) ?? NAV_ITEMS[0];

  const handleProfileSaved = (saved: CandidateProfile) => {
    setProfiles((prev) => {
      const exists = prev.some((p) => p.student_id === saved.student_id);
      if (exists) {
        return prev.map((p) => (p.student_id === saved.student_id ? saved : p));
      }
      return [saved, ...prev];
    });
    setSelectedProfileId(saved.student_id);
  };

  const handleProfileDeleted = (studentId: string) => {
    setProfiles((prev) => {
      const remaining = prev.filter((p) => p.student_id !== studentId);
      if (selectedProfileId === studentId && remaining.length > 0) {
        setSelectedProfileId(remaining[0].student_id);
      }
      return remaining;
    });
  };

  const handleInternshipAdded = (
    posting: InternshipPosting,
    updatedRagStatus: VectorIndexStatus,
  ) => {
    setInternships((prev) => [...prev, posting]);
    if (!domains.includes(posting.domain)) {
      setDomains((prev) => [...prev, posting.domain].sort());
    }
    if (!locations.includes(posting.location)) {
      setLocations((prev) => [...prev, posting.location].sort());
    }
    setRagStatus(updatedRagStatus);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center px-6 border-b border-slate-200">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Career Companion
          </span>
        </div>

        <nav aria-label="Workspace sections" className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => setActiveTab(item.key)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors whitespace-nowrap ${
                  isCurrent
                    ? 'bg-blue-50 font-semibold text-blue-800'
                    : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isCurrent ? 'text-blue-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-800">Infosys Springboard 7.0</p>
          <p className="tabular-nums">
            {internships.length} internships · {profiles.length} profiles
          </p>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 flex w-64 flex-col bg-white border-r border-slate-200">
            <div className="flex h-14 items-center justify-between px-5 border-b border-slate-200">
              <span className="font-display text-base font-bold text-slate-900">
                Career Companion
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav aria-label="Mobile navigation" className="flex-1 space-y-1 px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm ${
                      isCurrent
                        ? 'bg-blue-50 font-semibold text-blue-800'
                        : 'font-medium text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-medium text-slate-600">
              {activeNav.breadcrumb}
            </p>
          </div>

          <div className="shrink-0">
            {activeTab !== 'matching' ? (
              <button
                type="button"
                onClick={() => setActiveTab('matching')}
                className="rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Open Matching Agent
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('evaluation')}
                className="rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Run Benchmark Suite
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {bootLoading ? (
            <div className="space-y-4">
              <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
              <div className="h-44 w-full animate-pulse rounded-lg bg-slate-200" />
              <div className="h-64 w-full animate-pulse rounded-lg bg-slate-200" />
            </div>
          ) : (
            <>
              {activeTab === 'profile' && (
                <TabProfileParser
                  profiles={profiles}
                  activeProfile={activeProfile}
                  onSelectProfile={(p) => setSelectedProfileId(p.student_id)}
                  onProfileSaved={handleProfileSaved}
                  onProfileDeleted={handleProfileDeleted}
                />
              )}
              {activeTab === 'knowledge' && (
                <TabKnowledgeBase
                  internships={internships}
                  domains={domains}
                  locations={locations}
                  ragStatus={ragStatus}
                  onInternshipAdded={handleInternshipAdded}
                  onIndexRebuilt={setRagStatus}
                />
              )}
              {activeTab === 'matching' && (
                <TabMatchingAgent
                  profiles={profiles}
                  selectedProfileId={selectedProfileId}
                  onSelectProfileId={setSelectedProfileId}
                  ragStatus={ragStatus}
                  onNavigateToRag={() => setActiveTab('knowledge')}
                />
              )}
              {activeTab === 'evaluation' && <TabEvaluationSuite />}
              {activeTab === 'architecture' && <TabArchitecture />}
              {activeTab === 'deliverables' && <TabDeliverables />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
