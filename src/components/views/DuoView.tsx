"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import clsx from "clsx";
import { Card, HeroAvatar, Notice } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { personal, poolOf, usePersonal, type Player } from "@/lib/client/store";
import { LANES, LANE_FR, type Hero, type Lane } from "@/lib/domain";
import { DataGate } from "./Loading";
import { duoPairs } from "@/lib/engine/rush";

export function DuoView() {
  return (
    <DataGate>
      <Inner />
    </DataGate>
  );
}

function Inner() {
  const { model } = useData();
  const me = usePersonal();
  // Feuille d'ajout ouverte pour (joueur, lane), ou null
  const [sheet, setSheet] = useState<{ player: Player["id"]; lane: Lane } | null>(null);

  return (
    <div className="space-y-4">
      <Notice>
        Indique les héros que chacun maîtrise, par lane. Le draft leur donne un bonus et, en mode duo, propose le meilleur pick pour ta conjointe selon ton pick. Tout est enregistré sur ce téléphone.
      </Notice>
      {me.players.map((p) => (
        <Card key={p.id}>
          <div className="mb-3 flex items-center gap-2">
            <input
              className="input h-display !text-lg"
              defaultValue={p.nom}
              onBlur={(e) => personal.renamePlayer(p.id, e.target.value.trim())}
              aria-label="Nom du joueur"
            />
            <span className="chip shrink-0">{poolOf(p).length} héros</span>
          </div>
          <div className="space-y-3">
            {LANES.map((lane) => (
              <div key={lane}>
                <p className="label">{LANE_FR[lane]}</p>
                <div className="flex flex-wrap gap-2">
                  {(p.pool[lane] ?? []).map((slug) => {
                    const h = model.heroBySlug.get(slug);
                    if (!h) return null;
                    return (
                      <button
                        key={slug}
                        className="glass inline-flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm active:opacity-70"
                        onClick={() => personal.togglePool(p.id, lane, slug)}
                        aria-label={`Retirer ${h.name} du pool ${LANE_FR[lane]}`}
                      >
                        <HeroAvatar hero={h} size={34} />
                        {h.name}
                        <X size={14} className="text-muted" />
                      </button>
                    );
                  })}
                  <button className="btn-ghost min-h-11 px-3" onClick={() => setSheet({ player: p.id, lane })} aria-label={`Ajouter un héros en ${LANE_FR[lane]}`}>
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
      <BestPairs heroes={model.heroes} />

      {sheet && (
        <PoolSheet
          heroes={model.heroes}
          player={me.players.find((p) => p.id === sheet.player)!}
          lane={sheet.lane}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

/** Feuille plein écran : héros de la lane, recherche, ajout/retrait en un tap. */
function PoolSheet({ heroes, player, lane, onClose }: { heroes: Hero[]; player: Player; lane: Lane; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false); // afficher aussi les héros qui ne jouent pas habituellement cette lane
  const selected = new Set(player.pool[lane] ?? []);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return heroes.filter((h) => (all || h.lanes.includes(lane)) && (!n || h.name.toLowerCase().includes(n)));
  }, [heroes, q, all, lane]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={`Pool ${LANE_FR[lane]}`}>
      <div className="pt-safe border-b border-line px-3 pb-2">
        <div className="flex items-center gap-2 py-2">
          <p className="h-display flex-1 text-lg">
            {player.nom} · {LANE_FR[lane]}
          </p>
          <button className="btn-primary min-h-11" onClick={onClose}>
            OK
          </button>
        </div>
        <input className="input" placeholder="Rechercher (2-3 lettres)…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="h-5 w-5" checked={all} onChange={(e) => setAll(e.target.checked)} /> Afficher tous les héros
        </label>
      </div>
      <div className="pb-safe grid flex-1 grid-cols-4 content-start gap-2 overflow-y-auto p-3 sm:grid-cols-8">
        {list.map((h) => {
          const on = selected.has(h.slug);
          return (
            <button
              key={h.slug}
              onClick={() => personal.togglePool(player.id, lane, h.slug)}
              className={clsx("flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl p-1 text-center", on ? "bg-gold/20 ring-2 ring-gold" : "active:bg-white/10")}
              aria-pressed={on}
            >
              <HeroAvatar hero={h} size={44} />
              <span className="w-full truncate text-[11px] text-ink-2">{h.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Nos meilleures paires de héros, d'après NOS parties jouées ensemble (journal « Duo »). */
function BestPairs({ heroes }: { heroes: Hero[] }) {
  const me = usePersonal();
  const idx = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const pairs = duoPairs(me.matches).slice(0, 8);
  const nom = (id: Player["id"]) => me.players.find((p) => p.id === id)?.nom ?? id;
  return (
    <Card title="Vos meilleures paires" subtitle={`D'après vos parties en duo (${nom("moi")} + ${nom("elle")})`}>
      {pairs.length ? (
        <ul className="space-y-3">
          {pairs.map((p, i) => {
            const a = idx.get(p.moi);
            const b = idx.get(p.elle);
            return (
              <li key={`${p.moi}+${p.elle}`} className="flex items-center gap-2">
                <span className="w-5 text-sm font-bold text-muted">{i + 1}</span>
                {a && <HeroAvatar hero={a} size={36} />}
                {b && <HeroAvatar hero={b} size={36} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {a?.name ?? p.moi} + {b?.name ?? p.elle}
                  </span>
                  <span className="block text-xs text-muted">
                    {p.wins} V / {p.games - p.wins} D
                  </span>
                </span>
                <span className={clsx("text-xl font-bold tabular-nums", p.winRate >= 55 ? "text-good" : p.winRate < 45 ? "text-bad" : "text-ink")}>{Math.round(p.winRate)} %</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Enregistrez vos parties en mode « Duo » (onglet Stats ou fiche d&apos;avant-partie) : vos paires gagnantes apparaîtront ici.</p>
      )}
    </Card>
  );
}
