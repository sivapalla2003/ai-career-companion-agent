import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInternshipChunk,
  buildProfileQuery,
  classifyTier,
  computeEvaluationRow,
  computeSkillMatchAccuracy,
  cosineSimilarity,
  normalizeSkill,
  rankPostingsByLexicalCosine,
  serializeToCsv,
  validateCandidateProfile,
  validateInternshipPosting,
} from './matchingEngine';
import type { CandidateProfile, InternshipPosting, MatchResult } from '../types/career';

const sampleProfile: CandidateProfile = {
  student_id: 'EVAL-AIML-01',
  full_name: 'Aarav Deshmukh',
  email: 'aarav.deshmukh@iitb.ac.in',
  skills: ['Python', 'PyTorch', 'RAG', 'LangChain', 'Gemini API', 'ChromaDB', 'FastAPI'],
  education: [
    {
      degree: 'B.Tech Computer Science',
      institution: 'IIT Bombay',
      year: '2026',
      cgpa: '8.9/10',
    },
  ],
  experience: [
    {
      role: 'NLP Research Intern',
      company: 'TCS Research',
      duration: 'May 2025 - Jul 2025',
      highlights: ['Built hybrid RAG pipeline improving Recall@5 by 19%.'],
    },
  ],
  projects: [
    {
      title: 'DocuMind RAG Assistant',
      tech_stack: ['Python', 'Gemini API', 'ChromaDB'],
      description: 'Multi-document semantic search and Q&A system.',
    },
  ],
  certifications: ['Generative AI with LLMs'],
  preferred_roles: ['Generative AI Intern', 'AI/ML Engineering Intern'],
};

const aiPosting: InternshipPosting = {
  job_id: 'INT-001',
  job_title: 'Generative AI Engineering Intern',
  company: 'Infosys Innovation Hub',
  location: 'Bengaluru',
  domain: 'AI/Generative AI',
  stipend: '₹40,000/month',
  duration: '6 Months',
  job_description: 'Build production RAG pipelines and LLM agents using Python and Gemini API.',
  responsibilities: ['Design semantic chunking and vector retrieval pipelines.'],
  required_skills: ['Python', 'PyTorch', 'RAG', 'Gemini API'],
  preferred_skills: ['ChromaDB', 'FastAPI'],
  qualifications: 'Strong ML fundamentals',
  experience_requirements: '1+ AI/ML project',
  education_requirements: 'B.Tech / M.Tech in CS or AI',
};

const uiPosting: InternshipPosting = {
  job_id: 'INT-002',
  job_title: 'UI/UX Design Intern',
  company: 'CRED Experience Labs',
  location: 'Bengaluru',
  domain: 'UI/UX Design',
  stipend: '₹30,000/month',
  duration: '6 Months',
  job_description: 'Create wireframes, design systems, and Figma prototypes for mobile apps.',
  responsibilities: ['Conduct usability testing and design handoff.'],
  required_skills: ['Figma', 'Wireframing', 'User Research'],
  preferred_skills: ['Prototyping', 'Typography'],
  qualifications: 'Portfolio of UX case studies',
  experience_requirements: '2+ UX case studies',
  education_requirements: 'B.Des / B.Tech',
};

test('classifyTier enforces exact score thresholds', () => {
  assert.equal(classifyTier(100), 'Strong Match');
  assert.equal(classifyTier(80), 'Strong Match');
  assert.equal(classifyTier(79), 'Good Fit');
  assert.equal(classifyTier(62), 'Good Fit');
  assert.equal(classifyTier(61), 'Stretch Role');
  assert.equal(classifyTier(0), 'Stretch Role');
});

test('cosineSimilarity computes exact normalized similarity', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
  assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0);
  assert.equal(cosineSimilarity([3, 4], [6, 8]), 1);
  assert.equal(cosineSimilarity([], []), 0);
});

test('chunking and lexical cosine retrieval ranks AI posting above UI posting for AI profile', () => {
  const chunk = buildInternshipChunk(aiPosting);
  assert.ok(chunk.includes('Generative AI Engineering Intern'));
  assert.ok(chunk.includes('Required Skills: Python, PyTorch, RAG, Gemini API'));

  const query = buildProfileQuery(sampleProfile);
  const ranked = rankPostingsByLexicalCosine(query, [uiPosting, aiPosting], 2);
  assert.equal(ranked[0].posting.job_id, 'INT-001');
  assert.ok(ranked[0].similarity > ranked[1].similarity);
});

test('skill match accuracy detects hallucinated vs verified skills', () => {
  assert.equal(normalizeSkill('React.js '), 'react');
  const results: MatchResult[] = [
    {
      job_id: 'INT-001',
      job_title: aiPosting.job_title,
      company: aiPosting.company,
      location: aiPosting.location,
      domain: aiPosting.domain,
      match_score: 91,
      semantic_similarity: 0.88,
      matched_skills: ['Python', 'PyTorch', 'RAG', 'Gemini API'],
      missing_skills: [],
      education_match: true,
      experience_match: true,
      reasoning: 'Strong match across RAG and LLM stack.',
      recommendation_tier: 'Strong Match',
    },
  ];
  assert.equal(computeSkillMatchAccuracy(sampleProfile, results), 100);

  const row = computeEvaluationRow(
    sampleProfile,
    'AI/ML Engineer',
    ['AI/Generative AI', 'Data Science'],
    results,
  );
  assert.equal(row.domain_precision_at_k, 100);
  assert.equal(row.status, 'Pass');
  assert.equal(row.strong_matches, 1);
});

test('form validators reject invalid inputs and accept valid objects', () => {
  assert.ok(validateCandidateProfile({ full_name: '', email: 'bad', skills: [] }).length === 3);
  assert.equal(validateCandidateProfile(sampleProfile).length, 0);

  assert.ok(validateInternshipPosting({ job_title: 'A' }).length >= 4);
  assert.equal(validateInternshipPosting(aiPosting).length, 0);
});

test('serializeToCsv escapes commas, quotes, and arrays properly', () => {
  const csv = serializeToCsv(
    [{ name: 'Sharma, Aarav', note: 'Scored "92%"', skills: ['Python', 'RAG'] }],
    [
      { key: 'name', header: 'Name' },
      { key: 'note', header: 'Note' },
      { key: 'skills', header: 'Skills' },
    ],
  );
  const lines = csv.split('\n');
  assert.equal(lines[0], 'Name,Note,Skills');
  assert.equal(lines[1], '"Sharma, Aarav","Scored ""92%""",Python; RAG');
});
