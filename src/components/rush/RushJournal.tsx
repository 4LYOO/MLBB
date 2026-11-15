"use client";
/**
 * JOURNAL DE RUSH — enregistrer une partie en 2 taps :
 *   1) toucher le héros (le dernier joué est déjà sélectionné), 2) Victoire ou Défaite.
 * Le rôle vient du rôle choisi dans le Draft, sinon de la lane du pool (onglet Duo), sinon du rôle principal du héros.
 * En mode duo, les deux héros sont enregistrés avec le même identifiant de partie.
 */
import { useMemo, useState } from "react";
import clsx from "clsx";
import { PencilLine, Search, Trophy, XCircle } from "lucide-react";
import { AnnotateSheet } from "./RecentGames";
import { HeroAvatar } from "@/components/ui";
import { personal, usePersonal, type Player } from "@/lib/client/store";
import { LANES, type Hero, type Lane, type Role } from "@/lib/domain";

const ROLE_OF_LANE: Record<Lane, Role> = { exp: "Fighter", jungle: "Assassin", mid: "Mage", roam: "Tank", gold: "Marksman" };

/** Rôle d'un héros pour un joueur : lane du pool si le héros y est, sinon son rôle principal. */
function roleFor(p: Player | undefined, h: Hero, chosen?: Lane | null): string | null {
  // 1) rôle choisi dans le Draft si le héros joue cette lane, 2) lane du pool, 3) rôle principal.
  if (chosen && h.lanes.includes(chosen)) return ROLE_OF_LANE[chosen];
  const lane = p ? LANES.find((l) => p.pool[l]?.includes(h.slug)) : undefined;
  return lane ? ROLE_OF_LANE[lane] : (h.roles[0] ?? null);
}

/** Choix du héros d'un joueur : héros récents + pool, et une recherche pour les autres. */
export function HeroPicker({ player, heroes, value, onChange }: { player: Player; heroes: Hero[]; value: string | null; onChange: (s: string) => void }) {
  const me = usePersonal();
  const [q, setQ] = useState("");
  const idx = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const suggestions = useMemo(() => {
    const recent = me.matches.filter((m) => (m.player ?? "moi") === player.id).map((m) => m.hero);
    const pool = Object.values(player.pool).flat();
    return [...new Set([value, ...recent, ...pool].filter(Boolean) as string[])].slice(0, 8).map((s) => idx.get(s)).filter((h): h is Hero => !!h);
  }, [me.matches, player, value, idx]);
  const found = q.trim().length >= 2 ? heroes.filter((h) => h.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];
  const list = found.length ? found : suggestions;
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gold">{player.nom}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {list.map((h) => (
          <button
            key={h.slug}
            onClick={() => {
              onChange(h.slug);
              setQ("");
            }}
            className={clsx("flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl p-1 transition-colors duration-150", value === h.slug ? "bg-white/15 ring-2 ring-gold" : "opacity-70")}
            aria-pressed={value === h.slug}
          >
            <HeroAvatar hero={h} size={44} />
            <span className="w-full truncate text-center text-[11px]">{h.name}</span>
          </button>
        ))}
        {!list.length && <p className="py-3 text-sm text-muted">Cherche ton héros ci-dessous.</p>}
      </div>
      <label className="mt-1 flex items-center gap-2 rounded-2xl bg-white/5 px-3">
        <Search size={16} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Autre héros…" className="min-h-11 flex-1 bg-transparent text-[16px] outline-none" />
      </label>
    </div>
  );
}

export function RushJournal({ heroes }: { heroes: Hero[] }) {
  const me = usePersonal();
  const idx = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const lastOf = (id: Player["id"]) => me.matches.find((m) => (m.player ?? "moi") === id)?.hero ?? null; // matches : plus récent en premier
  // Duo par défaut si le mode duo est activé et que ta conjointe a déjà un héros (journal ou pool).
  const elle = me.players.find((p) => p.id === "elle");
  const [duo, setDuo] = useState(me.prefs.duo && (!!lastOf("elle") || Object.values(elle?.pool ?? {}).flat().length > 0));
  const [pick, setPick] = useState<Record<Player["id"], string | null>>({ moi: lastOf("moi"), elle: lastOf("elle") });
  const [flash, setFlash] = useState<string | null>(null);
  // Dernière partie enregistrée : proposée à l'annotation (« lane gagnée », « gagné en late »…).
  const [lastGame, setLastGame] = useState<string | null>(null);
  const [annotate, setAnnotate] = useState(false);
  const who: Player["id"][] = duo ? ["moi", "elle"] : ["moi"];
  const ready = who.every((id) => pick[id] && idx.get(pick[id]!));

  const record = (result: "win" | "loss") => {
    const gameId = `g${Date.now()}`;
    for (const id of who) {
      const h = idx.get(pick[id]!)!;
      personal.addMatch({
        playedAt: new Date().toISOString().slice(0, 10),
        hero: h.slug,
        role: roleFor(me.players.find((p) => p.id === id), h, me.prefs.rolesDraft?.[id]),
        result,
        kills: 0,
        deaths: 0,
        assists: 0,
        sansKda: true,
        durationMin: null,
        mvp: false,
        rank: null,
        notes: null,
        entry: "rapide",
        player: id,
        gameId,
      });
    }
    setFlash(result === "win" ? "Victoire enregistrée ✓" : "Défaite enregistrée");
    setLastGame(gameId);
    setTimeout(() => setFlash(null), 1500);
  };

  return (
    <section className="card space-y-3 p-3">
      <div className="flex items-center gap-2">
        <p className="h-display flex-1 text-lg">Partie terminée</p>
        <div className="flex rounded-full bg-white/5 p-0.5 text-sm">
          {[false, true].map((v) => (
            <button key={String(v)} onClick={() => setDuo(v)} className={clsx("min-h-9 rounded-full px-3 transition-colors duration-150", duo === v ? "glass-pill font-semibold" : "text-muted")}>
              {v ? "Duo" : "Solo"}
            </button>
          ))}
        </div>
      </div>
      {who.map((id) => (
        <HeroPicker key={id} player={me.players.find((p) => p.id === id)!} heroes={heroes} value={pick[id]} onChange={(s) => setPick((p) => ({ ...p, [id]: s }))} />
      ))}
      {flash ? (
        <p className="grid min-h-16 place-items-center text-lg font-bold text-good">{flash}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={!ready} className="btn-good min-h-16 text-lg disabled:opacity-40" onClick={() => record("win")}>
            <Trophy size={20} /> Victoire
          </button>
          <button disabled={!ready} className="btn-bad min-h-16 text-lg disabled:opacity-40" onClick={() => record("loss")}>
            <XCircle size={20} /> Défaite
          </button>
        </div>
      )}
      {lastGame && !flash && (
        <button className="btn-ghost min-h-11 w-full text-sm" onClick={() => setAnnotate(true)}>
          <PencilLine size={16} /> Annoter la dernière partie (lane, early, late…)
        </button>
      )}
      {annotate && lastGame && (
        <AnnotateSheet
          game={me.matches.filter((m) => m.gameId === lastGame)}
          onClose={() => {
            setAnnotate(false);
            setLastGame(null);
          }}
        />
      )}
    </section>
  );
}
