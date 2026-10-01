import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

// Loaded via require so bundlers/test runners do not strip the `node:` prefix
// (`sqlite` is only resolvable with it).
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = DatabaseSyncType;

export interface UserRow {
  uid: string;
  display_name: string;
}

export interface EntryRow {
  uid: string;
  week: number;
  steps: number;
  updated_at: string;
}

export interface PublicCandidateRow extends EntryRow {
  display_name: string;
}

export function openDb(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      name_customised INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entries (
      uid TEXT NOT NULL REFERENCES users(uid),
      week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 12),
      steps INTEGER NOT NULL CHECK (steps >= 0),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (uid, week)
    ) WITHOUT ROWID;
  `);
  return db;
}

export class Store {
  constructor(private readonly db: DatabaseSync) {}

  /** Create the user on first sight; keep a customised name over the token's. */
  upsertUser(uid: string, tokenName: string, now: string): UserRow {
    this.db
      .prepare(
        `INSERT INTO users (uid, display_name, created_at) VALUES (?, ?, ?)
         ON CONFLICT(uid) DO UPDATE SET
           display_name = CASE WHEN name_customised = 1 THEN display_name ELSE excluded.display_name END`,
      )
      .run(uid, tokenName, now);
    return this.db.prepare("SELECT uid, display_name FROM users WHERE uid = ?").get(uid) as unknown as UserRow;
  }

  setDisplayName(uid: string, name: string): void {
    this.db.prepare("UPDATE users SET display_name = ?, name_customised = 1 WHERE uid = ?").run(name, uid);
  }

  saveEntry(uid: string, week: number, steps: number, now: string): void {
    this.db
      .prepare(
        `INSERT INTO entries (uid, week, steps, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(uid, week) DO UPDATE SET steps = excluded.steps, updated_at = excluded.updated_at`,
      )
      .run(uid, week, steps, now);
  }

  ownEntries(uid: string): EntryRow[] {
    return this.db
      .prepare("SELECT uid, week, steps, updated_at FROM entries WHERE uid = ? ORDER BY week")
      .all(uid) as unknown as EntryRow[];
  }

  /** Other participants' complete histories once their challenge total qualifies. */
  publicEntriesOfOthers(uid: string, minSteps: number): PublicCandidateRow[] {
    return this.db
      .prepare(
        `SELECT e.uid, e.week, e.steps, e.updated_at, u.display_name
         FROM entries e JOIN users u ON u.uid = e.uid
         WHERE e.uid <> ?
           AND e.uid IN (
             SELECT uid FROM entries GROUP BY uid HAVING SUM(steps) >= ?
           )
         ORDER BY e.uid, e.week`,
      )
      .all(uid, minSteps) as unknown as PublicCandidateRow[];
  }
}
