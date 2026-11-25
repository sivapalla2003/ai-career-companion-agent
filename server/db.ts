import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import type { CandidateProfile, MatchResult } from '../src/types/career';
import { EVALUATION_PERSONAS } from '../src/data/sampleProfiles';

export class CareerSqliteStore {
  private db: Database.Database;

  constructor(dbPath = 'career_companion.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
    this.seedDefaultsIfEmpty();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        student_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        profile_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS match_history (
        run_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        top_k INTEGER NOT NULL,
        results_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  private seedDefaultsIfEmpty(): void {
    const row = this.db
      .prepare('SELECT COUNT(*) as cnt FROM student_profiles')
      .get() as { cnt: number };
    if (row.cnt === 0) {
      for (const persona of EVALUATION_PERSONAS) {
        this.saveProfile(persona.profile);
      }
    }
  }

  listProfiles(): CandidateProfile[] {
    const rows = this.db
      .prepare('SELECT profile_json FROM student_profiles ORDER BY updated_at DESC')
      .all() as Array<{ profile_json: string }>;
    return rows.map((r) => JSON.parse(r.profile_json) as CandidateProfile);
  }

  getProfile(studentId: string): CandidateProfile | null {
    const row = this.db
      .prepare('SELECT profile_json FROM student_profiles WHERE student_id = ?')
      .get(studentId) as { profile_json: string } | undefined;
    return row ? (JSON.parse(row.profile_json) as CandidateProfile) : null;
  }

  saveProfile(profile: CandidateProfile): CandidateProfile {
    const now = new Date().toISOString();
    const studentId =
      profile.student_id && profile.student_id.trim().length > 0
        ? profile.student_id.trim()
        : `STU-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const stored: CandidateProfile = {
      ...profile,
      student_id: studentId,
      full_name: profile.full_name.trim(),
      email: profile.email.trim(),
      skills: Array.from(new Set(profile.skills.map((s) => s.trim()).filter(Boolean))),
      certifications: Array.from(
        new Set((profile.certifications ?? []).map((c) => c.trim()).filter(Boolean)),
      ),
      preferred_roles: Array.from(
        new Set((profile.preferred_roles ?? []).map((r) => r.trim()).filter(Boolean)),
      ),
    };

    const existing = this.db
      .prepare('SELECT created_at FROM student_profiles WHERE student_id = ?')
      .get(studentId) as { created_at: string } | undefined;

    this.db
      .prepare(
        `
        INSERT INTO student_profiles (
          student_id, full_name, email, profile_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id) DO UPDATE SET
          full_name = excluded.full_name,
          email = excluded.email,
          profile_json = excluded.profile_json,
          updated_at = excluded.updated_at
        `,
      )
      .run(
        studentId,
        stored.full_name,
        stored.email,
        JSON.stringify(stored),
        existing?.created_at ?? now,
        now,
      );

    return stored;
  }

  deleteProfile(studentId: string): boolean {
    const info = this.db
      .prepare('DELETE FROM student_profiles WHERE student_id = ?')
      .run(studentId);
    return info.changes > 0;
  }

  saveMatchRun(studentId: string, results: MatchResult[], topK: number): string {
    const runId = `RUN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        INSERT INTO match_history (run_id, student_id, top_k, results_json, created_at)
        VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(runId, studentId, topK, JSON.stringify(results), now);
    return runId;
  }
}
