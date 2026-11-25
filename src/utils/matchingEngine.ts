import type {
  CandidateProfile,
  EvaluationMetricRow,
  InternshipPosting,
  MatchResult,
  RecommendationTier,
} from '../types/career';

export function normalizeSkill(skill: string): string {
  return skill
    .trim()
    .toLowerCase()
    .replace(/\.js$/g, '')
    .replace(/[^a-z0-9+#/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyTier(score: number): RecommendationTier {
  if (score >= 80) return 'Strong Match';
  if (score >= 62) return 'Good Fit';
  return 'Stretch Role';
}

export function buildInternshipChunk(posting: InternshipPosting): string {
  return [
    `Role: ${posting.job_title} at ${posting.company} (${posting.location}) | Domain: ${posting.domain}`,
    `Required Skills: ${posting.required_skills.join(', ')}`,
    `Preferred Skills: ${posting.preferred_skills.join(', ')}`,
    `Education: ${posting.education_requirements} | Experience: ${posting.experience_requirements}`,
    `Qualifications: ${posting.qualifications}`,
    `Responsibilities: ${posting.responsibilities.join('; ')}`,
    `Description: ${posting.job_description}`,
  ].join('\n');
}

export function buildProfileQuery(profile: CandidateProfile): string {
  const eduSummary = profile.education
    .map((e) => `${e.degree} (${e.institution})`)
    .join('; ');
  const projSummary = profile.projects
    .slice(0, 4)
    .map((p) => `${p.title} [${p.tech_stack.join(', ')}]: ${p.description}`)
    .join('; ');
  const expSummary = profile.experience
    .slice(0, 3)
    .map((e) => `${e.role} at ${e.company}`)
    .join('; ');

  return [
    `Target Roles: ${profile.preferred_roles.join(', ')}`,
    `Core Skills: ${profile.skills.join(', ')}`,
    `Education: ${eduSummary}`,
    `Experience: ${expSummary}`,
    `Projects: ${projSummary}`,
  ].join('\n');
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const raw = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, Number(raw.toFixed(4))));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#/]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function rankPostingsByLexicalCosine(
  queryText: string,
  postings: InternshipPosting[],
  topK: number,
): Array<{ posting: InternshipPosting; similarity: number }> {
  const docs = postings.map((p) => tokenize(buildInternshipChunk(p)));
  const queryTokens = tokenize(queryText);
  const df = new Map<string, number>();

  for (const tokens of docs) {
    const unique = new Set(tokens);
    for (const token of unique) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  const totalDocs = Math.max(1, docs.length);
  const idf = (term: string): number =>
    Math.log((totalDocs + 1) / ((df.get(term) ?? 0) + 1)) + 1;

  const toTfIdfMap = (tokens: string[]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    const weights = new Map<string, number>();
    for (const [term, count] of counts.entries()) {
      weights.set(term, (1 + Math.log(count)) * idf(term));
    }
    return weights;
  };

  const qVec = toTfIdfMap(queryTokens);
  let qNormSq = 0;
  for (const w of qVec.values()) qNormSq += w * w;
  const qNorm = Math.sqrt(qNormSq);

  const scored = postings.map((posting, idx) => {
    const dVec = toTfIdfMap(docs[idx]);
    let dot = 0;
    let dNormSq = 0;
    for (const [term, w] of dVec.entries()) {
      dNormSq += w * w;
      const qw = qVec.get(term);
      if (qw) dot += w * qw;
    }
    const denom = qNorm * Math.sqrt(dNormSq);
    const similarity = denom > 0 ? Math.max(0, Math.min(1, Number((dot / denom).toFixed(4)))) : 0;
    return { posting, similarity };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

export function computeSkillMatchAccuracy(
  profile: CandidateProfile,
  matches: MatchResult[],
): number {
  const candidateSkills = profile.skills.map(normalizeSkill).filter(Boolean);
  if (matches.length === 0) return 0;

  let totalClaimed = 0;
  let verified = 0;
  for (const match of matches) {
    for (const skill of match.matched_skills) {
      totalClaimed += 1;
      const norm = normalizeSkill(skill);
      if (
        candidateSkills.some(
          (cand) => cand === norm || cand.includes(norm) || norm.includes(cand),
        )
      ) {
        verified += 1;
      }
    }
  }
  if (totalClaimed === 0) return 100;
  return Number(((verified / totalClaimed) * 100).toFixed(1));
}

export function computeEvaluationRow(
  profile: CandidateProfile,
  targetTrack: string,
  expectedDomains: string[],
  matches: MatchResult[],
): EvaluationMetricRow {
  const expectedSet = new Set(expectedDomains);
  const relevantCount = matches.filter((m) => expectedSet.has(m.domain)).length;
  const precisionAtK = Number(((relevantCount / Math.max(1, matches.length)) * 100).toFixed(1));
  const scores = matches.map((m) => m.match_score);
  const avgScore =
    scores.length > 0
      ? Number((scores.reduce((acc, s) => acc + s, 0) / scores.length).toFixed(1))
      : 0;
  const topScore = scores.length > 0 ? Math.max(...scores) : 0;
  const variance =
    scores.length > 1
      ? scores.reduce((acc, s) => acc + (s - avgScore) ** 2, 0) / scores.length
      : 0;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));
  const skillAcc = computeSkillMatchAccuracy(profile, matches);

  const strongMatches = matches.filter((m) => m.recommendation_tier === 'Strong Match').length;
  const goodFits = matches.filter((m) => m.recommendation_tier === 'Good Fit').length;
  const stretchRoles = matches.filter((m) => m.recommendation_tier === 'Stretch Role').length;
  const topRole =
    matches.length > 0 ? `${matches[0].job_title} @ ${matches[0].company}` : 'N/A';

  const status =
    precisionAtK >= 70 && skillAcc >= 85 && topScore >= 70 ? 'Pass' : 'Needs Review';

  return {
    student_id: profile.student_id,
    student_name: profile.full_name,
    target_track: targetTrack,
    top_k_retrieved: matches.length,
    domain_precision_at_k: precisionAtK,
    avg_match_score: avgScore,
    top_match_score: topScore,
    score_consistency_std: stdDev,
    skill_match_accuracy: skillAcc,
    strong_matches: strongMatches,
    good_fits: goodFits,
    stretch_roles: stretchRoles,
    top_recommended_role: topRole,
    status,
  };
}

export function validateCandidateProfile(profile: Partial<CandidateProfile>): string[] {
  const errors: string[] = [];
  if (!profile.full_name || profile.full_name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }
  if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
    errors.push('A valid email address is required.');
  }
  if (!profile.skills || profile.skills.length === 0) {
    errors.push('At least one technical or domain skill is required.');
  }
  return errors;
}

export function validateInternshipPosting(posting: Partial<InternshipPosting>): string[] {
  const errors: string[] = [];
  if (!posting.job_title || posting.job_title.trim().length < 3) {
    errors.push('Job title must be at least 3 characters.');
  }
  if (!posting.company || posting.company.trim().length < 2) {
    errors.push('Company name is required.');
  }
  if (!posting.location || posting.location.trim().length < 2) {
    errors.push('Location is required.');
  }
  if (!posting.required_skills || posting.required_skills.length === 0) {
    errors.push('At least one required skill must be provided.');
  }
  if (!posting.job_description || posting.job_description.trim().length < 20) {
    errors.push('Job description must be at least 20 characters.');
  }
  return errors;
}

export function serializeToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T; header: string }>,
): string {
  const escapeCell = (val: unknown): string => {
    const str = Array.isArray(val) ? val.join('; ') : String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = columns.map((c) => escapeCell(c.header)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(','),
  );
  return [headerLine, ...dataLines].join('\n');
}
