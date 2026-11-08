import { TAGS, type Hero, type HeroStat, type Tier } from "@/lib/domain";
import { computeTiers, heroScore, type TierEntry } from "./tier";

/** Forces/faiblesses qualitatives tirées du profil éditorial. */
export function profileTraits(h: Hero): { strengths: string[]; weaknesses: string[] } {
  const p = h.profile;
  if (!p) return { strengths: [], weaknesses: [] };
  const s: string[] = [];
  const w: string[] = [];
  if (p.cc >= 3) s.push("Contrôle de foule élevé");
  if (p.mobility >= 3) s.push("Très mobile");
  if (p.durability >= 3) s.push("Très résistant");
  if (p.burst >= 3) s.push("Gros burst");
  if (p.sustain >= 3) s.push("Excellent sustain");
  if (p.engage >= 3) s.push("Initiateur fiable");
  if (p.peel >= 3) s.push("Protège très bien ses alliés");
  if (p.early >= 3) s.push("Fort en début de partie");
  if (p.late >= 3) s.push("Fort en fin de partie");
  for (const t of p.tags) if (["antidash", "antiheal", "antitank", "global", "immune", "teamfightult", "lockdown"].includes(t)) s.push(TAGS[t]);
  if (p.durability <= 1) w.push("Fragile");
  if (p.mobility === 0) w.push("Aucune mobilité");
  if (p.cc === 0) w.push("Aucun contrôle");
  if (p.early <= 1) w.push("Faible en début de partie");
  if (p.late <= 1) w.push("Perd de la valeur en fin de partie");
  if (p.tags.includes("dash")) w.push("Vulnérable aux anti-dash et contrôles ciblés");
  if (p.tags.includes("heal") || p.tags.includes("selfheal")) w.push("Sensible à la réduction de soins");
  if (h.difficulty === 3) w.push("Exigeant mécaniquement");
  return { strengths: [...new Set(s)], weaknesses: [...new Set(w)] };
}

export interface MetaTrends {
  rising: { slug: string; delta: number; stat: HeroStat }[];
  falling: { slug: string; delta: number; stat: HeroStat }[];
  underrated: TierEntry[];
  overrated: TierEntry[];
  banPriority: TierEntry[];
  potential: { slug: string; delta: number; entry: TierEntry }[];
  method: string;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/**
 * Tendances calculées. « delta » = WR court terme − WR long terme (ex. 7 j − 30 j de la même
 * capture) si disponible, sinon WR dernière capture − capture précédente.
 */
export function computeTrends(current: HeroStat[], reference: HeroStat[] | null, referenceLabel: string): MetaTrends {
  const tiers = computeTiers(current);
  const ref = new Map((reference ?? []).map((s) => [s.slug, s]));
  const deltas = current
    .filter((s) => ref.has(s.slug))
    .map((s) => ({ slug: s.slug, delta: s.winRate - ref.get(s.slug)!.winRate, stat: s }));
  const medPick = median(current.map((s) => s.pickRate));
  const q3Pick = (() => {
    const s = [...current.map((c) => c.pickRate)].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length * 0.75)] : 0;
  })();
  const byDelta = [...deltas].sort((a, b) => b.delta - a.delta);
  const tierMap = new Map(tiers.map((t) => [t.slug, t]));
  return {
    rising: byDelta.filter((d) => d.delta > 0.2).slice(0, 8),
    falling: [...byDelta].reverse().filter((d) => d.delta < -0.2).slice(0, 8),
    underrated: tiers.filter((t) => t.delta >= 1.2 && t.stat.pickRate < medPick).slice(0, 8),
    overrated: tiers.filter((t) => t.stat.pickRate >= q3Pick && t.stat.winRate < 49).sort((a, b) => b.stat.pickRate - a.stat.pickRate).slice(0, 8),
    banPriority: [...tiers].sort((a, b) => b.stat.banRate * 0.04 + (b.adjWinRate - 50) - (a.stat.banRate * 0.04 + (a.adjWinRate - 50))).slice(0, 8),
    potential: deltas
      .filter((d) => d.delta >= 0.4 && d.stat.winRate >= 51)
      .map((d) => ({ ...d, entry: tierMap.get(d.slug)! }))
      .filter((d) => d.entry && (d.entry.tier === "A" || d.entry.tier === "B"))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 8),
    method: reference ? `Tendance = WR actuel − WR ${referenceLabel}.` : "Aucune référence de comparaison disponible.",
  };
}

/** Pourquoi un héros est fort ou faible : lecture des chiffres + profil. */
export function explainHero(h: Hero, stat: HeroStat | null, all: HeroStat[], tier: Tier | null): string[] {
  const out: string[] = [];
  if (stat && all.length) {
    const avgWr = all.reduce((s, x) => s + x.winRate, 0) / all.length;
    const avgPr = all.reduce((s, x) => s + x.pickRate, 0) / all.length;
    const { adjWinRate, confidence } = heroScore(stat);
    const d = stat.winRate - avgWr;
    out.push(`Win rate ${stat.winRate.toFixed(2)} % (${d >= 0 ? "+" : ""}${d.toFixed(2)} pt vs moyenne ${avgWr.toFixed(2)} %).`);
    if (confidence < 0.5) out.push(`Pick rate faible (${stat.pickRate.toFixed(2)} %) : le win rate reflète probablement des spécialistes ; win rate ajusté ${adjWinRate.toFixed(2)} %.`);
    else if (stat.pickRate > avgPr * 2) out.push(`Très joué (${stat.pickRate.toFixed(2)} % de pick, moyenne ${avgPr.toFixed(2)} %).`);
    if (stat.banRate >= 20) out.push(`Fortement banni (${stat.banRate.toFixed(1)} %) : craint par les joueurs.`);
    if (tier) out.push(`Tier calculé : ${tier}.`);
  } else {
    out.push("Statistiques indisponibles pour ce rang : explication fondée sur le profil uniquement.");
  }
  const t = profileTraits(h);
  if (t.strengths.length) out.push(`Atouts : ${t.strengths.slice(0, 4).join(", ").toLowerCase()}.`);
  if (t.weaknesses.length) out.push(`Limites : ${t.weaknesses.slice(0, 3).join(", ").toLowerCase()}.`);
  return out;
}
