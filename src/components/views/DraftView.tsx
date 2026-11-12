"use client";
import { useMemo } from "react";
import { DraftSimulator } from "@/components/draft/DraftSimulator";
import { useData } from "@/lib/client/data";
import { usePersonal } from "@/lib/client/store";
import { latestSnapshot } from "@/lib/data/model";
import { personalByHero } from "@/lib/data/views";
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
  const me = usePersonal();
  const { statsByRank, label } = useMemo(() => {
    const out: Partial<Record<Rank, HeroStat[]>> = {};
    let lbl = "";
    for (const r of RANKS) {
      const s = latestSnapshot(model, r, "7d");
      if (s.stats.length) {
        out[r] = s.stats;
        lbl ||= `Statistiques : 7 jours, données du ${new Date(s.dataAsOf ?? s.capturedAt!).toLocaleDateString("fr-FR")} (${model.sourceById.get(s.sourceId!)?.name ?? s.sourceId}).`;
      }
    }
    return { statsByRank: out, label: lbl };
  }, [model]);
  const matchups = useMemo(() => model.matchups.map((m) => ({ slug: m.slug, other: m.other, kind: m.kind, score: m.score, unit: m.unit, sourceId: m.sourceId })), [model]);
  const combos = useMemo(() => EDITORIAL_COMBOS.map((c) => [COMBO_KEY(c.a, c.b), c.why] as [string, string]), []);
  return (
    <DraftSimulator
      heroes={model.heroes}
      combos={combos}
      statsByRank={statsByRank}
      matchups={matchups}
      personal={personalByHero(me.matches)}
      favorites={me.favorites.filter((f) => f.kind === "hero").map((f) => f.ref)}
      statsLabel={label || "Les statistiques apparaîtront après la prochaine synchronisation."}
    />
  );
}
