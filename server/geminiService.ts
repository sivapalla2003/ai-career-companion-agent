import crypto from 'node:crypto';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { CandidateProfile, InternshipPosting, MatchResult } from '../src/types/career';
import { classifyTier } from '../src/utils/matchingEngine';
import { runWithModelFailover } from './geminiResilience';

export const REASONING_MODEL = 'gemini-4-hydrogen';
export const FALLBACK_REASONING_MODEL = 'gemini-3.1-flash-lite';
export const PRIMARY_EMBEDDING_MODEL = 'gemini-embedding-001';
export const FALLBACK_EMBEDDING_MODEL = 'gemini-embedding-2';

const REASONING_MODEL_CHAIN = [REASONING_MODEL, FALLBACK_REASONING_MODEL];
const EMBEDDING_MODEL_CHAIN = [PRIMARY_EMBEDDING_MODEL, FALLBACK_EMBEDDING_MODEL];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured in Settings > Secrets. Please set a valid Gemini API key to execute live Gemini parsing, embeddings, and matching.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildStructuredConfig(model: string, responseSchema: Record<string, unknown>) {
  const base: Record<string, unknown> = {
    responseMimeType: 'application/json',
    responseSchema,
  };
  if (model === REASONING_MODEL) {
    // Low thinking level cuts latency and high-demand 503 pressure for structured JSON extraction
    base.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }
  return base;
}

const candidateProfileSchema = {
  type: Type.OBJECT,
  properties: {
    student_id: { type: Type.STRING },
    full_name: { type: Type.STRING },
    email: { type: Type.STRING },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          degree: { type: Type.STRING },
          institution: { type: Type.STRING },
          year: { type: Type.STRING },
          cgpa: { type: Type.STRING },
        },
        required: ['degree', 'institution', 'year', 'cgpa'],
      },
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          company: { type: Type.STRING },
          duration: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['role', 'company', 'duration', 'highlights'],
      },
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          tech_stack: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING },
        },
        required: ['title', 'tech_stack', 'description'],
      },
    },
    certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
    preferred_roles: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'full_name',
    'email',
    'skills',
    'education',
    'experience',
    'projects',
    'certifications',
    'preferred_roles',
  ],
};

const batchMatchSchema = {
  type: Type.OBJECT,
  properties: {
    evaluations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          job_id: { type: Type.STRING },
          job_title: { type: Type.STRING },
          company: { type: Type.STRING },
          match_score: { type: Type.INTEGER },
          matched_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          missing_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          education_match: { type: Type.STRING },
          experience_match: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          recommendation_tier: { type: Type.STRING },
        },
        required: [
          'job_id',
          'job_title',
          'company',
          'match_score',
          'matched_skills',
          'missing_skills',
          'education_match',
          'experience_match',
          'reasoning',
          'recommendation_tier',
        ],
      },
    },
  },
  required: ['evaluations'],
};

export async function parseResumeWithGemini(input: {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
}): Promise<{ profile: CandidateProfile; modelUsed: string }> {
  const ai = getGeminiClient();

  const instruction =
    'You are an expert technical recruiter and structured resume parser for university internships. ' +
    'Extract factual details from the resume into the strict CandidateProfile JSON schema. ' +
    'Normalize technical skills cleanly (e.g., React.js -> React), infer 2-4 realistic preferred_roles ' +
    'based on the candidate skills/projects if not explicitly stated, and never fabricate degrees or companies.';

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (input.fileBase64 && input.mimeType) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.fileBase64,
      },
    });
    parts.push({ text: instruction });
  } else {
    const cleaned = (input.text ?? '').trim();
    if (cleaned.length < 30) {
      throw new Error('Resume text must contain at least 30 characters before parsing.');
    }
    parts.push({ text: `${instruction}\n\nRESUME TEXT:\n${cleaned}` });
  }

  const { result: response, modelUsed } = await runWithModelFailover(
    REASONING_MODEL_CHAIN,
    (model) =>
      ai.models.generateContent({
        model,
        contents: { parts },
        config: buildStructuredConfig(model, candidateProfileSchema),
      }),
    { attemptsPerModel: 3, baseDelayMs: 900 },
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty response while parsing the resume.');
  }

  const parsed = JSON.parse(rawText) as CandidateProfile;
  const profile: CandidateProfile = {
    student_id:
      parsed.student_id && parsed.student_id.trim().length > 0
        ? parsed.student_id.trim()
        : `STU-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    full_name: parsed.full_name?.trim() || 'Unnamed Candidate',
    email: parsed.email?.trim() || '',
    skills: Array.from(new Set((parsed.skills ?? []).map((s) => s.trim()).filter(Boolean))),
    education: Array.isArray(parsed.education) ? parsed.education : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    certifications: Array.from(
      new Set((parsed.certifications ?? []).map((c) => c.trim()).filter(Boolean)),
    ),
    preferred_roles: Array.from(
      new Set((parsed.preferred_roles ?? []).map((r) => r.trim()).filter(Boolean)),
    ),
  };

  return { profile, modelUsed };
}

export async function embedTextsWithGemini(
  texts: string[],
): Promise<{ embeddings: number[][]; modelUsed: string }> {
  const ai = getGeminiClient();
  let preferredOrder = [...EMBEDDING_MODEL_CHAIN];
  let lastModelUsed = PRIMARY_EMBEDDING_MODEL;
  const allEmbeddings: number[][] = [];
  const batchSize = 20;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { result, modelUsed } = await runWithModelFailover(
      preferredOrder,
      (model) =>
        ai.models.embedContent({
          model,
          contents: batch,
        }),
      { attemptsPerModel: 3, baseDelayMs: 800 },
    );

    lastModelUsed = modelUsed;
    // Keep embedding dimension consistent across all batches if we switched models on batch 0
    if (i === 0 && modelUsed !== preferredOrder[0]) {
      preferredOrder = [modelUsed];
    }

    const batchVectors = result.embeddings ?? [];
    for (const emb of batchVectors) {
      const vals = emb.values ?? [];
      let normSq = 0;
      for (const v of vals) normSq += v * v;
      const norm = Math.sqrt(normSq) || 1;
      allEmbeddings.push(vals.map((v) => v / norm));
    }

    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  return { embeddings: allEmbeddings, modelUsed: lastModelUsed };
}

export async function evaluateMatchesWithGemini(
  profile: CandidateProfile,
  candidates: Array<{ posting: InternshipPosting; similarity: number }>,
): Promise<{ results: MatchResult[]; modelUsed: string }> {
  if (candidates.length === 0) return { results: [], modelUsed: REASONING_MODEL };
  const ai = getGeminiClient();

  const postingLookup = new Map(candidates.map((c) => [c.posting.job_id, c]));

  const jobsPayload = candidates.map(({ posting, similarity }) => ({
    job_id: posting.job_id,
    job_title: posting.job_title,
    company: posting.company,
    location: posting.location,
    domain: posting.domain,
    semantic_similarity: similarity,
    required_skills: posting.required_skills,
    preferred_skills: posting.preferred_skills,
    education_requirements: posting.education_requirements,
    experience_requirements: posting.experience_requirements,
    responsibilities: posting.responsibilities,
  }));

  const prompt =
    'You are the Job-Resume Matching Agent for an AI Career Companion platform. ' +
    'Evaluate the student profile against EVERY internship posting below. ' +
    'Score each internship from 0 to 100 using weights: ' +
    'Required skills 45%, Preferred skills & projects 25%, Experience & responsibilities 15%, Education 15%.\n' +
    'Strict rules:\n' +
    '1. matched_skills must ONLY list skills genuinely evidenced in the candidate profile.\n' +
    '2. missing_skills must list required skills from the internship that are absent from the candidate profile.\n' +
    '3. education_match and experience_match should be concise status phrases (e.g., "Aligned — B.Tech CS meets requirement" or "Partial — 1 project vs preferred prior internship").\n' +
    '4. recommendation_tier: >=80 Strong Match, 62-79 Good Fit, <62 Stretch Role.\n' +
    '5. reasoning: 2-3 clear sentences explaining why the role fits or what gaps exist.\n\n' +
    `CANDIDATE PROFILE:\n${JSON.stringify(profile, null, 2)}\n\n` +
    `CANDIDATE INTERNSHIPS:\n${JSON.stringify(jobsPayload, null, 2)}`;

  const { result: response, modelUsed } = await runWithModelFailover(
    REASONING_MODEL_CHAIN,
    (model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: buildStructuredConfig(model, batchMatchSchema),
      }),
    { attemptsPerModel: 3, baseDelayMs: 900 },
  );

  const rawText = (response.text ?? '{"evaluations":[]}').trim();
  const parsed = JSON.parse(rawText) as { evaluations: MatchResult[] };
  const results: MatchResult[] = (parsed.evaluations ?? []).map((item) => {
    const entry = postingLookup.get(item.job_id);
    const boundedScore = Math.max(0, Math.min(100, Math.round(Number(item.match_score) || 0)));
    return {
      job_id: item.job_id,
      job_title: entry?.posting.job_title ?? item.job_title,
      company: entry?.posting.company ?? item.company,
      location: entry?.posting.location ?? '',
      domain: entry?.posting.domain ?? '',
      match_score: boundedScore,
      semantic_similarity: entry?.similarity ?? 0,
      matched_skills: Array.isArray(item.matched_skills) ? item.matched_skills : [],
      missing_skills: Array.isArray(item.missing_skills) ? item.missing_skills : [],
      education_match: item.education_match ?? 'Aligned',
      experience_match: item.experience_match ?? 'Aligned',
      reasoning: item.reasoning ?? '',
      recommendation_tier: classifyTier(boundedScore),
    };
  });

  results.sort((a, b) => b.match_score - a.match_score);
  return { results, modelUsed };
}
