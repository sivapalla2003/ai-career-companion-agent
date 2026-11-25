import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { CareerSqliteStore } from './server/db';
import { ensureInternshipsDataset } from './server/datasetGenerator';
import {
  embedTextsWithGemini,
  evaluateMatchesWithGemini,
  parseResumeWithGemini,
  PRIMARY_EMBEDDING_MODEL,
  REASONING_MODEL,
} from './server/geminiService';
import { formatFriendlyGeminiError } from './server/geminiResilience';
import type {
  CandidateProfile,
  EvaluationBenchmarkResponse,
  InternshipPosting,
  MatchResult,
  VectorIndexStatus,
} from './src/types/career';
import {
  buildInternshipChunk,
  buildProfileQuery,
  computeEvaluationRow,
  cosineSimilarity,
  rankPostingsByLexicalCosine,
  validateCandidateProfile,
  validateInternshipPosting,
} from './src/utils/matchingEngine';
import { EVALUATION_PERSONAS } from './src/data/sampleProfiles';

const DATA_PATH = path.resolve(process.cwd(), 'data/internships.json');
const VECTOR_INDEX_PATH = path.resolve(process.cwd(), 'data/vector_store/embeddings_node.json');
const PORT = Number(process.env.PORT || 3000);

interface PersistedVectorIndex {
  model: string;
  backend: string;
  dimension: number;
  updated_at: string;
  job_ids: string[];
  embeddings: number[][];
}

const db = new CareerSqliteStore(path.resolve(process.cwd(), 'career_companion.db'));
let internships: InternshipPosting[] = ensureInternshipsDataset(DATA_PATH);

function readVectorIndex(): PersistedVectorIndex | null {
  if (!fs.existsSync(VECTOR_INDEX_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(VECTOR_INDEX_PATH, 'utf-8')) as PersistedVectorIndex;
  } catch {
    return null;
  }
}

function writeVectorIndex(index: PersistedVectorIndex): void {
  fs.mkdirSync(path.dirname(VECTOR_INDEX_PATH), { recursive: true });
  fs.writeFileSync(VECTOR_INDEX_PATH, JSON.stringify(index), 'utf-8');
}

function getIndexStatus(): VectorIndexStatus {
  const idx = readVectorIndex();
  if (!idx) {
    return {
      indexed: false,
      indexed_count: 0,
      total_postings: internships.length,
      dimension: 0,
      model: PRIMARY_EMBEDDING_MODEL,
      backend: 'Local Vector Store (Not Built)',
      updated_at: null,
    };
  }
  return {
    indexed: true,
    indexed_count: idx.job_ids.length,
    total_postings: internships.length,
    dimension: idx.dimension,
    model: idx.model,
    backend: idx.backend,
    updated_at: idx.updated_at,
  };
}

async function retrieveTopKForProfile(
  profile: CandidateProfile,
  topK: number,
): Promise<{
  candidates: Array<{ posting: InternshipPosting; similarity: number }>;
  embeddingModelUsed: string;
}> {
  const queryText = buildProfileQuery(profile);
  const idx = readVectorIndex();

  if (idx && idx.embeddings.length > 0) {
    const { embeddings, modelUsed } = await embedTextsWithGemini([queryText]);
    const qVec = embeddings[0] ?? [];
    const byId = new Map(internships.map((p) => [p.job_id, p]));
    const scored: Array<{ posting: InternshipPosting; similarity: number }> = [];

    for (let i = 0; i < idx.job_ids.length; i++) {
      const posting = byId.get(idx.job_ids[i]);
      if (!posting) continue;
      const sim = cosineSimilarity(qVec, idx.embeddings[i]);
      scored.push({ posting, similarity: sim });
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    return {
      candidates: scored.slice(0, topK),
      embeddingModelUsed: modelUsed,
    };
  }

  return {
    candidates: rankPostingsByLexicalCosine(queryText, internships, topK),
    embeddingModelUsed: 'lexical-tfidf-cosine (Build RAG Index for Gemini dense embeddings)',
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      internships_count: internships.length,
      profiles_count: db.listProfiles().length,
      rag_status: getIndexStatus(),
    });
  });

  // ---- Milestone 1: Student Profiles & Resume Parsing ----
  app.get('/api/profiles', (_req, res) => {
    res.json({ profiles: db.listProfiles() });
  });

  app.post('/api/profiles', (req, res) => {
    const body = req.body as Partial<CandidateProfile>;
    const errors = validateCandidateProfile(body);
    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(' ') });
      return;
    }
    const saved = db.saveProfile(body as CandidateProfile);
    res.status(201).json({ profile: saved });
  });

  app.delete('/api/profiles/:studentId', (req, res) => {
    const deleted = db.deleteProfile(req.params.studentId);
    if (!deleted) {
      res.status(404).json({ error: 'Student profile not found.' });
      return;
    }
    res.json({ deleted: true, student_id: req.params.studentId });
  });

  app.post('/api/resume/parse', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (file) {
        if (!file.buffer || file.buffer.length === 0) {
          res.status(400).json({ error: 'Uploaded resume file is empty.' });
          return;
        }
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.pdf') {
          const { profile, modelUsed } = await parseResumeWithGemini({
            fileBase64: file.buffer.toString('base64'),
            mimeType: 'application/pdf',
          });
          res.json({ profile, model: modelUsed, source: file.originalname });
          return;
        }
        if (ext === '.txt' || ext === '.md') {
          const text = file.buffer.toString('utf-8').trim();
          const { profile, modelUsed } = await parseResumeWithGemini({ text });
          res.json({ profile, model: modelUsed, source: file.originalname });
          return;
        }
        res.status(400).json({
          error: `Unsupported file format '${ext}'. Please upload a .pdf or .txt file, or paste your resume text.`,
        });
        return;
      }

      const rawText = typeof req.body?.resume_text === 'string' ? req.body.resume_text.trim() : '';
      if (rawText.length < 30) {
        res.status(400).json({
          error: 'Please upload a PDF/TXT resume or paste at least 30 characters of resume text.',
        });
        return;
      }
      const { profile, modelUsed } = await parseResumeWithGemini({ text: rawText });
      res.json({ profile, model: modelUsed, source: 'pasted_text' });
    } catch (err: unknown) {
      res.status(500).json({ error: formatFriendlyGeminiError(err) });
    }
  });

  // ---- Milestone 2.1 & 2.2: Internship Knowledge Base & RAG Index ----
  app.get('/api/internships', (req, res) => {
    const domain = String(req.query.domain ?? 'All');
    const location = String(req.query.location ?? 'All');
    const q = String(req.query.q ?? '').trim().toLowerCase();

    const filtered = internships.filter((p) => {
      if (domain !== 'All' && p.domain !== domain) return false;
      if (location !== 'All' && p.location !== location) return false;
      if (q) {
        const hay = `${p.job_id} ${p.job_title} ${p.company} ${p.required_skills.join(' ')} ${p.preferred_skills.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    res.json({
      total: internships.length,
      filtered_count: filtered.length,
      domains: Array.from(new Set(internships.map((p) => p.domain))).sort(),
      locations: Array.from(new Set(internships.map((p) => p.location))).sort(),
      internships: filtered,
      rag_status: getIndexStatus(),
    });
  });

  app.post('/api/internships', (req, res) => {
    const body = req.body as Partial<InternshipPosting>;
    const errors = validateInternshipPosting(body);
    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(' ') });
      return;
    }

    const nextNum = internships.length + 1;
    const jobId =
      body.job_id && body.job_id.trim().length > 0
        ? body.job_id.trim()
        : `INT-${String(nextNum).padStart(3, '0')}`;

    if (internships.some((p) => p.job_id === jobId)) {
      res.status(409).json({ error: `Internship with job_id '${jobId}' already exists.` });
      return;
    }

    const posting: InternshipPosting = {
      job_id: jobId,
      job_title: body.job_title!.trim(),
      company: body.company!.trim(),
      location: body.location!.trim(),
      domain: body.domain?.trim() || 'Software Engineering',
      stipend: body.stipend?.trim() || '₹30,000/month',
      duration: body.duration?.trim() || '6 Months',
      job_description: body.job_description!.trim(),
      responsibilities:
        Array.isArray(body.responsibilities) && body.responsibilities.length > 0
          ? body.responsibilities
          : ['Contribute to sprint deliverables and mentor code reviews.'],
      required_skills: body.required_skills!,
      preferred_skills: body.preferred_skills ?? [],
      qualifications: body.qualifications?.trim() || 'Strong technical fundamentals.',
      experience_requirements: body.experience_requirements?.trim() || '1+ academic or personal project.',
      education_requirements:
        body.education_requirements?.trim() || 'Pursuing B.Tech / M.Tech / relevant degree.',
    };

    internships = [...internships, posting];
    fs.writeFileSync(DATA_PATH, JSON.stringify(internships, null, 2), 'utf-8');
    res.status(201).json({
      posting,
      total: internships.length,
      rag_status: getIndexStatus(),
    });
  });

  app.get('/api/rag/status', (_req, res) => {
    res.json(getIndexStatus());
  });

  app.post('/api/rag/index', async (_req, res) => {
    try {
      const chunks = internships.map((p) => buildInternshipChunk(p));
      const { embeddings, modelUsed } = await embedTextsWithGemini(chunks);
      const dimension = embeddings[0]?.length ?? 0;

      const persisted: PersistedVectorIndex = {
        model: modelUsed,
        backend: 'Normalized Dense Cosine Index (JSON/NumPy Parity)',
        dimension,
        updated_at: new Date().toISOString(),
        job_ids: internships.map((p) => p.job_id),
        embeddings,
      };
      writeVectorIndex(persisted);
      res.json({
        status: getIndexStatus(),
        message: `Indexed ${internships.length} internship postings (${dimension}-d vectors via ${modelUsed}).`,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: formatFriendlyGeminiError(err) });
    }
  });

  // ---- Milestone 2.3: Job-Resume Matching Agent ----
  app.post('/api/match', async (req, res) => {
    try {
      const studentId = String(req.body?.student_id ?? '');
      const topK = Math.max(3, Math.min(15, Number(req.body?.top_k ?? 10)));
      const profile = db.getProfile(studentId);
      if (!profile) {
        res.status(404).json({ error: `Student profile '${studentId}' not found.` });
        return;
      }

      const { candidates, embeddingModelUsed } = await retrieveTopKForProfile(profile, topK);
      const { results, modelUsed } = await evaluateMatchesWithGemini(profile, candidates);
      const runId = db.saveMatchRun(profile.student_id, results, topK);

      res.json({
        run_id: runId,
        student_id: profile.student_id,
        model: modelUsed,
        embedding_model: embeddingModelUsed,
        results,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: formatFriendlyGeminiError(err) });
    }
  });

  // ---- Milestone 2.4: Evaluation & Validation Suite ----
  app.post('/api/evaluate', async (req, res) => {
    try {
      const topK = Math.max(4, Math.min(10, Number(req.body?.top_k ?? 8)));
      const summary = [];
      const detailedMatches: Record<string, MatchResult[]> = {};
      let embeddingUsed = PRIMARY_EMBEDDING_MODEL;
      let reasoningUsed = REASONING_MODEL;

      for (let i = 0; i < EVALUATION_PERSONAS.length; i++) {
        const persona = EVALUATION_PERSONAS[i];
        const { candidates, embeddingModelUsed } = await retrieveTopKForProfile(
          persona.profile,
          topK,
        );
        embeddingUsed = embeddingModelUsed;
        const { results: matches, modelUsed } = await evaluateMatchesWithGemini(
          persona.profile,
          candidates,
        );
        reasoningUsed = modelUsed;
        detailedMatches[persona.profile.student_id] = matches;
        summary.push(
          computeEvaluationRow(
            persona.profile,
            persona.track_label,
            persona.expected_domains,
            matches,
          ),
        );
        if (i < EVALUATION_PERSONAS.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      const payload: EvaluationBenchmarkResponse = {
        run_at: new Date().toISOString(),
        model: reasoningUsed,
        embedding_model: embeddingUsed,
        summary,
        detailed_matches: detailedMatches,
      };
      res.json(payload);
    } catch (err: unknown) {
      res.status(500).json({ error: formatFriendlyGeminiError(err) });
    }
  });

  // ---- Python Streamlit Codebase Inspector & Exporter ----
  const REPO_FILES = [
    'app.py',
    'api.py',
    'models/schemas.py',
    'services/database.py',
    'services/resume_parser.py',
    'services/rag_pipeline.py',
    'services/matching_agent.py',
    'services/evaluation.py',
    'scripts/generate_dataset.py',
    'requirements.txt',
    'README.md',
  ];

  app.get('/api/repo-files', (_req, res) => {
    const files = REPO_FILES.filter((rel) => fs.existsSync(path.resolve(process.cwd(), rel))).map(
      (rel) => {
        const full = path.resolve(process.cwd(), rel);
        const content = fs.readFileSync(full, 'utf-8');
        return {
          path: rel,
          lines: content.split('\n').length,
          bytes: Buffer.byteLength(content, 'utf-8'),
          content,
        };
      },
    );
    res.json({ files });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Career Companion Agent running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
