import { isStale, latestSnapshot, trendReference, type Model, type StatSnapshot } from "./model";
import { computeTiers, type TierEntry } from "@/lib/engine/tier";
import { PERIODS, RANKS, type Hero, type HeroStat, type Period, type Rank, type Source, type Tier } from "@/lib/domain";

export const parseRank = (v: unknown): Rank => (RANKS.includes(v as Rank) ? (v as Rank) : "all");
export const parsePeriod = (v: unknown): Period => (PERIODS.includes(v as Period) ? (v as Period) : "7d");

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

export function statsContext(m: Model, rank: Rank, period: Period): StatsContext {
  const snap = latestSnapshot(m, rank, period);
  const tiers = computeTiers(snap.stats);
  return {
    heroes: m.heroes,
    snap,
    tiers,
    tierMap: Object.fromEntries(tiers.map((t) => [t.slug, t.tier])),
    statMap: Object.fromEntries(snap.stats.map((s) => [s.slug, s])),
    source: snap.sourceId ? (m.sourceById.get(snap.sourceId) ?? null) : null,
    stale: snap.capturedAt ? isStale(snap.dataAsOf ?? snap.capturedAt) : false,
    trend: trendReference(m, snap),
  };
}

export function personalByHero(matches: { hero: string; result: "win" | "loss" }[]): Record<string, { games: number; wins: number }> {
  const out: Record<string, { games: number; wins: number }> = {};
  for (const m of matches) {
    const a = (out[m.hero] ??= { games: 0, wins: 0 });
    a.games++;
    if (m.result === "win") a.wins++;
  }
  return out;
}
