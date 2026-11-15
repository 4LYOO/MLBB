"use client";
/**
 * IMPORT PAR CAPTURE D'ÉCRAN
 *  - Fin de partie : résultat, durée, K/D/A, note et MVP de chacun (ligne retrouvée grâce au pseudo en jeu).
 *    Les héros sont des images dans le jeu : on les choisit (le dernier joué est présélectionné).
 *  - Stats de héros (profil du jeu) : parties et taux de victoire par héros, pour toi ou ta conjointe.
 * Tout est lu SUR LE TÉLÉPHONE, puis affiché dans un formulaire à vérifier avant d'enregistrer.
 */
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { AVerifier, HeroAvatar, Notice } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { personal, usePersonal, type Player } from "@/lib/client/store";
import { readScreenshot } from "@/lib/client/ocr";
import { parseHeroStats, parseScoreboard, type HeroStatGuess, type ScoreRow } from "@/lib/engine/ocr";
import { LANES, type Hero, type Lane, type Role } from "@/lib/domain";
import { HeroPicker } from "./RushJournal";
import { TagPicker } from "./TagPicker";

type Who = Player["id"];
const ROLE_OF_LANE: Record<Lane, Role> = { exp: "Fighter", jungle: "Assassin", mid: "Mage", roam: "Tank", gold: "Marksman" };
const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v.replace(",", "."))) ? null : Number(v.replace(",", ".")));

interface PlayerForm {
  on: boolean;
  hero: string | null;
  k: string;
  d: string;
  a: string;
  rating: string;
  mvp: boolean;
  found: boolean;
  line: string;
  tags: string[];
  note: string;
}

export function CaptureImport({ heroes }: { heroes: Hero[] }) {
  const me = usePersonal();
  const [busy, setBusy] = useState<{ p: number; step: string } | null>(null);
  const [error, setError] = useState("");
  const [endGame, setEndGame] = useState<{ text: string } | null>(null);
  const [heroStats, setHeroStats] = useState<{ text: string; who: Who } | null>(null);
  const [statsWho, setStatsWho] = useState<Who>("moi");
  const endRef = useRef<HTMLInputElement>(null);
  const statsRef = useRef<HTMLInputElement>(null);
  const nom = (id: Who) => me.players.find((p) => p.id === id)?.nom ?? id;

  const run = async (file: File | undefined, then: (text: string) => void) => {
    if (!file) return;
    setError("");
    setBusy({ p: 0, step: "Préparation" });
    try {
      const text = await readScreenshot(file, (p, step) => setBusy({ p, step }));
      then(text);
    } catch (e) {
      setError(`Lecture impossible (${e instanceof Error ? e.message : String(e)}). La 1re fois, une connexion est nécessaire pour charger le moteur de lecture.`);
    } finally {
      setBusy(null);
      if (endRef.current) endRef.current.value = "";
      if (statsRef.current) statsRef.current.value = "";
    }
  };

  return (
    <section className="card space-y-3 p-3">
      <div className="flex items-center gap-2">
        <Camera size={20} className="text-gold" />
        <p className="h-display flex-1 text-lg">Importer une capture</p>
      </div>

      {/* Pseudos en jeu : nécessaires pour retrouver vos lignes sur le tableau des scores */}
      <div className="grid grid-cols-2 gap-2">
        {me.players.map((p) => (
          <label key={p.id}>
            <span className="label truncate">Pseudo · {p.nom}</span>
            <input className="input" defaultValue={p.pseudo ?? ""} placeholder="Ton pseudo MLBB" onBlur={(e) => personal.setPseudo(p.id, e.target.value)} />
          </label>
        ))}
      </div>

      {busy ? (
        <div className="space-y-1.5">
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Loader2 size={16} className="animate-spin" /> {busy.step}… {Math.round(busy.p * 100)} %
          </p>
          <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-gold transition-[width] duration-150" style={{ width: `${Math.round(busy.p * 100)}%` }} />
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="btn-primary min-h-14 cursor-pointer text-[15px]">
            <Camera size={18} /> Fin de partie
            <input ref={endRef} type="file" accept="image/*" className="hidden" onChange={(e) => run(e.target.files?.[0], (text) => setEndGame({ text }))} />
          </label>
          <label className="btn-ghost min-h-14 cursor-pointer text-[15px]">
            <Camera size={18} /> Stats de héros
            <input ref={statsRef} type="file" accept="image/*" className="hidden" onChange={(e) => run(e.target.files?.[0], (text) => setHeroStats({ text, who: statsWho }))} />
          </label>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Stats de héros de :</span>
        {(["moi", "elle"] as const).map((id) => (
          <button key={id} onClick={() => setStatsWho(id)} className={clsx("chip min-h-8 px-3", statsWho === id && "glass-pill font-semibold text-ink")}>
            {nom(id)}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">La capture est lue sur ton iPhone et n&apos;est envoyée nulle part. Tu vérifies toujours avant d&apos;enregistrer.</p>
      {error && <Notice tone="warn">{error}</Notice>}

      {endGame && <EndGameSheet text={endGame.text} heroes={heroes} onClose={() => setEndGame(null)} />}
      {heroStats && <HeroStatsSheet text={heroStats.text} who={heroStats.who} heroes={heroes} onClose={() => setHeroStats(null)} />}
    </section>
  );
}

/** Formulaire pré-rempli à partir de la capture de fin de partie. */
function EndGameSheet({ text, heroes, onClose }: { text: string; heroes: Hero[]; onClose: () => void }) {
  const me = usePersonal();
  const idx = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const pseudos = Object.fromEntries(me.players.map((p) => [p.id, p.pseudo ?? ""])) as Record<Who, string>;
  const guess = useMemo(() => parseScoreboard(text, pseudos), [text, pseudos.moi, pseudos.elle]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastHero = (id: Who) => me.matches.find((m) => (m.player ?? "moi") === id)?.hero ?? null;
  const init = (id: Who, row?: ScoreRow): PlayerForm => ({
    on: id === "moi" || !!row || me.prefs.duo,
    hero: lastHero(id),
    k: row?.kills?.toString() ?? "",
    d: row?.deaths?.toString() ?? "",
    a: row?.assists?.toString() ?? "",
    rating: row?.rating?.toString() ?? "",
    mvp: row?.mvp ?? false,
    found: !!row,
    line: row?.line ?? "",
    tags: [],
    note: "",
  });
  const [result, setResult] = useState<"win" | "loss" | null>(guess.result);
  const [duration, setDuration] = useState(guess.durationMin?.toString() ?? "");
  const [forms, setForms] = useState<Record<Who, PlayerForm>>({ moi: init("moi", guess.rows.moi), elle: init("elle", guess.rows.elle) });
  const set = (id: Who, patch: Partial<PlayerForm>) => setForms((f) => ({ ...f, [id]: { ...f[id], ...patch } }));
  const active = (["moi", "elle"] as const).filter((id) => forms[id].on);
  const ready = result && active.length > 0 && active.every((id) => forms[id].hero && idx.get(forms[id].hero!));

  const save = () => {
    if (!ready) return;
    const gameId = `g${Date.now()}`;
    // Compo de la dernière draft si elle date de moins de 90 min (même partie).
    const dd = me.derniereDraft;
    const recent = dd && Date.now() - new Date(dd.at).getTime() < 90 * 60_000 ? dd : null;
    for (const id of active) {
      const f = forms[id];
      const h = idx.get(f.hero!)!;
      const chosen = me.prefs.rolesDraft?.[id];
      const pl = me.players.find((p) => p.id === id);
      const lane = chosen && h.lanes.includes(chosen) ? chosen : LANES.find((l) => pl?.pool[l]?.includes(h.slug));
      const hasKda = num(f.k) != null && num(f.d) != null && num(f.a) != null;
      personal.addMatch({
        playedAt: new Date().toISOString().slice(0, 10),
        hero: h.slug,
        role: lane ? ROLE_OF_LANE[lane] : (h.roles[0] ?? null),
        result: result!,
        kills: num(f.k) ?? 0,
        deaths: num(f.d) ?? 0,
        assists: num(f.a) ?? 0,
        sansKda: !hasKda,
        rating: num(f.rating),
        durationMin: num(duration),
        mvp: f.mvp,
        rank: null,
        notes: f.note.trim() || null,
        tags: f.tags,
        entry: "capture",
        player: id,
        gameId,
        allies: recent?.allies,
        enemies: recent?.enemies,
      });
    }
    onClose();
  };

  return (
    <Sheet
      title="Fin de partie"
      onClose={onClose}
      footer={
        <button className="btn-gold min-h-14 w-full text-base" disabled={!ready} onClick={save}>
          Enregistrer la partie
        </button>
      }
    >
      <Notice>
        Lu sur la capture : {guess.notes.length ? guess.notes.join(", ") : "peu d'éléments"}. <b>Vérifie chaque champ.</b> Les héros ne sont pas lisibles (ce sont des images) : choisis-les.
      </Notice>

      <div className="grid grid-cols-2 gap-2">
        <button className={clsx("min-h-14 text-lg", result === "win" ? "btn-good" : "btn-ghost")} onClick={() => setResult("win")}>
          Victoire
        </button>
        <button className={clsx("min-h-14 text-lg", result === "loss" ? "btn-bad" : "btn-ghost")} onClick={() => setResult("loss")}>
          Défaite
        </button>
      </div>
      <label className="block">
        <span className="label">Durée (minutes)</span>
        <input className="input" inputMode="decimal" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="14,5" />
      </label>

      {(["moi", "elle"] as const).map((id) => {
        const f = forms[id];
        const p = me.players.find((x) => x.id === id)!;
        return (
          <section key={id} className={clsx("card space-y-3 p-3", !f.on && "opacity-60")}>
            <div className="flex items-center gap-2">
              <p className="flex-1 font-bold">{p.nom}</p>
              {f.on && (f.found ? <span className="chip text-good">ligne trouvée</span> : <span className="chip text-warn">{p.pseudo ? "pseudo non trouvé" : "pas de pseudo"}</span>)}
              <button className={clsx("chip min-h-8 px-3", f.on && "glass-pill text-ink")} onClick={() => set(id, { on: !f.on })}>
                {f.on ? "Dans la partie" : "Absent(e)"}
              </button>
            </div>
            {f.on && (
              <>
                <HeroPicker player={p} heroes={heroes} value={f.hero} onChange={(s) => set(id, { hero: s })} />
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      ["k", "Kills"],
                      ["d", "Morts"],
                      ["a", "Assists"],
                      ["rating", "Note"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      <span className="label">{label}</span>
                      <input className="input px-2 text-center" inputMode="decimal" value={f[key]} onChange={(e) => set(id, { [key]: e.target.value })} />
                    </label>
                  ))}
                </div>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="h-5 w-5" checked={f.mvp} onChange={(e) => set(id, { mvp: e.target.checked })} /> MVP
                </label>
                {f.line && <p className="truncate text-[11px] text-muted">Ligne lue : « {f.line} »</p>}
                <p className="label">Annotations</p>
                <TagPicker tags={f.tags} onToggle={(t) => set(id, { tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] })} note={f.note} onNote={(v) => set(id, { note: v })} />
              </>
            )}
          </section>
        );
      })}

      <details className="card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-xs text-muted [&::-webkit-details-marker]:hidden">Texte lu sur la capture ›</summary>
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap px-3 pb-3 text-[11px] text-ink-2">{text || "(rien)"}</pre>
      </details>
    </Sheet>
  );
}

/** Statistiques de héros du profil du jeu : liste éditable avant enregistrement. */
function HeroStatsSheet({ text, who, heroes, onClose }: { text: string; who: Who; heroes: Hero[]; onClose: () => void }) {
  const me = usePersonal();
  const idx = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const [rows, setRows] = useState<{ hero: string; matches: string; winRate: string }[]>(() =>
    parseHeroStats(text, heroes).map((g: HeroStatGuess) => ({ hero: g.hero, matches: g.matches?.toString() ?? "", winRate: g.winRate?.toString() ?? "" })),
  );
  const nom = me.players.find((p) => p.id === who)?.nom ?? who;
  const save = () => {
    personal.saveHeroStats(
      who,
      rows.map((r) => ({ hero: r.hero, matches: num(r.matches), winRate: num(r.winRate) })),
    );
    onClose();
  };
  return (
    <Sheet
      title={`Stats de héros · ${nom}`}
      onClose={onClose}
      footer={
        <button className="btn-gold min-h-14 w-full text-base" disabled={!rows.length} onClick={save}>
          Enregistrer {rows.length} héros
        </button>
      }
    >
      <Notice>
        Héros reconnus sur la capture. <b>Vérifie les chiffres</b> : ils servent au Draft (bonus de maîtrise) pour {nom}.
      </Notice>
      {rows.map((r, i) => {
        const h = idx.get(r.hero);
        return (
          <div key={r.hero} className="card flex items-center gap-2 p-2.5">
            {h && <HeroAvatar hero={h} size={40} />}
            <span className="min-w-0 flex-1 truncate font-semibold">{h?.name ?? r.hero}</span>
            <label className="w-20">
              <span className="label">Parties</span>
              <input className="input px-2 text-center" inputMode="numeric" value={r.matches} onChange={(e) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, matches: e.target.value } : x)))} />
            </label>
            <label className="w-20">
              <span className="label">Victoires %</span>
              <input className="input px-2 text-center" inputMode="decimal" value={r.winRate} onChange={(e) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, winRate: e.target.value } : x)))} />
            </label>
            <button className="btn-ghost mt-4 min-h-11 min-w-11 px-0" aria-label={`Retirer ${h?.name ?? r.hero}`} onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
      {!rows.length && <p className="card p-4 text-sm text-muted">Aucun héros reconnu. Essaie une capture de la liste des héros du profil, bien nette, sans rognage.</p>}
      <details className="card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-xs text-muted [&::-webkit-details-marker]:hidden">Texte lu sur la capture ›</summary>
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap px-3 pb-3 text-[11px] text-ink-2">{text || "(rien)"}</pre>
      </details>
      <p className="text-[11px] text-muted">
        Lecture automatique expérimentale <AVerifier title="La reconnaissance de texte peut se tromper : vérifie avant d'enregistrer" />
      </p>
    </Sheet>
  );
}
