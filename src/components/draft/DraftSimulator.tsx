"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Ban, Bot, RotateCcw, Save, Undo2, X, Trash2, FolderOpen } from "lucide-react";
import {
  DRAFT_MODES,
  analyzeComposition,
  expandSteps,
  recommend,
  suggestBans,
  suggestFirstPicks,
  type DraftContext,
  type MatchupDatum,
  type Team,
} from "@/lib/engine/draft";
import { computeTiers } from "@/lib/engine/tier";
import { LANE_FR, RANKS, RANK_FR, type Hero, type HeroStat, type Rank, type Tier } from "@/lib/domain";
import { HeroAvatar, Notice } from "@/components/ui";
import { HeroPicker } from "./HeroPicker";
import { RecommendationCard } from "./RecommendationCard";
import { CompPanel } from "./CompPanel";

interface Action {
  team: Team;
  action: "ban" | "pick";
  slot: number;
  slug: string;
}
interface Target {
  team: Team;
  action: "ban" | "pick";
  slot: number;
}
interface Saved {
  id: number;
  name: string;
  mode: string;
  state: { log: Action[]; side: "blue" | "red"; modeId: string } | null;
  summary: { overall: number | null } | null;
  updatedAt: string;
}

export interface DraftProps {
  heroes: Hero[];
  combos: [string, string][];
  statsByRank: Partial<Record<Rank, HeroStat[]>>;
  matchups: MatchupDatum[];
  personal: Record<string, { games: number; wins: number }>;
  favorites: string[];
  statsLabel: string;
}

type Tab = "picks" | "bans" | "first" | "analysis" | "history";

export function DraftSimulator(p: DraftProps) {
  const combos = useMemo(() => new Map(p.combos), [p.combos]);
  const idx = useMemo(() => new Map(p.heroes.map((h) => [h.slug, h])), [p.heroes]);
  const [modeId, setModeId] = useState("free");
  const [side, setSide] = useState<"blue" | "red">("blue");
  const [log, setLog] = useState<Action[]>([]);
  const [target, setTarget] = useState<Target>({ team: "ally", action: "pick", slot: 0 });
  const [rank, setRank] = useState<Rank>((Object.keys(p.statsByRank)[0] as Rank) ?? "all");
  const [maxDiff, setMaxDiff] = useState(0);
  const [useMastery, setUseMastery] = useState(true);
  const [training, setTraining] = useState(false);
  const [tab, setTab] = useState<Tab>("picks");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [currentId, setCurrentId] = useState<number | undefined>();
  const [compare, setCompare] = useState<number[]>([]);
  const [msg, setMsg] = useState("");

  const mode = DRAFT_MODES.find((m) => m.id === modeId)!;
  const steps = useMemo(() => expandSteps(mode, side), [mode, side]);
  const guided = steps.length > 0;
  const nextStep = guided ? steps[log.length] : undefined;
  const done = guided && log.length >= steps.length;

  const state = useMemo(() => {
    const s = { allyPicks: Array<string | null>(5).fill(null), enemyPicks: Array<string | null>(5).fill(null), allyBans: Array<string | null>(mode.bansPerTeam).fill(null), enemyBans: Array<string | null>(mode.bansPerTeam).fill(null) };
    for (const a of log) {
      const arr = a.action === "pick" ? (a.team === "ally" ? s.allyPicks : s.enemyPicks) : a.team === "ally" ? s.allyBans : s.enemyBans;
      if (a.slot < arr.length) arr[a.slot] = a.slug;
    }
    return s;
  }, [log, mode.bansPerTeam]);

  const allies = useMemo(() => state.allyPicks.filter(Boolean) as string[], [state]);
  const enemies = useMemo(() => state.enemyPicks.filter(Boolean) as string[], [state]);
  const bans = useMemo(() => [...state.allyBans, ...state.enemyBans].filter(Boolean) as string[], [state]);
  const taken = useMemo(() => new Set([...allies, ...enemies, ...bans]), [allies, enemies, bans]);

  // Cible active
  const activeTarget: Target | null = guided
    ? nextStep
      ? { team: nextStep.team, action: nextStep.action, slot: log.filter((a) => a.team === nextStep.team && a.action === nextStep.action).length }
      : null
    : target;

  const stats = p.statsByRank[rank] ?? [];
  const statMap = useMemo(() => Object.fromEntries(stats.map((s) => [s.slug, s])), [stats]);
  const tierMap = useMemo(() => Object.fromEntries(computeTiers(stats).map((t) => [t.slug, t.tier])) as Record<string, Tier>, [stats]);

  const ctxFor = useCallback(
    (us: string[], them: string[]): DraftContext => ({
      heroes: p.heroes,
      allies: us,
      enemies: them,
      bans,
      stats: statMap,
      tiers: tierMap,
      matchups: p.matchups,
      personal: useMastery ? p.personal : undefined,
      maxDifficulty: maxDiff || undefined,
    }),
    [p.heroes, bans, statMap, tierMap, p.matchups, p.personal, useMastery, maxDiff],
  );

  const recs = useMemo(() => recommend(ctxFor(allies, enemies), combos, 12), [ctxFor, allies, enemies, combos]);
  const banSugg = useMemo(() => suggestBans(ctxFor(allies, enemies), 8), [ctxFor, allies, enemies]);
  const firstPicks = useMemo(() => suggestFirstPicks(ctxFor(allies, enemies), 8), [ctxFor, allies, enemies]);
  const enemyLikely = useMemo(() => recommend(ctxFor(enemies, allies), combos, 4), [ctxFor, enemies, allies, combos]);
  const analysis = useMemo(() => analyzeComposition(allies, enemies, p.heroes, combos, p.matchups), [allies, enemies, p.heroes, combos, p.matchups]);
  const enemyAnalysis = useMemo(() => analyzeComposition(enemies, allies, p.heroes, combos, p.matchups), [allies, enemies, p.heroes, combos, p.matchups]);

  const place = useCallback(
    (slug: string, t: Target | null = activeTarget) => {
      if (!t || taken.has(slug)) return;
      setLog((l) => [...l.filter((a) => !(a.team === t.team && a.action === t.action && a.slot === t.slot)), { ...t, slug }]);
      if (!guided) {
        // avance vers le prochain emplacement libre du même type
        const size = t.action === "pick" ? 5 : mode.bansPerTeam;
        const arr = t.action === "pick" ? (t.team === "ally" ? state.allyPicks : state.enemyPicks) : t.team === "ally" ? state.allyBans : state.enemyBans;
        const next = [...Array(size).keys()].find((i) => i !== t.slot && !arr[i]);
        if (next != null) setTarget({ ...t, slot: next });
      }
    },
    [activeTarget, taken, guided, mode.bansPerTeam, state],
  );

  // Mode entraînement : l'adversaire joue automatiquement (parmi ses 3 meilleurs choix).
  useEffect(() => {
    if (!training || !nextStep || nextStep.team !== "enemy") return;
    const t = setTimeout(() => {
      const pool =
        nextStep.action === "pick"
          ? recommend(ctxFor(enemies, allies), combos, 3).map((r) => r.hero.slug)
          : suggestBans(ctxFor(enemies, allies), 3).map((b) => b.hero.slug);
      // Sans suggestion exploitable (ex. bans à l'aveugle sans statistiques) : choix aléatoire parmi les héros disponibles.
      const candidates = pool.length ? pool : p.heroes.filter((h) => !taken.has(h.slug) && !h.incomplete).map((h) => h.slug);
      const choice = candidates[Math.floor(Math.random() * (pool.length ? Math.min(3, candidates.length) : candidates.length))];
      if (choice) place(choice);
    }, 450);
    return () => clearTimeout(t);
  }, [training, nextStep, ctxFor, enemies, allies, combos, place, p.heroes, taken]);

  const reset = () => {
    setLog([]);
    setTarget({ team: "ally", action: "pick", slot: 0 });
    setCurrentId(undefined);
  };
  const undo = () => setLog((l) => l.slice(0, -1));
  const removeAt = (t: Target) => setLog((l) => l.filter((a) => !(a.team === t.team && a.action === t.action && a.slot === t.slot)));

  const loadSaved = useCallback(() => fetch("/api/drafts").then((r) => r.json()).then(setSaved).catch(() => {}), []);
  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const save = async () => {
    const name = prompt("Nom de la draft :", currentId ? saved.find((s) => s.id === currentId)?.name : `Draft du ${new Date().toLocaleString("fr-FR")}`);
    if (!name) return;
    const r = await fetch("/api/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: currentId, name, mode: modeId, state: { log, side, modeId }, summary: { overall: analysis.overall, allies, enemies, bans } }),
    });
    const { id } = await r.json();
    setCurrentId(id);
    setMsg("Draft sauvegardée.");
    setTimeout(() => setMsg(""), 2500);
    loadSaved();
  };
  const open = (s: Saved) => {
    if (!s.state) return;
    setModeId(s.state.modeId);
    setSide(s.state.side);
    setLog(s.state.log);
    setCurrentId(s.id);
    setTab("analysis");
  };
  const del = async (id: number) => {
    await fetch(`/api/drafts?id=${id}`, { method: "DELETE" });
    setCompare((c) => c.filter((x) => x !== id));
    loadSaved();
  };

  const changeMode = (id: string) => {
    setModeId(id);
    setLog([]);
    setTarget({ team: "ally", action: "pick", slot: 0 });
  };

  const isActive = (t: Target) => !!activeTarget && activeTarget.team === t.team && activeTarget.action === t.action && activeTarget.slot === t.slot;
  const canPickRec = guided ? !!activeTarget && activeTarget.action === "pick" && activeTarget.team === "ally" : state.allyPicks.some((x) => !x);

  const Slot = ({ t, slug, big }: { t: Target; slug: string | null; big?: boolean }) => {
    const h = slug ? idx.get(slug) : null;
    const lane = t.action === "pick" && t.team === "ally" && slug ? analysis.laneAssignment[slug] : t.action === "pick" && t.team === "enemy" && slug ? enemyAnalysis.laneAssignment[slug] : null;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => !guided && setTarget(t)}
        onKeyDown={(e) => e.key === "Enter" && !guided && setTarget(t)}
        className={clsx(
          "group relative flex items-center gap-2 rounded-2xl border p-1.5 transition active:scale-[0.98]",
          big ? "min-h-[52px]" : "aspect-square min-h-9 justify-center sm:aspect-auto sm:min-h-10",
          isActive(t) ? "border-gold/80 bg-gold/15 shadow-[0_0_0_3px_rgba(245,197,66,0.18),inset_0_1px_0_rgba(255,255,255,0.15)]" : "border-white/10 bg-black/20",
          !guided && "cursor-pointer hover:border-primary/60",
        )}
        aria-label={`${t.team === "ally" ? "Allié" : "Adversaire"} ${t.action === "pick" ? "pick" : "ban"} ${t.slot + 1}${h ? ` : ${h.name}` : " (vide)"}`}
      >
        {h ? (
          <>
            <HeroAvatar hero={h} size={big ? 38 : 26} className={t.action === "ban" ? "grayscale" : ""} />
            {big && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium">{h.name}</span>
                <span className="block text-[10px] text-muted">{lane ? LANE_FR[lane] : h.roles.join(" / ")}</span>
              </span>
            )}
            {t.action === "ban" && <Ban size={12} className="absolute left-1 top-1 text-bad" />}
            <button
              className="absolute -right-1.5 -top-1.5 rounded-full bg-[#2a3158] p-1 text-ink-2 ring-1 ring-white/20 hover:text-bad sm:hidden sm:group-hover:block"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(t);
              }}
              aria-label="Retirer"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <span className="px-1 text-[11px] text-muted">{t.action === "ban" ? <Ban size={12} /> : `Pick ${t.slot + 1}`}</span>
        )}
      </div>
    );
  };

  const TeamCol = ({ team }: { team: Team }) => {
    const picks = team === "ally" ? state.allyPicks : state.enemyPicks;
    const tb = team === "ally" ? state.allyBans : state.enemyBans;
    const blue = (team === "ally") === (side === "blue");
    return (
      <div className={clsx("glass rounded-3xl p-2.5 sm:p-3", blue ? "!border-s1/40 bg-s1/[0.07]" : "!border-bad/40 bg-bad/[0.07]", team === "ally" ? "order-1" : "order-2 xl:order-3")}>
        <p className={clsx("h-display mb-2 text-sm", blue ? "text-s1" : "text-bad")}>
          {team === "ally" ? "Mon équipe" : "Adversaires"} <span className="hidden text-xs font-normal opacity-80 sm:inline">· côté {blue ? "bleu" : "rouge"}</span>
        </p>
        <div className="space-y-1.5">
          {picks.map((s, i) => (
            <Slot key={i} t={{ team, action: "pick", slot: i }} slug={s} big />
          ))}
        </div>
        <p className="mb-1 mt-3 text-[10px] uppercase tracking-wider text-muted">Bans</p>
        <div className="grid grid-cols-5 gap-1">
          {tb.map((s, i) => (
            <Slot key={i} t={{ team, action: "ban", slot: i }} slug={s} />
          ))}
        </div>
      </div>
    );
  };

  const stepLabel = done
    ? "Draft terminée"
    : activeTarget
      ? `${activeTarget.team === "ally" ? "À toi" : "À l'adversaire"} : ${activeTarget.action === "pick" ? `pick ${activeTarget.slot + 1}` : `ban ${activeTarget.slot + 1}`}`
      : "";

  const compareRows = saved.filter((s) => compare.includes(s.id));

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <details className="card card-pad group/tb" open={false}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{mode.label}</span>
            <span className="block truncate text-xs text-muted">
              Côté {side === "blue" ? "bleu" : "rouge"} · stats {RANK_FR[rank]} · {training ? "entraînement" : "manuel"}
            </span>
          </span>
          <span className="chip shrink-0">Réglages</span>
        </summary>
      <div className="mt-3 grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <label className="col-span-2 sm:min-w-52">
          <span className="label">Mode de draft</span>
          <select className="input" value={modeId} onChange={(e) => changeMode(e.target.value)}>
            {DRAFT_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Côté</span>
          <select className="input" value={side} onChange={(e) => setSide(e.target.value as "blue" | "red")}>
            <option value="blue">Bleu</option>
            <option value="red">Rouge</option>
          </select>
        </label>
        <label className="sm:min-w-40">
          <span className="label">Stats du rang</span>
          <select className="input" value={rank} onChange={(e) => setRank(e.target.value as Rank)}>
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {RANK_FR[r]}
                {p.statsByRank[r]?.length ? "" : " (indisponible)"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Difficulté max</span>
          <select className="input" value={maxDiff} onChange={(e) => setMaxDiff(Number(e.target.value))}>
            <option value={0}>Toutes</option>
            <option value={1}>Facile</option>
            <option value={2}>Moyenne</option>
          </select>
        </label>
        <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm text-ink-2 sm:col-span-1 sm:text-xs">
          <input type="checkbox" className="h-5 w-5 accent-[#5b8cff]" checked={useMastery} onChange={(e) => setUseMastery(e.target.checked)} /> Tenir compte de mes parties
        </label>
        <label className={clsx("col-span-2 flex min-h-11 items-center gap-2 text-sm sm:col-span-1 sm:text-xs", guided ? "text-ink-2" : "text-muted")} title={guided ? "" : "Disponible dans les modes guidés"}>
          <input type="checkbox" className="h-5 w-5 accent-[#5b8cff]" checked={training} disabled={!guided} onChange={(e) => setTraining(e.target.checked)} />
          <Bot size={14} /> Entraînement (l&apos;adversaire joue seul)
        </label>
        <p className="col-span-2 w-full text-xs text-muted">{mode.description}</p>
      </div>
      </details>

      {/* Actions : toujours visibles */}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 sm:flex-none" onClick={undo} disabled={!log.length}>
          <Undo2 size={16} /> <span className="hidden sm:inline">Annuler</span>
        </button>
        <button className="btn-ghost flex-1 sm:flex-none" onClick={reset} disabled={!log.length}>
          <RotateCcw size={16} /> <span className="hidden sm:inline">Réinitialiser</span>
        </button>
        <button className="btn-gold flex-[2] sm:ml-auto sm:flex-none" onClick={save} disabled={!log.length}>
          <Save size={16} /> Sauvegarder
        </button>
      </div>
      {msg && <p className="text-sm text-good">{msg}</p>}

      {!stats.length && (
        <Notice tone="warn">
          Aucune statistique pour {RANK_FR[rank]} : le moteur s&apos;appuie uniquement sur l&apos;analyse de composition (profils éditoriaux, règles de counter et de synergie). {p.statsLabel}
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-[260px_1fr_260px]">
        <TeamCol team="ally" />
        <div className="card card-pad order-3 col-span-2 xl:order-2 xl:col-span-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className={clsx("h-display text-lg", activeTarget?.team === "enemy" ? "text-bad" : "text-gold")}>{stepLabel || "Sélection des héros"}</p>
            {!guided && <p className="text-xs text-muted">Clique un emplacement pour le cibler, puis un héros.</p>}
          </div>
          <HeroPicker heroes={p.heroes} taken={taken} onPick={(s) => place(s)} disabled={!activeTarget || (training && activeTarget.team === "enemy")} favorites={new Set(p.favorites)} />
        </div>
        <TeamCol team="enemy" />
      </div>

      {/* Onglets d'analyse */}
      <div className="card card-pad">
        <div className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line px-1 pb-2" role="tablist">
          {(
            [
              ["picks", "Picks recommandés"],
              ["bans", "Bans suggérés"],
              ["first", "Premier pick"],
              ["analysis", "Analyse de la draft"],
              ["history", `Historique & comparaison (${saved.length})`],
            ] as [Tab, string][]
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("shrink-0 rounded-full px-3.5 py-2 text-sm whitespace-nowrap", tab === k ? "bg-white/12 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" : "text-ink-2 hover:bg-white/5")}>
              {l}
            </button>
          ))}
        </div>

        {tab === "picks" && (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              Classement multicritère pour ton prochain pick (counter, synergie, besoins de composition, stats, méta, maîtrise, difficulté). Ouvre une carte pour le détail du score.
            </p>
            {allies.length >= 5 ? (
              <p className="text-sm text-muted">Ton équipe est complète.</p>
            ) : (
              recs.map((r, i) => <RecommendationCard key={`${i}-${r.hero.slug}`} rec={r} rank={i + 1} canPick={canPickRec} onPick={() => place(r.hero.slug, guided ? activeTarget : { team: "ally", action: "pick", slot: state.allyPicks.findIndex((x) => !x) })} />)
            )}
          </div>
        )}

        {tab === "bans" && (
          <div>
            <p className="mb-2 text-xs text-muted">
              Héros qui menacent le plus ta composition actuelle{stats.length ? ", pondérés par leur win rate et ban rate dans le rang choisi" : ""}. Sans alliés ni statistiques, aucune suggestion fiable ne peut être faite.
            </p>
            {banSugg.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {banSugg.map((b) => (
                  <li key={b.hero.slug} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-2.5">
                    <HeroAvatar hero={b.hero} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{b.hero.name}</p>
                      <p className="text-xs text-muted">{b.reasons.join(" ") || "—"}</p>
                    </div>
                    <button
                      className="btn-ghost px-2 py-1 text-xs"
                      disabled={!activeTarget || activeTarget.action !== "ban"}
                      onClick={() => place(b.hero.slug)}
                      title={activeTarget?.action === "ban" ? "Bannir" : "Sélectionne d'abord un emplacement de ban"}
                    >
                      <Ban size={12} /> Bannir
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Choisis au moins un allié (ou importe des statistiques) pour obtenir des suggestions de bans.</p>
            )}
          </div>
        )}

        {tab === "first" && (
          <div>
            <p className="mb-2 text-xs text-muted">Un premier pick doit être difficile à contrer et flexible (plusieurs lanes) ; les statistiques s&apos;ajoutent quand elles existent.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {firstPicks.map((f) => (
                <li key={f.hero.slug} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-2.5">
                  <HeroAvatar hero={f.hero} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {f.hero.name} <span className="text-xs text-muted">· {f.score}/100</span>
                    </p>
                    <p className="text-xs text-muted">{f.reasons.join(" ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "analysis" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <CompPanel a={analysis} enemy={enemies.length ? enemyAnalysis : undefined} />
            <div className="space-y-6">
              <CompPanel a={enemyAnalysis} title="Composition adverse" />
              {enemies.length < 5 && enemyLikely.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Picks probables de l&apos;adversaire</p>
                  <ul className="flex flex-wrap gap-2">
                    {enemyLikely.map((r) => (
                      <li key={r.hero.slug} className="chip">
                        <HeroAvatar hero={r.hero} size={18} /> {r.hero.name} · {r.score}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            {saved.length === 0 && <p className="text-sm text-muted">Aucune draft sauvegardée.</p>}
            <ul className="space-y-2">
              {saved.map((s) => {
                const sum = s.summary as { overall: number | null; allies?: string[]; enemies?: string[] } | null;
                return (
                  <li key={s.id} className={clsx("flex flex-wrap items-center gap-3 rounded-xl border p-2.5", s.id === currentId ? "border-gold/60" : "border-line")}>
                    <input type="checkbox" checked={compare.includes(s.id)} onChange={(e) => setCompare((c) => (e.target.checked ? [...c, s.id].slice(-3) : c.filter((x) => x !== s.id)))} aria-label="Comparer" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted">
                        {DRAFT_MODES.find((m) => m.id === s.mode)?.label} · {new Date(s.updatedAt).toLocaleString("fr-FR")} · qualité {sum?.overall ?? "—"}
                      </p>
                    </div>
                    <div className="flex -space-x-1">
                      {(sum?.allies ?? []).map((a) => idx.get(a) && <HeroAvatar key={a} hero={idx.get(a)!} size={24} />)}
                    </div>
                    <span className="text-xs text-muted">vs</span>
                    <div className="flex -space-x-1">
                      {(sum?.enemies ?? []).map((a) => idx.get(a) && <HeroAvatar key={a} hero={idx.get(a)!} size={24} />)}
                    </div>
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => open(s)}>
                      <FolderOpen size={12} /> Ouvrir
                    </button>
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => del(s.id)} aria-label="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {compareRows.length > 0 && (
              <div className="overflow-x-auto">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Comparaison de compositions (draft actuelle + sélection)</p>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Indicateur</th>
                      <th>Actuelle</th>
                      {compareRows.map((s) => (
                        <th key={s.id}>{s.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.indicators.map((ind) => (
                      <tr key={ind.key}>
                        <td>{ind.label}</td>
                        <td className="tabular-nums">{ind.value ?? "n/a"}</td>
                        {compareRows.map((s) => {
                          const sum = s.summary as { allies?: string[]; enemies?: string[] } | null;
                          const a = analyzeComposition(sum?.allies ?? [], sum?.enemies ?? [], p.heroes, combos, p.matchups);
                          return (
                            <td key={s.id} className="tabular-nums">
                              {a.indicators.find((x) => x.key === ind.key)?.value ?? "n/a"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td className="font-semibold">Qualité globale</td>
                      <td className="font-semibold">{analysis.overall ?? "—"}</td>
                      {compareRows.map((s) => {
                        const sum = s.summary as { allies?: string[]; enemies?: string[] } | null;
                        return (
                          <td key={s.id} className="font-semibold">
                            {analyzeComposition(sum?.allies ?? [], sum?.enemies ?? [], p.heroes, combos, p.matchups).overall ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
