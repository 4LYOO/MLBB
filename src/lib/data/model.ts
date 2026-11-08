/**
 * Modèle de données en mémoire (navigateur ou script), construit à partir de :
 *  1. le référentiel éditorial versionné (héros, profils, objets, sources) ;
 *  2. les paquets « mlbb-companion/v1 » publiés (synchro mlbb.io, imports versionnés) ;
 *  3. les paquets importés localement par l'utilisateur (collage, fichier).
 *
 * Règles de fusion (identiques à l'ancien importeur SQLite) :
 *  - les paquets sont appliqués du plus ancien au plus récent (capturedAt) ;
 *  - une donnée importée n'est jamais remplacée par le référentiel éditorial ;
 *  - toutes les captures de statistiques sont conservées (historique, tendances) ;
 *  - un héros sans profil de draft reçoit un profil DÉRIVÉ des notes de la source.
 */
import { DataPackageSchema, deriveProfile, type DataPackage } from "./schema";
import { editorialHeroes } from "@/lib/engine/editorial";
import { EDITORIAL_ITEMS } from "@/data/reference/items";
import { SOURCES, VERIFIED_ON } from "@/data/reference/sources";
import type { Hero, HeroStat, Period, Rank, Source, Tag } from "@/lib/domain";

// ------------------------------------------------------------------ types
export interface HeroDetails {
  skills: { key: string; name: string; type?: string; description?: string; cooldown?: string | null; cost?: string | null }[] | null;
  baseStats: Record<string, number> | null;
  specialities: string[] | null;
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
export interface Build {
  id: string;
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
export interface PatchChange {
  id: string;
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
  isUser?: boolean;
}
export interface ProStat {
  slug: string;
  tournament: string;
  picks: number;
  bans: number;
  wins: number;
  games_total: number;
  source_id: string;
  captured_at: string;
}
export interface CatalogEntry {
  kind: string;
  slug: string;
  data: Record<string, any>;
  sourceId: string;
  capturedAt: string;
}
export interface Model {
  heroes: Hero[];
  heroBySlug: Map<string, Hero>;
  details: Map<string, HeroDetails>;
  stats: HeroStat[];
  matchups: Matchup[];
  items: Item[];
  builds: Build[];
  patches: Patch[];
  proStats: ProStat[];
  catalog: CatalogEntry[];
  sources: Source[];
  sourceById: Map<string, Source>;
  warnings: string[];
}

export interface StatSnapshot {
  rank: Rank;
  period: Period;
  sourceId: string | null;
  capturedAt: string | null;
  dataAsOf: string | null;
  patch: string | null;
  stats: HeroStat[];
}

// ------------------------------------------------------------------ construction
const EDITORIAL_TS = `${VERIFIED_ON}T00:00:00.000Z`;

export interface BuildInput {
  packages: unknown[]; // paquets publiés + locaux (validés ici)
  userBuilds?: Build[];
  userPatches?: Patch[];
}

export function buildModel({ packages, userBuilds = [], userPatches = [] }: BuildInput): Model {
  const warnings: string[] = [];
  const sources = new Map<string, Source>(SOURCES.map((s) => [s.id, { ...s, lastSyncAt: null }]));
  const heroes = new Map<string, Hero>(editorialHeroes().map((h) => [h.slug, h]));
  const details = new Map<string, HeroDetails>();
  const statKeys = new Set<string>();
  const stats: HeroStat[] = [];
  const matchups = new Map<string, Matchup>();
  const items = new Map<string, Item>(
    EDITORIAL_ITEMS.map((i) => [i.slug, { slug: i.slug, name: i.name, category: i.category, tags: i.tags, use: i.use, price: null, stats: null, passive: null, imageUrl: null, sourceId: "editorial", updatedAt: EDITORIAL_TS }]),
  );
  const builds: Build[] = [];
  const patches = new Map<string, Patch>();
  const proStats: ProStat[] = [];
  const catalog = new Map<string, CatalogEntry>();

  const valid: DataPackage[] = [];
  for (const raw of packages) {
    const r = DataPackageSchema.safeParse(raw);
    if (r.success) valid.push(r.data);
    else warnings.push(`Paquet ignoré (invalide) : ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}`);
  }
  valid.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

  for (const p of valid) {
    const src = p.source.id;
    const cap = p.capturedAt;
    const s = sources.get(src);
    if (!s) sources.set(src, { id: src, name: p.source.name, kind: p.source.kind, url: p.source.url ?? null, reliability: p.source.reliability ?? 3, access: "Importée", terms: "Voir la source d'origine", notes: "", lastSyncAt: cap });
    else if (!s.lastSyncAt || cap > s.lastSyncAt) s.lastSyncAt = cap;

    for (const h of p.heroes ?? []) {
      let hero = heroes.get(h.slug);
      if (!hero) {
        hero = { slug: h.slug, name: h.name, roles: h.roles ?? [], lanes: h.lanes ?? [], damage: null, range: null, difficulty: null, confidence: "medium", incomplete: !h.roles?.length, portraitUrl: null, profile: null, sourceId: src, updatedAt: cap };
        heroes.set(h.slug, hero);
      } else if (h.roles?.length || h.lanes?.length) {
        hero.name = h.name;
        if (h.roles?.length) hero.roles = h.roles;
        if (h.lanes?.length) hero.lanes = h.lanes;
        hero.sourceId = src;
        hero.updatedAt = cap;
      }
      if (h.portraitUrl) hero.portraitUrl = h.portraitUrl;
      if (h.damage) hero.damage = h.damage;
      if (h.range) hero.range = h.range;
      if (h.ratings?.difficulty != null && hero.difficulty == null) hero.difficulty = h.ratings.difficulty <= 3 ? 1 : h.ratings.difficulty <= 6 ? 2 : 3;
      if (h.skills || h.baseStats || h.specialities || h.extras || h.ratings) {
        const prev = details.get(h.slug);
        details.set(h.slug, {
          skills: h.skills ?? prev?.skills ?? null,
          baseStats: h.baseStats ?? prev?.baseStats ?? null,
          specialities: h.specialities ?? prev?.specialities ?? null,
          extras: h.extras || h.ratings ? { ...(h.extras ?? {}), ...(h.ratings ? { ratings: h.ratings as Record<string, number> } : {}) } : (prev?.extras ?? null),
          sourceId: src,
          capturedAt: cap,
        });
      }
      if (!hero.profile && h.ratings && hero.roles.length) {
        const d = deriveProfile(h.ratings, h.specialities ?? [], hero.roles);
        hero.profile = { ...d, early: 2, mid: 2, late: 2, tags: d.tags as Tag[] };
        hero.incomplete = false;
        hero.confidence = "low";
      }
    }

    for (const c of p.catalog ?? []) catalog.set(`${c.kind}:${c.slug}`, { kind: c.kind, slug: c.slug, data: c.data, sourceId: src, capturedAt: cap });

    for (const st of p.heroStats ?? []) {
      if (!heroes.has(st.hero)) continue;
      const key = `${st.hero}|${st.rank}|${st.period}|${src}|${cap}`;
      if (statKeys.has(key)) continue;
      statKeys.add(key);
      stats.push({ slug: st.hero, rank: st.rank, period: st.period, winRate: st.winRate, pickRate: st.pickRate, banRate: st.banRate, sourceId: src, capturedAt: cap, dataAsOf: p.dataAsOf ?? null, patch: p.patch ?? null });
    }

    for (const m of p.matchups ?? []) {
      if (!heroes.has(m.hero) || !heroes.has(m.other)) continue;
      matchups.set(`${m.hero}|${m.other}|${m.kind}`, { slug: m.hero, other: m.other, kind: m.kind, score: m.score, unit: m.unit, rank: m.rank ?? null, sourceId: src, capturedAt: cap });
    }

    for (const s2 of p.proStats ?? []) proStats.push({ slug: s2.hero, tournament: s2.tournament, picks: s2.picks, bans: s2.bans, wins: s2.wins, games_total: s2.gamesTotal, source_id: src, captured_at: cap });

    for (const it of p.items ?? []) {
      const prev = items.get(it.slug);
      items.set(it.slug, {
        slug: it.slug,
        name: it.name,
        category: it.category,
        tags: it.tags?.length ? it.tags : (prev?.tags ?? []),
        use: prev?.use ?? null,
        price: it.price ?? null,
        stats: it.stats ?? null,
        passive: it.passive ?? null,
        imageUrl: it.imageUrl ?? prev?.imageUrl ?? null,
        sourceId: src,
        updatedAt: cap,
      });
    }

    if (p.builds?.length) for (let i = builds.length - 1; i >= 0; i--) if (builds[i].sourceId === src) builds.splice(i, 1);
    (p.builds ?? []).forEach((b, i) =>
      builds.push({ id: `${src}-${cap}-${i}`, hero: b.hero, title: b.title, type: b.type, items: b.items, emblem: b.emblem ?? null, talents: b.talents ?? [], spell: b.spell ?? null, notes: b.notes ?? null, sampleSize: b.sampleSize ?? null, sourceId: src, capturedAt: cap, isUser: false }),
    );

    for (const pa of p.patches ?? [])
      patches.set(pa.version, {
        version: pa.version,
        date: pa.date ?? null,
        server: pa.server ?? null,
        title: pa.title ?? null,
        url: pa.url ?? null,
        sourceId: src,
        capturedAt: cap,
        changes: pa.changes.map((c, i) => ({ id: `${pa.version}-${i}`, version: pa.version, ...c })),
      });
  }

  for (const up of userPatches) patches.set(up.version, { ...up, isUser: true });
  const heroList = [...heroes.values()].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  const sourceList = [...sources.values()].sort((a, b) => b.reliability - a.reliability || a.name.localeCompare(b.name));
  return {
    heroes: heroList,
    heroBySlug: heroes,
    details,
    stats,
    matchups: [...matchups.values()],
    items: [...items.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
    builds: [...userBuilds, ...builds],
    patches: [...patches.values()].sort((a, b) => (b.date ?? b.capturedAt).localeCompare(a.date ?? a.capturedAt)),
    proStats,
    catalog: [...catalog.values()],
    sources: sourceList,
    sourceById: sources,
    warnings,
  };
}

// ------------------------------------------------------------------ sélecteurs
/** Dernière capture pour (rang, période) ; à date égale, la source la plus fiable. */
export function latestSnapshot(m: Model, rank: Rank, period: Period): StatSnapshot {
  let best: { src: string; cap: string } | null = null;
  for (const s of m.stats) {
    if (s.rank !== rank || s.period !== period) continue;
    if (!best || s.capturedAt > best.cap || (s.capturedAt === best.cap && (m.sourceById.get(s.sourceId)?.reliability ?? 0) > (m.sourceById.get(best.src)?.reliability ?? 0))) best = { src: s.sourceId, cap: s.capturedAt };
  }
  if (!best) return { rank, period, sourceId: null, capturedAt: null, dataAsOf: null, patch: null, stats: [] };
  const rows = m.stats.filter((s) => s.rank === rank && s.period === period && s.sourceId === best!.src && s.capturedAt === best!.cap);
  return { rank, period, sourceId: best.src, capturedAt: best.cap, dataAsOf: rows.find((r) => r.dataAsOf)?.dataAsOf ?? null, patch: rows.find((r) => r.patch)?.patch ?? null, stats: rows };
}

export function statHistory(m: Model, slug: string, rank: Rank, period: Period): HeroStat[] {
  return m.stats.filter((s) => s.slug === slug && s.rank === rank && s.period === period).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export function captureTimeline(m: Model, rank: Rank, period: Period) {
  const g = new Map<string, HeroStat[]>();
  for (const s of m.stats) if (s.rank === rank && s.period === period) g.set(`${s.capturedAt}|${s.sourceId}`, [...(g.get(`${s.capturedAt}|${s.sourceId}`) ?? []), s]);
  return [...g.entries()]
    .map(([k, rows]) => {
      const avg = (f: (s: HeroStat) => number) => rows.reduce((a, r) => a + f(r), 0) / rows.length;
      return { captured_at: k.split("|")[0], source_id: k.split("|")[1], n: rows.length, avg_wr: avg((r) => r.winRate), avg_pr: avg((r) => r.pickRate), avg_br: avg((r) => r.banRate) };
    })
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
}

/** Dernière capture par (rang, période) pour un héros. */
export function heroStatMatrix(m: Model, slug: string): HeroStat[] {
  const best = new Map<string, HeroStat>();
  for (const s of m.stats) {
    if (s.slug !== slug) continue;
    const k = `${s.rank}|${s.period}`;
    const b = best.get(k);
    if (!b || s.capturedAt > b.capturedAt) best.set(k, s);
  }
  return [...best.values()];
}

export function availableStatKeys(m: Model): { rank: Rank; period: Period; captures: number; last: string }[] {
  const g = new Map<string, Set<string>>();
  for (const s of m.stats) {
    const k = `${s.rank}|${s.period}`;
    if (!g.has(k)) g.set(k, new Set());
    g.get(k)!.add(s.capturedAt);
  }
  return [...g.entries()].map(([k, caps]) => {
    const [rank, period] = k.split("|") as [Rank, Period];
    return { rank, period, captures: caps.size, last: [...caps].sort().at(-1)! };
  });
}

/** Référence de tendance : même capture sur 30 j, sinon capture précédente. */
export function trendReference(m: Model, snap: StatSnapshot): { stats: HeroStat[] | null; label: string } {
  if (!snap.capturedAt) return { stats: null, label: "" };
  if (snap.period !== "30d") {
    const rows = m.stats.filter((s) => s.rank === snap.rank && s.period === "30d" && s.sourceId === snap.sourceId && s.capturedAt === snap.capturedAt);
    if (rows.length) return { stats: rows, label: "sur 30 jours (même capture)" };
  }
  const prev = m.stats
    .filter((s) => s.rank === snap.rank && s.period === snap.period && s.capturedAt < snap.capturedAt!)
    .map((s) => s.capturedAt)
    .sort()
    .at(-1);
  if (prev) return { stats: m.stats.filter((s) => s.rank === snap.rank && s.period === snap.period && s.capturedAt === prev), label: `de la capture précédente (${new Date(prev).toLocaleDateString("fr-FR")})` };
  return { stats: null, label: "" };
}

export function matchupsOf(m: Model, slug?: string) {
  return slug ? m.matchups.filter((x) => x.slug === slug || x.other === slug) : m.matchups;
}

export function latestProStats(m: Model): ProStat[] {
  const last = new Map<string, string>();
  for (const p of m.proStats) if (!last.has(p.tournament) || p.captured_at > last.get(p.tournament)!) last.set(p.tournament, p.captured_at);
  return m.proStats.filter((p) => last.get(p.tournament) === p.captured_at);
}

export function catalogOf(m: Model, kind: string) {
  return m.catalog.filter((c) => c.kind === kind).sort((a, b) => a.slug.localeCompare(b.slug));
}

export const STALE_HOURS = 48;
export const isStale = (iso: string | null) => !iso || Date.now() - new Date(iso).getTime() > STALE_HOURS * 3600_000;
