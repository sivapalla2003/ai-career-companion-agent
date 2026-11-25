"""SQLite persistence layer for student profiles and matching history."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from models.schemas import CandidateProfile, MatchResult

DEFAULT_DB_PATH = Path("career_companion.db")


class CareerDatabase:
    """Thread-safe SQLite repository for Career Companion profiles and match logs."""

    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS student_profiles (
                    student_id TEXT PRIMARY KEY,
                    full_name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    profile_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS match_history (
                    run_id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    top_k INTEGER NOT NULL,
                    results_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id)
                )
                """
            )
            conn.commit()

    def save_profile(self, profile: CandidateProfile) -> CandidateProfile:
        """Insert or update a CandidateProfile in SQLite."""
        now = datetime.now(timezone.utc).isoformat()
        student_id = profile.student_id.strip() if profile.student_id else ""
        if not student_id:
            student_id = f"STU-{uuid.uuid4().hex[:8].upper()}"

        stored = profile.model_copy(update={"student_id": student_id})
        payload = stored.model_dump_json()

        with self._connect() as conn:
            existing = conn.execute(
                "SELECT created_at FROM student_profiles WHERE student_id = ?",
                (student_id,),
            ).fetchone()
            created_at = existing["created_at"] if existing else now
            conn.execute(
                """
                INSERT INTO student_profiles (
                    student_id, full_name, email, profile_json, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(student_id) DO UPDATE SET
                    full_name = excluded.full_name,
                    email = excluded.email,
                    profile_json = excluded.profile_json,
                    updated_at = excluded.updated_at
                """,
                (student_id, stored.full_name, stored.email, payload, created_at, now),
            )
            conn.commit()
        return stored

    def list_profiles(self) -> list[CandidateProfile]:
        """Return all saved student profiles sorted by most recently updated."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT profile_json FROM student_profiles ORDER BY updated_at DESC"
            ).fetchall()
        return [CandidateProfile.model_validate_json(row["profile_json"]) for row in rows]

    def get_profile(self, student_id: str) -> Optional[CandidateProfile]:
        """Fetch a single student profile by ID."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT profile_json FROM student_profiles WHERE student_id = ?",
                (student_id,),
            ).fetchone()
        if not row:
            return None
        return CandidateProfile.model_validate_json(row["profile_json"])

    def delete_profile(self, student_id: str) -> bool:
        """Delete a profile by ID."""
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM student_profiles WHERE student_id = ?",
                (student_id,),
            )
            conn.commit()
        return cursor.rowcount > 0

    def save_match_run(
        self,
        student_id: str,
        results: list[MatchResult],
        top_k: int,
    ) -> str:
        """Persist a match run for auditability and evaluation."""
        run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        payload = json.dumps([r.model_dump() for r in results], ensure_ascii=False)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO match_history (run_id, student_id, top_k, results_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (run_id, student_id, top_k, payload, now),
            )
            conn.commit()
        return run_id
