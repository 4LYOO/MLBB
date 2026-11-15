"use client";
import { useMemo } from "react";
import { DraftScreen } from "@/components/draft/DraftScreen";
import { useData } from "@/lib/client/data";
import { latestSnapshot } from "@/lib/data/model";
import { EDITORIAL_COMBOS } from "@/data/reference/heroes";
import { COMBO_KEY } from "@/lib/engine/draft";
import { RANKS, type HeroStat, type Rank } from "@/lib/domain";
import { DataGate } from "./Loading";

export function DraftView() {
  return (
    <DataGate>
      <Inner />
    </DataGate>
  );
}

function Inner() {
  const { model } = useData();
  // Dernières statistiques (7 jours) pour chaque rang disponible
  const { statsByRank, label } = useMemo(() => {
    const out: Partial<Record<Rank, HeroStat[]>> = {};
    let lbl = "";
    for (const r of RANKS) {
      const s = latestSnapshot(model, r, "7d");
      if (s.stats.length) {
        out[r] = s.stats;
        lbl ||= `Statistiques : 7 jours, données du ${new Date(s.dataAsOf ?? s.capturedAt!).toLocaleDateString("fr-FR")}.`;
      }
    }
    return { statsByRank: out, label: lbl };
  }, [model]);
  const matchups = useMemo(() => model.matchups.map((m) => ({ slug: m.slug, other: m.other, kind: m.kind, score: m.score, unit: m.unit, sourceId: m.sourceId })), [model]);
  const combos = useMemo(() => EDITORIAL_COMBOS.map((c) => [COMBO_KEY(c.a, c.b), c.why] as [string, string]), []);
  return <DraftScreen heroes={model.heroes} combos={combos} statsByRank={statsByRank} matchups={matchups} statsLabel={label} />;
}
