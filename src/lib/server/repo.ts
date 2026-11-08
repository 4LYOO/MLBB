import { getDb, j, now, pj, type DB } from "./db";
import type { Hero, HeroProfile, HeroStat, Period, Rank, Source, Tag } from "@/lib/domain";

const db = (): DB => getDb();

// ---------------------------------------------------------------- Sources
export function getSources(): Source[] {
  return db()
    .prepare("SELECT * FROM sources ORDER BY reliability DESC, name")
    .all()
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      url: r.url,
      reliability: r.reliability,
      access: r.access,
      terms: r.terms,
      notes: r.notes,
      lastSyncAt: r.last_sync_at,
    }));
}

export function getSourceMap(): Record<string, Source> {
  return Object.fromEntries(getSources().map((s) => [s.id, s]));
}

export function ensureSource(s: { id: string; name: string; kind: string; url?: string | null; reliability?: number }) {
  db()
    .prepare(
      `INSERT INTO sources (id, name, kind, url, reliability, access, terms, notes)
       VALUES (@id, @name, @kind, @url, @reliability, 'Importée via fichier', 'Voir la source d''origine', '')
       ON CONFLICT(id) DO NOTHING`,
    )
    .run({ id: s.id, name: s.name, kind: s.kind, url: s.url ?? null, reliability: s.reliability ?? 3 });
}

// ---------------------------------------------------------------- Héros
function rowToHero(r: any): Hero {
  const profile: HeroProfile | null =
    r.cc == null
      ? null
      : {
          cc: r.cc,
          mobility: r.mobility,
          durability: r.durability,
          engage: r.engage,
          peel: r.peel,
          burst: r.burst,
          sustain: r.sustain,
          early: r.early,
          mid: r.mid,
          late: r.late,
          tags: pj<Tag[]>(r.tags, []),
        };
  return {
    slug: r.slug,
    name: r.name,
    roles: pj(r.roles, []),
    lanes: pj(r.lanes, []),
    damage: r.damage,
    range: r.range,
    difficulty: r.difficulty,
    confidence: r.confidence,
    incomplete: !!r.incomplete,
    portraitUrl: r.portrait_url,
    profile,
    sourceId: r.source_id,
    updatedAt: r.updated_at,
  };
}

const HERO_SQL = `SELECT h.*, p.cc, p.mobility, p.durability, p.engage, p.peel, p.burst, p.sustain,
  p.early, p.mid, p.late, p.tags FROM heroes h LEFT JOIN hero_profiles p ON p.slug = h.slug`;

export function getHeroes(): Hero[] {
  return db().prepare(`${HERO_SQL} ORDER BY h.name COLLATE NOCASE`).all().map(rowToHero);
}

export function getHero(slug: string): Hero | null {
  const r = db().prepare(`${HERO_SQL} WHERE h.slug = ?`).get(slug);
  return r ? rowToHero(r) : null;
}

export interface HeroDetails {
  skills: { key: string; name: string; type?: string; description?: string; cooldown?: string | null; cost?: string | null }[] | null;
  baseStats: Record<string, number> | null;
  specialities: string[] | null;
  lore: string | null;
  extras: {
    emblemConsensus?: { main?: { name: string; count: number; sampleSize: number; share?: number }; talents?: { section: number; name: string; count: number; sampleSize: number }[]; sampleSize?: number; smallSample?: boolean } | null;
    battleSpellConsensus?: { primary?: { name: string; count: number; share: number }; alternative?: { name: string; count: number; share: number }; sampleSize?: number; smallSample?: boolean } | null;
    ratings?: Record<string, number>;
    sourceTier?: string | null;
    statisticsUpdatedAt?: string | null;
  } | null;
  sourceId: string;
  capturedAt: string;
}
export function getHeroDetails(slug: string): HeroDetails | null {
  const r: any = db().prepare("SELECT * FROM hero_details WHERE slug = ?").get(slug);
  if (!r) return null;
  return {
    skills: pj(r.skills, null),
    baseStats: pj(r.base_stats, null),
    specialities: pj(r.specialities, null),
    lore: r.lore,
    extras: pj(r.extras, null),
    sourceId: r.source_id,
    capturedAt: r.captured_at,
  };
}

// ---------------------------------------------------------------- Statistiques
const rowToStat = (r: any): HeroStat => ({
  slug: r.slug,
  rank: r.rank,
  period: r.period,
  winRate: r.win_rate,
  pickRate: r.pick_rate,
  banRate: r.ban_rate,
  sourceId: r.source_id,
  capturedAt: r.captured_at,
  dataAsOf: r.data_as_of,
  patch: r.patch,
});

export interface StatSnapshot {
  rank: Rank;
  period: Period;
  sourceId: string | null;
  capturedAt: string | null;
  dataAsOf: string | null;
  patch: string | null;
  stats: HeroStat[];
}

/**
 * Dernière capture disponible pour (rang, période). Si plusieurs sources ont capturé,
 * la plus récente l'emporte ; à date égale, la plus fiable.
 */
export function getLatestSnapshot(rank: Rank, period: Period): StatSnapshot {
  const head: any = db()
    .prepare(
      `SELECT s.source_id, s.captured_at, MAX(s.data_as_of) AS data_as_of, MAX(s.patch) AS patch
       FROM hero_stats s JOIN sources src ON src.id = s.source_id
       WHERE s.rank = ? AND s.period = ?
       GROUP BY s.source_id, s.captured_at
       ORDER BY s.captured_at DESC, src.reliability DESC LIMIT 1`,
    )
    .get(rank, period);
  if (!head) return { rank, period, sourceId: null, capturedAt: null, dataAsOf: null, patch: null, stats: [] };
  const stats = db()
    .prepare("SELECT * FROM hero_stats WHERE rank = ? AND period = ? AND source_id = ? AND captured_at = ?")
    .all(rank, period, head.source_id, head.captured_at)
    .map(rowToStat);
  return { rank, period, sourceId: head.source_id, capturedAt: head.captured_at, dataAsOf: head.data_as_of, patch: head.patch, stats };
}

/** Historique d'un héros (toutes captures) pour un rang et une période. */
export function getStatHistory(slug: string, rank: Rank, period: Period): HeroStat[] {
  return db()
    .prepare("SELECT * FROM hero_stats WHERE slug = ? AND rank = ? AND period = ? ORDER BY captured_at")
    .all(slug, rank, period)
    .map(rowToStat);
}

/** Historique global : moyenne par capture (évolution de la méta). */
export function getCaptureTimeline(rank: Rank, period: Period) {
  return db()
    .prepare(
      `SELECT captured_at, source_id, COUNT(*) AS n, AVG(win_rate) AS avg_wr, AVG(pick_rate) AS avg_pr, AVG(ban_rate) AS avg_br
       FROM hero_stats WHERE rank = ? AND period = ? GROUP BY captured_at, source_id ORDER BY captured_at`,
    )
    .all(rank, period) as { captured_at: string; source_id: string; n: number; avg_wr: number; avg_pr: number; avg_br: number }[];
}

/** Toutes les stats d'un héros, dernière capture par (rang, période). */
export function getHeroStatMatrix(slug: string): HeroStat[] {
  return db()
    .prepare(
      `SELECT s.* FROM hero_stats s
       JOIN (SELECT rank, period, MAX(captured_at) AS mc FROM hero_stats WHERE slug = ? GROUP BY rank, period) m
         ON m.rank = s.rank AND m.period = s.period AND m.mc = s.captured_at
       WHERE s.slug = ?`,
    )
    .all(slug, slug)
    .map(rowToStat);
}

export function getAvailableStatKeys(): { rank: Rank; period: Period; captures: number; last: string }[] {
  return db()
    .prepare("SELECT rank, period, COUNT(DISTINCT captured_at) AS captures, MAX(captured_at) AS last FROM hero_stats GROUP BY rank, period")
    .all() as any;
}

// ---------------------------------------------------------------- Matchups
export interface Matchup {
  slug: string;
  other: string;
  kind: "counter" | "synergy";
  score: number;
  unit: string;
  rank: string | null;
  sourceId: string;
  capturedAt: string;
}
export function getMatchups(slug?: string): Matchup[] {
  const sql = `SELECT m.* FROM matchups m JOIN (SELECT slug, other, kind, MAX(captured_at) mc FROM matchups GROUP BY slug, other, kind) x
    ON x.slug=m.slug AND x.other=m.other AND x.kind=m.kind AND x.mc=m.captured_at ${slug ? "WHERE m.slug = ? OR m.other = ?" : ""}`;
  const rows = slug ? db().prepare(sql).all(slug, slug) : db().prepare(sql).all();
  return rows.map((r: any) => ({
    slug: r.slug,
    other: r.other,
    kind: r.kind,
    score: r.score,
    unit: r.unit,
    rank: r.rank,
    sourceId: r.source_id,
    capturedAt: r.captured_at,
  }));
}

// ---------------------------------------------------------------- Pro
export function getProStats() {
  return db()
    .prepare(
      `SELECT p.* FROM pro_stats p JOIN (SELECT tournament, MAX(captured_at) mc FROM pro_stats GROUP BY tournament) x
       ON x.tournament = p.tournament AND x.mc = p.captured_at`,
    )
    .all() as { slug: string; tournament: string; picks: number; bans: number; wins: number; games_total: number; source_id: string; captured_at: string }[];
}

// ---------------------------------------------------------------- Objets & builds
export interface Item {
  slug: string;
  name: string;
  category: string;
  tags: string[];
  use: string | null;
  price: number | null;
  stats: Record<string, number> | null;
  passive: string | null;
  imageUrl: string | null;
  sourceId: string;
  updatedAt: string;
}
export function getItems(): Item[] {
  return db()
    .prepare("SELECT * FROM items ORDER BY category, name")
    .all()
    .map((r: any) => ({
      slug: r.slug,
      name: r.name,
      category: r.category,
      tags: pj(r.tags, []),
      use: r.use,
      price: r.price,
      stats: pj(r.stats, null),
      passive: r.passive,
      imageUrl: r.image_url,
      sourceId: r.source_id,
      updatedAt: r.updated_at,
    }));
}

export interface Build {
  id: number;
  hero: string;
  title: string;
  type: string;
  items: string[];
  emblem: string | null;
  talents: string[];
  spell: string | null;
  notes: string | null;
  sampleSize: number | null;
  sourceId: string;
  capturedAt: string;
  isUser: boolean;
}
const rowToBuild = (r: any): Build => ({
  id: r.id,
  hero: r.hero,
  title: r.title,
  type: r.type,
  items: pj(r.items, []),
  emblem: r.emblem,
  talents: pj(r.talents, []),
  spell: r.spell,
  notes: r.notes,
  sampleSize: r.sample_size,
  sourceId: r.source_id,
  capturedAt: r.captured_at,
  isUser: !!r.is_user,
});
export function getBuilds(hero?: string): Build[] {
  return (hero ? db().prepare("SELECT * FROM builds WHERE hero = ? ORDER BY is_user DESC, captured_at DESC").all(hero) : db().prepare("SELECT * FROM builds ORDER BY captured_at DESC").all()).map(rowToBuild);
}
export function saveUserBuild(b: { hero: string; title: string; type: string; items: string[]; emblem?: string | null; talents?: string[]; spell?: string | null; notes?: string | null }) {
  const r = db()
    .prepare(
      `INSERT INTO builds (hero, title, type, items, emblem, talents, spell, notes, sample_size, source_id, captured_at, is_user)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'manual', ?, 1)`,
    )
    .run(b.hero, b.title, b.type, j(b.items), b.emblem ?? null, j(b.talents ?? []), b.spell ?? null, b.notes ?? null, now());
  return Number(r.lastInsertRowid);
}
export function deleteUserBuild(id: number) {
  db().prepare("DELETE FROM builds WHERE id = ? AND is_user = 1").run(id);
}

// ---------------------------------------------------------------- Patchs
export interface PatchChange {
  id: number;
  version: string;
  targetType: string;
  target: string;
  change: string;
  text: string;
}
export interface Patch {
  version: string;
  date: string | null;
  server: string | null;
  title: string | null;
  url: string | null;
  sourceId: string;
  capturedAt: string;
  changes: PatchChange[];
}
export function getPatches(): Patch[] {
  const patches = db().prepare("SELECT * FROM patches ORDER BY COALESCE(date, captured_at) DESC").all() as any[];
  const changes = db().prepare("SELECT * FROM patch_changes ORDER BY id").all() as any[];
  return patches.map((p) => ({
    version: p.version,
    date: p.date,
    server: p.server,
    title: p.title,
    url: p.url,
    sourceId: p.source_id,
    capturedAt: p.captured_at,
    changes: changes
      .filter((c) => c.version === p.version)
      .map((c) => ({ id: c.id, version: c.version, targetType: c.target_type, target: c.target, change: c.change, text: c.text })),
  }));
}
export function savePatch(p: { version: string; date?: string | null; server?: string | null; title?: string | null; url?: string | null; sourceId: string; changes: { targetType: string; target: string; change: string; text: string }[] }) {
  const tx = db().transaction(() => {
    db()
      .prepare(
        `INSERT INTO patches (version, date, server, title, url, source_id, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(version) DO UPDATE SET date=excluded.date, server=excluded.server, title=excluded.title, url=excluded.url, source_id=excluded.source_id, captured_at=excluded.captured_at`,
      )
      .run(p.version, p.date ?? null, p.server ?? null, p.title ?? null, p.url ?? null, p.sourceId, now());
    db().prepare("DELETE FROM patch_changes WHERE version = ?").run(p.version);
    const ins = db().prepare("INSERT INTO patch_changes (version, target_type, target, change, text) VALUES (?, ?, ?, ?, ?)");
    for (const c of p.changes) ins.run(p.version, c.targetType, c.target, c.change, c.text);
  });
  tx();
}
export function deletePatch(version: string) {
  db().prepare("DELETE FROM patch_changes WHERE version = ?").run(version);
  db().prepare("DELETE FROM patches WHERE version = ?").run(version);
}

// ---------------------------------------------------------------- Synchronisation
export function getSyncRuns(limit = 30) {
  return db().prepare("SELECT * FROM sync_runs ORDER BY id DESC LIMIT ?").all(limit) as {
    id: number;
    connector: string;
    source_id: string | null;
    started_at: string;
    finished_at: string | null;
    status: string;
    records: number;
    message: string | null;
  }[];
}

export function staleAfterHours(): number {
  const v = Number(process.env.STALE_AFTER_HOURS);
  return Number.isFinite(v) && v > 0 ? v : 48;
}
export function isStale(iso: string | null): boolean {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > staleAfterHours() * 3600_000;
}

// ---------------------------------------------------------------- Données personnelles
export interface Profile {
  nickname: string | null;
  playerId: string | null;
  server: string | null;
  rank: string | null;
  stars: number | null;
  mainRole: string | null;
  secondRole: string | null;
  favoriteHeroes: string[];
  updatedAt: string | null;
}
export function getProfile(): Profile {
  const r: any = db().prepare("SELECT * FROM profile WHERE id = 1").get();
  return {
    nickname: r?.nickname ?? null,
    playerId: r?.player_id ?? null,
    server: r?.server ?? null,
    rank: r?.rank ?? null,
    stars: r?.stars ?? null,
    mainRole: r?.main_role ?? null,
    secondRole: r?.second_role ?? null,
    favoriteHeroes: pj(r?.favorite_heroes, []),
    updatedAt: r?.updated_at ?? null,
  };
}
export function saveProfile(p: Omit<Profile, "updatedAt">) {
  db()
    .prepare(
      `INSERT INTO profile (id, nickname, player_id, server, rank, stars, main_role, second_role, favorite_heroes, updated_at)
       VALUES (1, @nickname, @playerId, @server, @rank, @stars, @mainRole, @secondRole, @fav, @ts)
       ON CONFLICT(id) DO UPDATE SET nickname=excluded.nickname, player_id=excluded.player_id, server=excluded.server,
         rank=excluded.rank, stars=excluded.stars, main_role=excluded.main_role, second_role=excluded.second_role,
         favorite_heroes=excluded.favorite_heroes, updated_at=excluded.updated_at`,
    )
    .run({ ...p, fav: j(p.favoriteHeroes), ts: now() });
}

export interface Match {
  id: number;
  playedAt: string;
  hero: string;
  role: string | null;
  result: "win" | "loss";
  kills: number;
  deaths: number;
  assists: number;
  durationMin: number | null;
  mvp: boolean;
  rank: string | null;
  notes: string | null;
  entry: string;
}
const rowToMatch = (r: any): Match => ({
  id: r.id,
  playedAt: r.played_at,
  hero: r.hero,
  role: r.role,
  result: r.result,
  kills: r.kills,
  deaths: r.deaths,
  assists: r.assists,
  durationMin: r.duration_min,
  mvp: !!r.mvp,
  rank: r.rank,
  notes: r.notes,
  entry: r.entry,
});
export function getMatches(): Match[] {
  return db().prepare("SELECT * FROM matches ORDER BY played_at DESC, id DESC").all().map(rowToMatch);
}
export function addMatch(m: Omit<Match, "id">) {
  const r = db()
    .prepare(
      `INSERT INTO matches (played_at, hero, role, result, kills, deaths, assists, duration_min, mvp, rank, notes, entry, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(m.playedAt, m.hero, m.role, m.result, m.kills, m.deaths, m.assists, m.durationMin, m.mvp ? 1 : 0, m.rank, m.notes, m.entry, now());
  return Number(r.lastInsertRowid);
}
export function deleteMatch(id: number) {
  db().prepare("DELETE FROM matches WHERE id = ?").run(id);
}

export interface SavedDraft {
  id: number;
  name: string;
  mode: string;
  state: unknown;
  summary: unknown;
  createdAt: string;
  updatedAt: string;
}
export function getDrafts(): SavedDraft[] {
  return db()
    .prepare("SELECT * FROM drafts ORDER BY updated_at DESC")
    .all()
    .map((r: any) => ({ id: r.id, name: r.name, mode: r.mode, state: pj(r.state, null), summary: pj(r.summary, null), createdAt: r.created_at, updatedAt: r.updated_at }));
}
export function saveDraft(d: { id?: number; name: string; mode: string; state: unknown; summary: unknown }) {
  if (d.id) {
    db().prepare("UPDATE drafts SET name=?, mode=?, state=?, summary=?, updated_at=? WHERE id=?").run(d.name, d.mode, j(d.state), j(d.summary), now(), d.id);
    return d.id;
  }
  const r = db().prepare("INSERT INTO drafts (name, mode, state, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(d.name, d.mode, j(d.state), j(d.summary), now(), now());
  return Number(r.lastInsertRowid);
}
export function deleteDraft(id: number) {
  db().prepare("DELETE FROM drafts WHERE id = ?").run(id);
}

export function getFavorites(): { kind: string; ref: string; createdAt: string }[] {
  return db().prepare("SELECT kind, ref, created_at AS createdAt FROM favorites ORDER BY created_at DESC").all() as any;
}
export function toggleFavorite(kind: string, ref: string): boolean {
  const ex = db().prepare("SELECT 1 FROM favorites WHERE kind = ? AND ref = ?").get(kind, ref);
  if (ex) {
    db().prepare("DELETE FROM favorites WHERE kind = ? AND ref = ?").run(kind, ref);
    return false;
  }
  db().prepare("INSERT INTO favorites (kind, ref, created_at) VALUES (?, ?, ?)").run(kind, ref, now());
  return true;
}

export function getSavedFilters(page?: string) {
  const rows = page ? db().prepare("SELECT * FROM saved_filters WHERE page = ? ORDER BY id DESC").all(page) : db().prepare("SELECT * FROM saved_filters ORDER BY id DESC").all();
  return rows.map((r: any) => ({ id: r.id as number, page: r.page as string, name: r.name as string, params: pj<Record<string, string>>(r.params, {}), createdAt: r.created_at as string }));
}
export function saveFilter(page: string, name: string, params: Record<string, string>) {
  db().prepare("INSERT INTO saved_filters (page, name, params, created_at) VALUES (?, ?, ?, ?)").run(page, name, j(params), now());
}
export function deleteFilter(id: number) {
  db().prepare("DELETE FROM saved_filters WHERE id = ?").run(id);
}

export function addRecent(kind: string, ref: string, label: string) {
  db().prepare("DELETE FROM recent WHERE kind = ? AND ref = ?").run(kind, ref);
  db().prepare("INSERT INTO recent (kind, ref, label, at) VALUES (?, ?, ?, ?)").run(kind, ref, label, now());
  db().prepare("DELETE FROM recent WHERE id NOT IN (SELECT id FROM recent ORDER BY id DESC LIMIT 30)").run();
}
export function getRecent(limit = 12) {
  return db().prepare("SELECT kind, ref, label, at FROM recent ORDER BY id DESC LIMIT ?").all(limit) as { kind: string; ref: string; label: string; at: string }[];
}

// ---------------------------------------------------------------- Catalogue importé (talents, emblèmes…)
export function getCatalog(kind: string) {
  return (getDb().prepare("SELECT * FROM catalog WHERE kind = ? ORDER BY slug").all(kind) as any[]).map((r) => ({ slug: r.slug as string, data: pj<Record<string, any>>(r.data, {}), sourceId: r.source_id as string, capturedAt: r.captured_at as string }));
}
