import { getDb } from "./db";
import { getHeroes, getLatestSnapshot, getSourceMap, isStale, getMatches, type StatSnapshot } from "./repo";
import { computeTiers, type TierEntry } from "@/lib/engine/tier";
import { PERIODS, PERIOD_FR, RANKS, type Hero, type HeroStat, type Period, type Rank, type Source, type Tier } from "@/lib/domain";

export function parseRank(v: unknown): Rank {
  return RANKS.includes(v as Rank) ? (v as Rank) : "all";
}
export function parsePeriod(v: unknown): Period {
  return PERIODS.includes(v as Period) ? (v as Period) : "7d";
}

/** Référence de tendance : même capture sur 30 j, sinon capture précédente. */
export function trendReference(snap: StatSnapshot): { stats: HeroStat[] | null; label: string } {
  if (!snap.capturedAt) return { stats: null, label: "" };
  if (snap.period !== "30d") {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM hero_stats WHERE rank = ? AND period = '30d' AND source_id = ? AND captured_at = ?")
      .all(snap.rank, snap.sourceId, snap.capturedAt) as any[];
    if (rows.length) return { stats: rows.map(mapStat), label: `sur ${PERIOD_FR["30d"]} (même capture)` };
  }
  const prev = getDb()
    .prepare("SELECT MAX(captured_at) AS c FROM hero_stats WHERE rank = ? AND period = ? AND captured_at < ?")
    .get(snap.rank, snap.period, snap.capturedAt) as { c: string | null };
  if (prev?.c) {
    const rows = getDb().prepare("SELECT * FROM hero_stats WHERE rank = ? AND period = ? AND captured_at = ?").all(snap.rank, snap.period, prev.c) as any[];
    return { stats: rows.map(mapStat), label: `de la capture précédente (${new Date(prev.c).toLocaleDateString("fr-FR")})` };
  }
  return { stats: null, label: "" };
}

const mapStat = (r: any): HeroStat => ({
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

export interface StatsContext {
  heroes: Hero[];
  snap: StatSnapshot;
  tiers: TierEntry[];
  tierMap: Record<string, Tier>;
  statMap: Record<string, HeroStat>;
  source: Source | null;
  stale: boolean;
  trend: { stats: HeroStat[] | null; label: string };
}

export function statsContext(rank: Rank, period: Period): StatsContext {
  const heroes = getHeroes();
  const snap = getLatestSnapshot(rank, period);
  const tiers = computeTiers(snap.stats);
  const sources = getSourceMap();
  return {
    heroes,
    snap,
    tiers,
    tierMap: Object.fromEntries(tiers.map((t) => [t.slug, t.tier])),
    statMap: Object.fromEntries(snap.stats.map((s) => [s.slug, s])),
    source: snap.sourceId ? sources[snap.sourceId] ?? null : null,
    stale: snap.capturedAt ? isStale(snap.capturedAt) : false,
    trend: trendReference(snap),
  };
}

/** Agrégats personnels par héros, pour le bonus « maîtrise » du draft. */
export function personalByHero(): Record<string, { games: number; wins: number }> {
  const out: Record<string, { games: number; wins: number }> = {};
  for (const m of getMatches()) {
    const a = (out[m.hero] ??= { games: 0, wins: 0 });
    a.games++;
    if (m.result === "win") a.wins++;
  }
  return out;
}
