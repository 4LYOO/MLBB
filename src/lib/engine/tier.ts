import type { HeroStat, Tier } from "@/lib/domain";

/**
 * Tier list calculée (source « computed »).
 *
 * Méthode (documentée dans docs/METHODOLOGIE.md) :
 *  1. Win rate ajusté par la confiance : un héros très peu joué est ramené vers 50 %.
 *     confiance = PR / (PR + 0,3)   (PR en %, 0,3 % de pick ⇒ 50 % de confiance)
 *     wrAjusté  = 50 + (WR − 50) × confiance
 *  2. Bonus de présence : un héros très banni est craint, jusqu'à +1 point.
 *     bonus = min(BR, 60) / 60
 *  3. score = wrAjusté + bonus ; le tier dépend de l'écart au score moyen du groupe.
 *     S+ ≥ +3 · S ≥ +1,75 · A ≥ +0,5 · B ≥ −1 · C sinon
 *
 * Le score n'est calculable que si des statistiques ont été importées.
 */

export interface TierEntry {
  slug: string;
  tier: Tier;
  score: number;
  adjWinRate: number;
  confidence: number;
  delta: number; // écart au score moyen
  stat: HeroStat;
}

export const TIER_THRESHOLDS: { tier: Tier; min: number }[] = [
  { tier: "S+", min: 3 },
  { tier: "S", min: 1.75 },
  { tier: "A", min: 0.5 },
  { tier: "B", min: -1 },
  { tier: "C", min: -Infinity },
];

export function pickConfidence(pickRate: number) {
  return pickRate <= 0 ? 0 : pickRate / (pickRate + 0.3);
}

export function heroScore(s: Pick<HeroStat, "winRate" | "pickRate" | "banRate">) {
  const confidence = pickConfidence(s.pickRate);
  const adjWinRate = 50 + (s.winRate - 50) * confidence;
  const bonus = Math.min(Math.max(s.banRate, 0), 60) / 60;
  return { score: adjWinRate + bonus, adjWinRate, confidence };
}

export function computeTiers(stats: HeroStat[]): TierEntry[] {
  if (!stats.length) return [];
  const scored = stats.map((stat) => ({ stat, ...heroScore(stat) }));
  const mean = scored.reduce((a, b) => a + b.score, 0) / scored.length;
  return scored
    .map((s) => {
      const delta = s.score - mean;
      const tier = TIER_THRESHOLDS.find((t) => delta >= t.min)!.tier;
      return { slug: s.stat.slug, tier, score: s.score, adjWinRate: s.adjWinRate, confidence: s.confidence, delta, stat: s.stat };
    })
    .sort((a, b) => b.score - a.score);
}

export function tierValue(t: Tier | undefined | null): number {
  switch (t) {
    case "S+":
      return 1;
    case "S":
      return 0.6;
    case "A":
      return 0.25;
    case "B":
      return 0;
    case "C":
      return -0.4;
    default:
      return 0;
  }
}

/** Tier « compétitif » à partir des stats pro : présence (pick+ban) et win rate en pick. */
export function computeProTiers(rows: { slug: string; picks: number; bans: number; wins: number; games_total: number }[]) {
  const agg = new Map<string, { picks: number; bans: number; wins: number; games: number }>();
  for (const r of rows) {
    const a = agg.get(r.slug) ?? { picks: 0, bans: 0, wins: 0, games: 0 };
    a.picks += r.picks;
    a.bans += r.bans;
    a.wins += r.wins;
    a.games += r.games_total;
    agg.set(r.slug, a);
  }
  const list = [...agg.entries()].map(([slug, a]) => {
    const presence = a.games ? ((a.picks + a.bans) / a.games) * 100 : 0;
    const wr = a.picks ? (a.wins / a.picks) * 100 : 50;
    const conf = a.picks / (a.picks + 10);
    const score = presence * 0.06 + (50 + (wr - 50) * conf) * 0.94;
    return { slug, presence, winRate: wr, picks: a.picks, bans: a.bans, games: a.games, score };
  });
  if (!list.length) return [];
  const mean = list.reduce((s, x) => s + x.score, 0) / list.length;
  return list
    .map((x) => ({ ...x, delta: x.score - mean, tier: TIER_THRESHOLDS.find((t) => x.score - mean >= t.min)!.tier }))
    .sort((a, b) => b.score - a.score);
}
