"use client";
/**
 * NOUVEAUTÉS DU PATCH — lit la section « changements » de data/heroes.json.
 * Une carte par changement : vert = buff, rouge = nerf, gris = ajustement / objet / nouveauté.
 */
import Link from "next/link";
import clsx from "clsx";
import { AVerifier, HeroAvatar } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { CHANGEMENTS, HEROES_META } from "@/data/reference/heroes";
import { DataGate } from "./Loading";

const LABEL: Record<string, string> = { buff: "Buff", nerf: "Nerf", ajustement: "Ajustement", nouveau: "Nouveau", objet: "Objet" };

export function NouveautesView() {
  return (
    <DataGate>
      <Inner />
    </DataGate>
  );
}

function Inner() {
  const { model } = useData();
  const c = CHANGEMENTS;
  const [y, m, d] = HEROES_META.dateMaj.split("-");
  return (
    <div className="space-y-3">
      <div>
        <h1 className="h-display text-[28px]">Nouveautés du patch {c.patch}</h1>
        <p className="text-xs text-muted">
          Données mises à jour le {d}/{m}/{y}
          {c.source && ` · source : ${c.source}`} {c.aVerifier && <AVerifier />}
        </p>
      </div>
      {c.liste.map((x, i) => {
        const h = x.hero ? model.heroBySlug.get(x.hero) : undefined;
        return (
          <div key={i} className={clsx("card flex items-center gap-3 border-l-4 p-3", x.type === "buff" ? "border-l-good" : x.type === "nerf" ? "border-l-bad" : "border-l-white/30")}>
            {h && (
              <Link href={`/heros/${h.slug}`}>
                <HeroAvatar hero={h} size={44} />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <p className={clsx("text-xs font-bold uppercase tracking-wider", x.type === "buff" ? "text-good" : x.type === "nerf" ? "text-bad" : "text-muted")}>
                {LABEL[x.type] ?? x.type}
                {h && ` · ${h.name}`} {x.aVerifier && <AVerifier />}
              </p>
              <p className="text-[16px] leading-snug">{x.texte}</p>
            </div>
          </div>
        );
      })}
      {!c.liste.length && (
        <p className="card p-4 text-[15px] text-muted">
          Aucun changement saisi pour ce patch. Ajoute-les dans <code>data/heroes.json</code> → <code>changements.liste</code> (voir <code>MISE-A-JOUR.md</code>). Les notes de patch synchronisées sont dans{" "}
          <Link className="text-primary" href="/patchs">
            Patch notes
          </Link>
          .
        </p>
      )}
    </div>
  );
}
