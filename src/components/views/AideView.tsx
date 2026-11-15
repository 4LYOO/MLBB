"use client";
/**
 * AIDE-MÉMOIRE EN PARTIE — écran simple, gros texte, lisible d'un coup d'œil :
 *  1) objectifs et leurs timings (data/coaching.json → aideMemoire, marqués « à vérifier »)
 *  2) items de contre selon la compo ennemie de la dernière draft
 *  3) rappels de jeu
 */
import Link from "next/link";
import { AVerifier, HeroAvatar } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { usePersonal } from "@/lib/client/store";
import { counterItems } from "@/lib/engine/builds";
import { AIDE_MEMOIRE } from "@/data/reference/coaching";
import type { Hero } from "@/lib/domain";
import { DataGate } from "./Loading";

export function AideView() {
  return (
    <DataGate>
      <Inner />
    </DataGate>
  );
}

function Inner() {
  const { model } = useData();
  const me = usePersonal();
  const enemies = (me.derniereDraft?.enemies ?? []).map((s) => model.heroBySlug.get(s)).filter((h): h is Hero => !!h);
  const needs = counterItems(enemies);

  return (
    <div className="space-y-4 pb-6">
      <h1 className="h-display text-[30px]">Aide-mémoire</h1>

      <section className="space-y-2">
        <p className="label">Objectifs</p>
        {AIDE_MEMOIRE.objectifs.map((o) => (
          <div key={o.nom} className="card flex items-center gap-4 p-4">
            <p className="w-24 shrink-0 text-[30px] font-bold leading-none tabular-nums text-gold">{o.timing}</p>
            <div className="min-w-0">
              <p className="text-[20px] font-bold">
                {o.nom} {o.aVerifier && <AVerifier title="Timing dépendant du patch : à vérifier dans les patch notes" />}
              </p>
              <p className="text-[15px] text-ink-2">{o.conseil}</p>
              <p className="text-xs text-muted">Réapparition : {o.respawn}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <p className="label">Items de contre {needs.length > 0 && <AVerifier title="Noms d'objets à vérifier à chaque patch" />}</p>
        {enemies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {enemies.map((e) => (
              <span key={e.slug} className="flex items-center gap-1.5 rounded-full bg-bad/15 py-1 pl-1 pr-3 text-sm">
                <HeroAvatar hero={e} size={26} /> {e.name}
              </span>
            ))}
          </div>
        )}
        {needs.map((n) => (
          <div key={n.besoin} className="card p-4">
            <p className="text-[20px] font-bold">{n.besoin}</p>
            <p className="text-[17px] text-gold">{n.items.join(" · ")}</p>
            <p className="text-sm text-muted">{n.pourquoi}</p>
          </div>
        ))}
        {!enemies.length && (
          <p className="card p-4 text-[15px] text-muted">
            Entre la compo ennemie dans le <Link className="text-primary" href="/draft">Draft</Link> : les items de contre s&apos;afficheront ici.
          </p>
        )}
        {enemies.length > 0 && !needs.length && <p className="card p-4 text-[15px] text-muted">Pas de contre particulier : garde ton build de base.</p>}
      </section>

      <section className="space-y-2">
        <p className="label">Rappels</p>
        {AIDE_MEMOIRE.rappels.map((r) => (
          <p key={r} className="card p-4 text-[17px] font-semibold leading-snug">
            {r}
          </p>
        ))}
      </section>
    </div>
  );
}
