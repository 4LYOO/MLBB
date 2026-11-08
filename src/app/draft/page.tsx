import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { DraftSimulator } from "@/components/draft/DraftSimulator";
import { getFavorites, getHeroes, getLatestSnapshot, getMatchups } from "@/lib/server/repo";
import { personalByHero } from "@/lib/server/views";
import { EDITORIAL_COMBOS } from "@/data/reference/heroes";
import { COMBO_KEY } from "@/lib/engine/draft";
import { RANKS, type HeroStat, type Rank } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Simulateur de draft" };

export default function DraftPage() {
  const heroes = getHeroes();
  const statsByRank: Partial<Record<Rank, HeroStat[]>> = {};
  let label = "";
  for (const r of RANKS) {
    const s = getLatestSnapshot(r, "7d");
    if (s.stats.length) {
      statsByRank[r] = s.stats;
      label ||= `Statistiques : 7 jours, capture du ${new Date(s.capturedAt!).toLocaleDateString("fr-FR")} (${s.sourceId}).`;
    }
  }
  const matchups = getMatchups().map((m) => ({ slug: m.slug, other: m.other, kind: m.kind, score: m.score, unit: m.unit, sourceId: m.sourceId }));
  return (
    <>
      <PageHeader
        kicker="Préparation"
        title="Simulateur de draft"
        subtitle="Sélectionne alliés, adversaires et bans : le moteur analyse la situation et classe les meilleurs choix avec une explication détaillée. Moteur déterministe et explicable — estimations stratégiques, pas des certitudes."
      />
      <DraftSimulator
        heroes={heroes}
        combos={EDITORIAL_COMBOS.map((c) => [COMBO_KEY(c.a, c.b), c.why])}
        statsByRank={statsByRank}
        matchups={matchups}
        personal={personalByHero()}
        favorites={getFavorites().filter((f) => f.kind === "hero").map((f) => f.ref)}
        statsLabel={label || "Importe des statistiques depuis la page Sources pour enrichir le score."}
      />
    </>
  );
}
