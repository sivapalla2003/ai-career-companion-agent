export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
  cgpa: string;
}

export interface ExperienceItem {
  role: string;
  company: string;
  duration: string;
  highlights: string[];
}

export interface ProjectItem {
  title: string;
  tech_stack: string[];
  description: string;
}

export interface CandidateProfile {
  student_id: string;
  full_name: string;
  email: string;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  certifications: string[];
  preferred_roles: string[];
}

export interface InternshipPosting {
  job_id: string;
  job_title: string;
  company: string;
  location: string;
  domain: string;
  stipend: string;
  duration: string;
  job_description: string;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  qualifications: string;
  experience_requirements: string;
  education_requirements: string;
}

export type RecommendationTier = 'Strong Match' | 'Good Fit' | 'Stretch Role';

export interface MatchResult {
  job_id: string;
  job_title: string;
  company: string;
  location: string;
  domain: string;
  match_score: number;
  semantic_similarity: number;
  matched_skills: string[];
  missing_skills: string[];
  education_match: boolean | string;
  experience_match: boolean | string;
  reasoning: string;
  recommendation_tier: RecommendationTier;
}

export interface VectorIndexStatus {
  indexed: boolean;
  indexed_count: number;
  total_postings: number;
  dimension: number;
  model: string;
  backend: string;
  updated_at: string | null;
}

export interface EvaluationPersona {
  track_label: string;
  expected_domains: string[];
  profile: CandidateProfile;
}

export interface EvaluationMetricRow {
  student_id: string;
  student_name: string;
  target_track: string;
  top_k_retrieved: number;
  domain_precision_at_k: number;
  avg_match_score: number;
  top_match_score: number;
  score_consistency_std: number;
  skill_match_accuracy: number;
  strong_matches: number;
  good_fits: number;
  stretch_roles: number;
  top_recommended_role: string;
  status: 'Pass' | 'Needs Review';
}

export interface EvaluationBenchmarkResponse {
  run_at: string;
  model: string;
  embedding_model: string;
  summary: EvaluationMetricRow[];
  detailed_matches: Record<string, MatchResult[]>;
}

export interface UnitTestCaseRow {
  sl_no: number;
  test_case_name: string;
  test_procedure: string;
  condition_to_be_tested: string;
  expected_result: string;
  actual_result: string;
}

export interface DefectTrackerRow {
  sl_no: number;
  submitted_by: string;
  submitted_date: string;
  description: string;
  detected_sprint: string;
  assigned_to: string;
  type_of_defect: 'Logical' | 'User Interface' | 'Maintainability' | 'Standards' | 'Others';
  action_taken: string;
  action_taken_date: string;
  status: 'Open' | 'Closed';
  remarks: string;
}

export interface ProductBacklogRow {
  planned_sprint: string;
  actual_sprint: string;
  us_id: string;
  user_story_description: string;
  moscow: 'Must Have' | 'Should Have' | 'Could Have' | "Won't Have";
  dependency: string;
  assignee: string;
  status: 'Completed' | 'In Progress' | 'Planned';
}

export interface SprintTaskRow {
  us_id: string;
  task_id: string;
  task_description: string;
  task_start_date: string;
  task_completion_date: string;
  team_member: string;
  activity: 'Design' | 'Development' | 'Testing' | 'Documentation' | 'Integration';
  status: 'Completed' | 'In Progress';
  original_estimate_hours: number;
  daily_remaining: number[];
}

export interface ImpedimentRow {
  sprint: string;
  day: string;
  impediments: string;
  action_taken: string;
}

export interface RetrospectiveRow {
  sl_no: number;
  sprint_no: string;
  sprint_start_date: string;
  sprint_end_date: string;
  team_member_name: string;
  start_doing: string;
  stop_doing: string;
  continue_doing: string;
  action_taken: string;
}
