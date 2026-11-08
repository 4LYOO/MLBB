import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedReference } from "./seed";

/**
 * Schéma SQLite. Chaque donnée importée porte : source_id, captured_at (date de
 * capture), et quand c'est pertinent data_as_of (date des données côté source),
 * rank, period et patch.
 */
export const SCHEMA_VERSION = 2;

const DDL = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, url TEXT,
  reliability INTEGER NOT NULL, access TEXT NOT NULL, terms TEXT NOT NULL, notes TEXT NOT NULL,
  last_sync_at TEXT
);

CREATE TABLE IF NOT EXISTS heroes (
  slug TEXT PRIMARY KEY, name TEXT NOT NULL, roles TEXT NOT NULL, lanes TEXT NOT NULL,
  damage TEXT, range TEXT, difficulty INTEGER, confidence TEXT NOT NULL, incomplete INTEGER NOT NULL,
  portrait_url TEXT, source_id TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hero_profiles (
  slug TEXT PRIMARY KEY, cc INTEGER, mobility INTEGER, durability INTEGER, engage INTEGER,
  peel INTEGER, burst INTEGER, sustain INTEGER, early INTEGER, mid INTEGER, late INTEGER,
  tags TEXT NOT NULL, source_id TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hero_details (
  slug TEXT PRIMARY KEY, skills TEXT, base_stats TEXT, specialities TEXT, lore TEXT,
  source_id TEXT NOT NULL, captured_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hero_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL, rank TEXT NOT NULL, period TEXT NOT NULL,
  win_rate REAL NOT NULL, pick_rate REAL NOT NULL, ban_rate REAL NOT NULL,
  source_id TEXT NOT NULL, captured_at TEXT NOT NULL, data_as_of TEXT, patch TEXT,
  UNIQUE (slug, rank, period, source_id, captured_at)
);
CREATE INDEX IF NOT EXISTS idx_stats_lookup ON hero_stats (rank, period, captured_at);

CREATE TABLE IF NOT EXISTS matchups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL, other TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('counter','synergy')),
  score REAL NOT NULL, unit TEXT NOT NULL, rank TEXT, source_id TEXT NOT NULL, captured_at TEXT NOT NULL,
  UNIQUE (slug, other, kind, source_id, captured_at)
);

CREATE TABLE IF NOT EXISTS pro_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL, tournament TEXT NOT NULL, picks INTEGER, bans INTEGER, wins INTEGER,
  games_total INTEGER, source_id TEXT NOT NULL, captured_at TEXT NOT NULL,
  UNIQUE (slug, tournament, source_id, captured_at)
);

CREATE TABLE IF NOT EXISTS items (
  slug TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, tags TEXT NOT NULL,
  use TEXT, price INTEGER, stats TEXT, passive TEXT, image_url TEXT,
  source_id TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hero TEXT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL,
  items TEXT NOT NULL, emblem TEXT, talents TEXT, spell TEXT, notes TEXT,
  sample_size INTEGER, source_id TEXT NOT NULL, captured_at TEXT NOT NULL, is_user INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS patches (
  version TEXT PRIMARY KEY, date TEXT, server TEXT, title TEXT, url TEXT,
  source_id TEXT NOT NULL, captured_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS patch_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT NOT NULL,
  target_type TEXT NOT NULL, target TEXT NOT NULL, change TEXT NOT NULL, text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, connector TEXT NOT NULL, source_id TEXT,
  started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL, records INTEGER DEFAULT 0, message TEXT
);

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1), nickname TEXT, player_id TEXT, server TEXT,
  rank TEXT, stars INTEGER, main_role TEXT, second_role TEXT, favorite_heroes TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT, played_at TEXT NOT NULL, hero TEXT NOT NULL, role TEXT,
  result TEXT NOT NULL CHECK (result IN ('win','loss')), kills INTEGER NOT NULL, deaths INTEGER NOT NULL,
  assists INTEGER NOT NULL, duration_min REAL, mvp INTEGER NOT NULL DEFAULT 0, rank TEXT, notes TEXT,
  entry TEXT NOT NULL DEFAULT 'manual', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, mode TEXT NOT NULL, state TEXT NOT NULL,
  summary TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  kind TEXT NOT NULL, ref TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (kind, ref)
);

CREATE TABLE IF NOT EXISTS saved_filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT, page TEXT NOT NULL, name TEXT NOT NULL, params TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog (
  kind TEXT NOT NULL, slug TEXT NOT NULL, data TEXT NOT NULL, source_id TEXT NOT NULL, captured_at TEXT NOT NULL,
  PRIMARY KEY (kind, slug)
);

CREATE TABLE IF NOT EXISTS recent (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, ref TEXT NOT NULL, label TEXT NOT NULL, at TEXT NOT NULL
);
`;

export type DB = Database.Database;

declare global {
  // eslint-disable-next-line no-var
  var __mlbbDb: DB | undefined;
}

export function dbPath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "mlbb-companion.db");
}

export function openDb(file = dbPath()): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(DDL);
  migrate(db);
  seedReference(db);
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
  return db;
}

/** Migrations additives (bases créées par une version antérieure). */
function migrate(db: DB) {
  const cols = (t: string) => new Set((db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name));
  if (!cols("hero_details").has("extras")) db.exec("ALTER TABLE hero_details ADD COLUMN extras TEXT");
}

/** Connexion partagée (réutilisée entre rechargements en développement). */
export function getDb(): DB {
  if (!globalThis.__mlbbDb) globalThis.__mlbbDb = openDb();
  return globalThis.__mlbbDb;
}

export const now = () => new Date().toISOString();
export const j = (v: unknown) => JSON.stringify(v);
export function pj<T>(v: string | null | undefined, fallback: T): T {
  if (v == null) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
