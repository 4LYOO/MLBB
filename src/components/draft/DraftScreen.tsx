"use client";
/**
 * ÉCRAN DE DRAFT (écran unique, pensé pour l'iPhone)
 *
 *  1. Barre d'actions : réglages repliables, annuler, réinitialiser, sauvegarder
 *  2. Plateau : bans + 5 picks de chaque équipe ; on touche un emplacement pour le cibler
 *  3. Les 3 meilleures suggestions pour l'emplacement ciblé (1 tap = choisir)
 *  4. Mode duo : meilleur pick pour ta conjointe selon ton pick
 *  5. Indicateurs en direct : lanes couvertes, physique/magique, CC total, faiblesses
 *  6. Grille de héros : filtre par rôle + recherche (2-3 lettres), 1 tap = choisir
 *  7. Détails repliables : classement complet, analyse, premier pick, historique
 *  8. Fiche d'avant-partie (voir PregameSheet)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Ban, Bot, ClipboardList, RotateCcw, Save, Search, Star, Trash2, FolderOpen, Undo2, X } from "lucide-react";
import {
  DRAFT_MODES,
  analyzeComposition,
  enemyRecordFrom,
  expandSteps,
  liveIndicators,
  recommend,
  suggestBans,
  suggestFirstPicks,
  suggestSmartBans,
  type DraftContext,
  type MatchupDatum,
  type Team,
} from "@/lib/engine/draft";
import { computeTiers } from "@/lib/engine/tier";
import { DEFAULT_RANK, personalByHero } from "@/lib/data/views";
import { LANES, RANKS, RANK_FR, ROLES, ROLE_COLOR, ROLE_FR, type Hero, type HeroStat, type Lane, type Rank, type Role, type Tier } from "@/lib/domain";
import { AVerifier, HeroAvatar, Notice } from "@/components/ui";
import { personal, poolOf, usePersonal, type Player } from "@/lib/client/store";
import { RecommendationCard } from "./RecommendationCard";
import { CompPanel } from "./CompPanel";
import { PregameSheet } from "./PregameSheet";
import { AntiTiltBanner } from "@/components/rush/AntiTilt";

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
type Owner = Player["id"] | null;
interface Saved {
  id: number;
  name: string;
  mode: string;
  state: { log: Action[]; side: "blue" | "red"; modeId: string; owners?: Owner[] } | null;
  summary: { overall: number | null; allies?: string[]; enemies?: string[] } | null;
  updatedAt: string;
}

export interface DraftScreenProps {
  heroes: Hero[];
  combos: [string, string][];
  statsByRank: Partial<Record<Rank, HeroStat[]>>;
  matchups: MatchupDatum[];
  statsLabel: string;
}

/** Abréviations des lanes pour les indicateurs compacts. */
const LANE_SHORT: Record<Lane, string> = { exp: "EXP", jungle: "JGL", mid: "MID", roam: "ROAM", gold: "GOLD" };
/** Couleur d'une lane = couleur du rôle qui l'occupe habituellement. */
const ROLE_OF_LANE: Record<Lane, Role> = { exp: "Fighter", jungle: "Assassin", mid: "Mage", roam: "Tank", gold: "Marksman" };

/** Une suggestion affichée : héros, score, raison courte, pool. */
interface Sugg {
  hero: Hero;
  score: number;
  short: string;
  inPool?: boolean;
}

export function DraftScreen(p: DraftScreenProps) {
  const me = usePersonal();
  const combos = useMemo(() => new Map(p.combos), [p.combos]);
  const idx = useMemo(() => new Map(p.heroes.map((h) => [h.slug, h])), [p.heroes]);

  // ---------------------------------------------------------------- état de la draft
  const [modeId, setModeId] = useState("free");
  const [side, setSide] = useState<"blue" | "red">("blue");
  const [log, setLog] = useState<Action[]>([]);
  const [target, setTarget] = useState<Target>({ team: "ally", action: "pick", slot: 0 });
  const [rank, setRank] = useState<Rank>(p.statsByRank[DEFAULT_RANK]?.length ? DEFAULT_RANK : ((Object.keys(p.statsByRank)[0] as Rank) ?? "all"));
  const [training, setTraining] = useState(false);
  const [owners, setOwners] = useState<Owner[]>(["moi", "elle", null, null, null]);
  const [roleFilter, setRoleFilter] = useState("");
  const [q, setQ] = useState("");
  const [pregame, setPregame] = useState(false);
  const [currentId, setCurrentId] = useState<number | undefined>();
  const [compare, setCompare] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  const duo = me.prefs.duo;
  // Rôles choisis en arrivant en partie (mémorisés d'une partie à l'autre).
  const roles = me.prefs.rolesDraft ?? {};
  /** Joueur réel d'un emplacement allié : en solo, seul « moi » compte. */
  const effOwner = (i: number): Owner => (duo ? owners[i] : owners[i] === "moi" ? "moi" : null);
  /** Lane choisie par un joueur (null si pas de rôle fixé ou joueur absent en solo). */
  const laneOfOwner = useCallback((o: Owner): Lane | null => (o && (duo || o === "moi") ? (roles[o] ?? null) : null), [duo, roles]);
  const reservedLanes = (["moi", "elle"] as const).map((o) => laneOfOwner(o)).filter((l): l is Lane => !!l);
  // Plateau : on y revient après un choix dans la grille (évite de remonter à la main).
  const boardRef = useRef<HTMLDivElement>(null);
  const backToBoard = () => boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const players = me.players;
  const playerName = (id: Owner) => players.find((x) => x.id === id)?.nom ?? "";

  const mode = DRAFT_MODES.find((m) => m.id === modeId)!;
  const steps = useMemo(() => expandSteps(mode, side), [mode, side]);
  const guided = steps.length > 0;
  const nextStep = guided ? steps[log.length] : undefined;
  const done = guided && log.length >= steps.length;

  // Reconstitue les emplacements à partir de l'historique des actions (permet « Annuler »).
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
  // Mémorise la dernière draft (compo ennemie) pour l'aide-mémoire en partie.
  useEffect(() => {
    if (allies.length || enemies.length) personal.setDerniereDraft(allies, enemies);
  }, [allies, enemies]);
  const bans = useMemo(() => [...state.allyBans, ...state.enemyBans].filter(Boolean) as string[], [state]);
  const taken = useMemo(() => new Set([...allies, ...enemies, ...bans]), [allies, enemies, bans]);

  const activeTarget: Target | null = guided
    ? nextStep
      ? { team: nextStep.team, action: nextStep.action, slot: log.filter((a) => a.team === nextStep.team && a.action === nextStep.action).length }
      : null
    : target;
  const activeOwner: Owner = activeTarget?.team === "ally" && activeTarget.action === "pick" ? effOwner(activeTarget.slot) : null;

  // ---------------------------------------------------------------- données du moteur
  const stats = p.statsByRank[rank] ?? [];
  const statMap = useMemo(() => Object.fromEntries(stats.map((s) => [s.slug, s])), [stats]);
  const tierMap = useMemo(() => Object.fromEntries(computeTiers(stats).map((t) => [t.slug, t.tier])) as Record<string, Tier>, [stats]);
  const mastery = useMemo(() => personalByHero(me.matches), [me.matches]);
  const enemyRecord = useMemo(() => enemyRecordFrom(me.matches), [me.matches]);

  const ctxFor = useCallback(
    (us: string[], them: string[], owner: Owner = null, allyTeam = false): DraftContext => {
      const pl = players.find((x) => x.id === owner);
      const forLane = laneOfOwner(owner);
      // Pool : héros de la lane choisie s'il y en a, sinon tout le pool du joueur.
      const lanePool = pl && forLane ? (pl.pool[forLane] ?? []) : [];
      return {
        heroes: p.heroes,
        allies: us,
        enemies: them,
        bans,
        stats: statMap,
        tiers: tierMap,
        matchups: p.matchups,
        personal: mastery,
        pool: pl ? (lanePool.length ? lanePool : poolOf(pl)) : undefined,
        poolOwner: pl && pl.id !== "moi" ? pl.nom : undefined,
        forLane,
        // Coéquipiers (emplacements sans joueur du duo) : pas de héros dans les lanes que vous avez prises.
        reservedLanes: allyTeam && !owner ? reservedLanes : undefined,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.heroes, bans, statMap, tierMap, p.matchups, mastery, players, laneOfOwner, reservedLanes.join()],
  );

  const analysis = useMemo(() => analyzeComposition(allies, enemies, p.heroes, combos, p.matchups), [allies, enemies, p.heroes, combos, p.matchups]);
  const allyLive = useMemo(() => liveIndicators(allies.map((s) => idx.get(s)!).filter(Boolean)), [allies, idx]);
  const enemyLive = useMemo(() => liveIndicators(enemies.map((s) => idx.get(s)!).filter(Boolean)), [enemies, idx]);

  // Les 3 meilleures suggestions pour l'emplacement ciblé.
  const suggestions: { title: string; items: Sugg[] } = useMemo(() => {
    if (!activeTarget) return { title: "", items: [] };
    if (activeTarget.action === "ban") {
      // Nos bans protègent les héros de pool du duo (moi + elle).
      const protect = activeTarget.team === "ally" ? [...new Set(players.flatMap((pl) => poolOf(pl)))] : undefined;
      const bansS = suggestSmartBans({ ...ctxFor(activeTarget.team === "ally" ? allies : enemies, activeTarget.team === "ally" ? enemies : allies), protect }, activeTarget.team === "ally" ? enemyRecord : {}, 3);
      return { title: activeTarget.team === "ally" ? "Bans conseillés" : "Bans probables de l'adversaire", items: bansS.map((b) => ({ hero: b.hero, score: b.score, short: b.short })) };
    }
    if (activeTarget.team === "enemy") return { title: "Picks probables de l'adversaire", items: recommend(ctxFor(enemies, allies), combos, 3) };
    const ownerLane = laneOfOwner(activeOwner);
    const who = activeOwner ? ` · ${playerName(activeOwner)}${ownerLane ? ` (${LANE_SHORT[ownerLane]})` : ""}` : "";
    return { title: `Meilleurs picks${who}`, items: recommend(ctxFor(allies, enemies, activeOwner, true), combos, 3) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTarget?.team, activeTarget?.action, activeTarget?.slot, allies, enemies, ctxFor, combos, enemyRecord, activeOwner, players]);

  // Mode duo : meilleur pick pour « elle » selon le pick de « moi ».
  const mySlot = owners.indexOf("moi");
  const herSlot = owners.indexOf("elle");
  const duoSuggest: Sugg[] = useMemo(() => {
    if (!duo || mySlot < 0 || herSlot < 0 || !state.allyPicks[mySlot] || state.allyPicks[herSlot]) return [];
    const her = players.find((x) => x.id === "elle");
    const herPool = poolOf(her);
    const recs = recommend(ctxFor(allies, enemies, "elle"), combos, 60);
    const inPool = recs.filter((r) => r.inPool);
    return (herPool.length && inPool.length ? inPool : recs).slice(0, 3);
  }, [duo, mySlot, herSlot, state.allyPicks, players, ctxFor, allies, enemies, combos]);

  // ---------------------------------------------------------------- actions
  const place = useCallback(
    (slug: string, t: Target | null = activeTarget) => {
      if (!t || taken.has(slug)) return;
      setLog((l) => [...l.filter((a) => !(a.team === t.team && a.action === t.action && a.slot === t.slot)), { ...t, slug }]);
      setQ("");
      if (!guided) {
        // Passe automatiquement à l'emplacement libre suivant du même type.
        const size = t.action === "pick" ? 5 : mode.bansPerTeam;
        const arr = t.action === "pick" ? (t.team === "ally" ? state.allyPicks : state.enemyPicks) : t.team === "ally" ? state.allyBans : state.enemyBans;
        // Emplacement libre SUIVANT (on repart du début si besoin) : ne saute pas en arrière sur une place réservée.
        const order = [...Array(size).keys()].map((k) => (t.slot + 1 + k) % size);
        const next = order.find((i) => i !== t.slot && !arr[i]);
        if (next != null) setTarget({ ...t, slot: next });
      }
    },
    [activeTarget, taken, guided, mode.bansPerTeam, state],
  );

  // Mode entraînement : l'adversaire joue tout seul (parmi ses 3 meilleurs choix).
  useEffect(() => {
    if (!training || !nextStep || nextStep.team !== "enemy") return;
    const t = setTimeout(() => {
      const pool = nextStep.action === "pick" ? recommend(ctxFor(enemies, allies), combos, 3).map((r) => r.hero.slug) : suggestBans(ctxFor(enemies, allies), 3).map((b) => b.hero.slug);
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
  const cycleOwner = (i: number) =>
    setOwners((o) => {
      const order: Owner[] = duo ? [null, "moi", "elle"] : [null, "moi"];
      const nextOwner = order[(order.indexOf(o[i]) + 1) % order.length];
      // Un joueur n'occupe qu'un emplacement : on le retire de l'ancien.
      return o.map((x, k) => (k === i ? nextOwner : x === nextOwner && nextOwner ? null : x));
    });
  const save = () => {
    const saved = me.drafts as unknown as Saved[];
    const name = prompt("Nom de la draft :", currentId ? saved.find((s) => s.id === currentId)?.name : `Draft du ${new Date().toLocaleString("fr-FR")}`);
    if (!name) return;
    const id = personal.saveDraft({ id: currentId, name, mode: modeId, state: { log, side, modeId, owners }, summary: { overall: analysis.overall, allies, enemies, bans } });
    setCurrentId(id);
    setMsg("Draft sauvegardée.");
    setTimeout(() => setMsg(""), 2000);
  };
  const changeMode = (id: string) => {
    setModeId(id);
    setLog([]);
    setTarget({ team: "ally", action: "pick", slot: 0 });
  };

  const isActive = (t: Target) => !!activeTarget && activeTarget.team === t.team && activeTarget.action === t.action && activeTarget.slot === t.slot;
  const stepLabel = done
    ? "Draft terminée"
    : activeTarget
      ? `${activeTarget.team === "ally" ? "Nous" : "Eux"} · ${activeTarget.action === "pick" ? `pick ${activeTarget.slot + 1}` : `ban ${activeTarget.slot + 1}`}`
      : "";

  // ---------------------------------------------------------------- grille de héros
  const ownerPool = useMemo(() => new Set(poolOf(players.find((x) => x.id === activeOwner))), [players, activeOwner]);
  const grid = useMemo(() => {
    const n = q.trim().toLowerCase();
    return p.heroes.filter((h) => (!roleFilter || h.roles.includes(roleFilter as never)) && (!n || h.name.toLowerCase().startsWith(n) || h.name.toLowerCase().includes(n)));
  }, [p.heroes, q, roleFilter]);

  // ---------------------------------------------------------------- rendu
  const Slot = ({ t, slug }: { t: Target; slug: string | null }) => {
    const h = slug ? idx.get(slug) : null;
    const pick = t.action === "pick";
    const lane = pick && slug ? (t.team === "ally" ? allyLive.assignment[slug] : enemyLive.assignment[slug]) : null;
    const owner = pick && t.team === "ally" ? effOwner(t.slot) : null;
    const ownerLane = laneOfOwner(owner);
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => !guided && setTarget(t)}
        onKeyDown={(e) => e.key === "Enter" && !guided && setTarget(t)}
        aria-label={`${t.team === "ally" ? "Nous" : "Eux"} ${pick ? "pick" : "ban"} ${t.slot + 1}${h ? ` : ${h.name}` : " (vide)"}`}
        className={clsx(
          "relative flex items-center rounded-2xl border transition-colors duration-100",
          pick ? "min-h-12 gap-2 px-1.5" : "aspect-square justify-center",
          isActive(t) ? "border-gold bg-gold/15" : "border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        )}
      >
        {h ? (
          <>
            <HeroAvatar hero={h} size={pick ? 34 : 26} className={!pick ? "opacity-60 grayscale" : ""} />
            {pick && (
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-semibold">{h.name}</span>
                <span className="block text-[10px] text-muted">{lane ? LANE_SHORT[lane] : ""}</span>
              </span>
            )}
            <button
              className={clsx("grid place-items-center rounded-full bg-white/10 text-ink-2 active:bg-bad", pick ? "h-8 w-8 shrink-0" : "absolute -right-1.5 -top-1.5 h-6 w-6")}
              onClick={(e) => {
                e.stopPropagation();
                removeAt(t);
              }}
              aria-label={`Retirer ${h.name}`}
            >
              <X size={pick ? 15 : 12} />
            </button>
          </>
        ) : pick ? (
          <span className="flex-1 px-1 text-xs text-muted">Pick {t.slot + 1}</span>
        ) : (
          <Ban size={13} className="text-muted" />
        )}
        {pick && t.team === "ally" && (
          <button
            className={clsx("absolute -top-2 left-1 rounded-full px-1.5 text-[10px] font-bold leading-4", owner === "moi" ? "bg-primary text-white" : owner === "elle" ? "bg-[#e66767] text-white" : "bg-white/10 text-muted")}
            onClick={(e) => {
              e.stopPropagation();
              cycleOwner(t.slot);
            }}
            aria-label="Changer le joueur de cet emplacement"
          >
            {owner ? `${playerName(owner).slice(0, 12)}${ownerLane ? ` · ${LANE_SHORT[ownerLane]}` : ""}` : "+ joueur"}
          </button>
        )}
      </div>
    );
  };

  const TeamColumn = ({ team }: { team: Team }) => {
    const picks = team === "ally" ? state.allyPicks : state.enemyPicks;
    const teamBans = team === "ally" ? state.allyBans : state.enemyBans;
    const blue = (team === "ally") === (side === "blue");
    return (
      <div
        className={clsx("rounded-[24px] border p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_30px_-16px_rgba(0,0,0,0.9)]", blue ? "border-s1/40" : "border-bad/40")}
        // Verre teinté : bleu pour le côté bleu, rouge pour le côté rouge
        style={{ background: blue ? "linear-gradient(180deg, rgba(57,135,229,0.16), rgba(57,135,229,0.03))" : "linear-gradient(180deg, rgba(255,107,122,0.15), rgba(255,107,122,0.03))" }}
      >
        <p className={clsx("mb-1.5 text-sm font-bold", blue ? "text-s1" : "text-bad")}>{team === "ally" ? "Nous" : "Eux"}</p>
        <div className="mb-2 grid grid-cols-5 gap-1">
          {teamBans.map((s, i) => (
            <Slot key={i} t={{ team, action: "ban", slot: i }} slug={s} />
          ))}
        </div>
        <div className="space-y-2.5">
          {picks.map((s, i) => (
            <Slot key={i} t={{ team, action: "pick", slot: i }} slug={s} />
          ))}
        </div>
      </div>
    );
  };

  const SuggCards = ({ items, owner }: { items: Sugg[]; owner?: Owner }) => (
    <div className="grid grid-cols-3 gap-2">
      {items.map((s) => (
        <button
          key={s.hero.slug}
          onClick={() => {
            if (owner) {
              const slot = owners.indexOf(owner);
              if (slot >= 0) place(s.hero.slug, { team: "ally", action: "pick", slot });
            } else place(s.hero.slug);
          }}
          className="relative flex min-h-[124px] flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-2 text-center active:bg-white/10"
          aria-label={`Choisir ${s.hero.name}, score ${s.score}, ${s.short}`}
        >
          {s.inPool && <Star size={14} className="absolute right-1.5 top-1.5 fill-gold text-gold" aria-label="dans le pool" />}
          <HeroAvatar hero={s.hero} size={40} />
          <span className="w-full truncate text-[13px] font-semibold">{s.hero.name}</span>
          <span className="text-xl font-bold tabular-nums leading-none text-gold">{s.score}</span>
          <span className="line-clamp-2 text-[11px] leading-tight text-ink-2">{s.short}</span>
          {s.hero.aVerifier && <AVerifier />}
        </button>
      ))}
      {!items.length && <p className="col-span-3 py-3 text-center text-sm text-muted">Aucune suggestion pour l&apos;instant.</p>}
    </div>
  );

  const Indicators = ({ label, live, team }: { label: string; live: ReturnType<typeof liveIndicators>; team: Hero[] }) => (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="w-9 font-bold text-ink-2">{label}</span>
      {LANES.map((l) => (
        <span key={l} className={clsx("rounded-lg px-1.5 py-0.5 font-semibold", live.covered.includes(l) ? "bg-good/20 text-good" : "bg-white/5 text-muted")}>
          {LANE_SHORT[l]}
        </span>
      ))}
      <span className="rounded-lg bg-white/5 px-1.5 py-0.5 text-ink-2">
        {live.physical}P · {live.magic}M
      </span>
      <span className="rounded-lg bg-white/5 px-1.5 py-0.5 text-ink-2">CC {live.cc}</span>
      {team.length >= 3 && live.weaknesses.map((w) => (
        <span key={w} className="rounded-lg bg-bad/20 px-1.5 py-0.5 text-bad">
          {w}
        </span>
      ))}
    </div>
  );

  const savedDrafts = me.drafts as unknown as Saved[];
  const compareRows = savedDrafts.filter((s) => compare.includes(s.id));
  const allyHeroes = allies.map((s) => idx.get(s)!).filter(Boolean);
  const enemyHeroes = enemies.map((s) => idx.get(s)!).filter(Boolean);
  const hasOwnedPick = owners.some((_, i) => effOwner(i) && state.allyPicks[i]);

  return (
    <div className="space-y-3">
      <AntiTiltBanner />
      {/* 1. Barre d'actions */}
      <div className="flex items-stretch gap-2">
        <details className="card min-w-0 flex-1 px-3 py-2">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 truncate text-sm">
              <b>{mode.label.split(" (")[0]}</b> · {side === "blue" ? "bleu" : "rouge"} · {RANK_FR[rank]}
            </span>
            <span className="text-xs text-muted">Réglages</span>
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 pb-1">
            <label className="col-span-2">
              <span className="label">Mode</span>
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
            <label>
              <span className="label">Stats du rang</span>
              <select className="input" value={rank} onChange={(e) => setRank(e.target.value as Rank)}>
                {RANKS.map((r) => (
                  <option key={r} value={r}>
                    {RANK_FR[r]}
                    {p.statsByRank[r]?.length ? "" : " (indispo.)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={duo} onChange={(e) => personal.setPref("duo", e.target.checked)} /> Mode duo
            </label>
            <label className={clsx("col-span-2 flex min-h-11 items-center gap-2 text-sm", !guided && "text-muted")}>
              <input type="checkbox" className="h-5 w-5" checked={training} disabled={!guided} onChange={(e) => setTraining(e.target.checked)} />
              <Bot size={16} /> Entraînement : l&apos;adversaire joue seul {!guided && "(modes guidés)"}
            </label>
            <p className="col-span-2 text-xs text-muted">{mode.description}</p>
          </div>
        </details>
        <button className="btn-ghost min-w-11 px-0" onClick={undo} disabled={!log.length} aria-label="Annuler le dernier choix">
          <Undo2 size={20} />
        </button>
        <button className="btn-ghost min-w-11 px-0" onClick={() => log.length && confirm("Réinitialiser la draft ?") && reset()} disabled={!log.length} aria-label="Réinitialiser">
          <RotateCcw size={20} />
        </button>
        <button className="btn-ghost min-w-11 px-0" onClick={save} disabled={!log.length} aria-label="Sauvegarder la draft">
          <Save size={20} />
        </button>
      </div>
      {msg && <p className="text-sm text-good">{msg}</p>}
      {!stats.length && <Notice tone="warn">Pas de statistiques pour {RANK_FR[rank]} : score fondé sur la composition, les counters et vos pools. {p.statsLabel}</Notice>}

      {/* 1 bis. Nos rôles : à remplir en arrivant en partie */}
      <section className="card space-y-2 p-2.5">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm font-bold">Nos rôles</p>
          <div className="flex rounded-full bg-white/5 p-0.5 text-sm">
            {[false, true].map((v) => (
              <button key={String(v)} onClick={() => personal.setPref("duo", v)} className={clsx("min-h-9 rounded-full px-3 transition-colors duration-150", duo === v ? "glass-pill font-semibold" : "text-muted")}>
                {v ? "Duo" : "Solo"}
              </button>
            ))}
          </div>
        </div>
        {(duo ? (["moi", "elle"] as const) : (["moi"] as const)).map((o) => (
          <div key={o} className="flex items-center gap-1.5">
            <span className={clsx("w-16 shrink-0 truncate text-xs font-bold", o === "moi" ? "text-primary" : "text-[#e66767]")}>{playerName(o)}</span>
            {LANES.map((l) => {
              const on = roles[o] === l;
              const c = ROLE_COLOR[ROLE_OF_LANE[l]];
              return (
                <button
                  key={l}
                  onClick={() => {
                    personal.setRoleDraft(o, on ? null : l);
                    // Une lane par joueur : si l'autre l'avait, on la lui retire.
                    const other = o === "moi" ? "elle" : "moi";
                    if (!on && roles[other] === l) personal.setRoleDraft(other, null);
                  }}
                  aria-pressed={on}
                  className="min-h-10 flex-1 rounded-2xl border text-[11px] font-bold transition-colors duration-150"
                  style={on ? { background: c, borderColor: c, color: "#000" } : { borderColor: `${c}66`, color: c }}
                >
                  {LANE_SHORT[l]}
                </button>
              );
            })}
          </div>
        ))}
      </section>

      {/* 2. Plateau */}
      <div ref={boardRef} className="grid scroll-mt-20 grid-cols-2 gap-2">
        <TeamColumn team="ally" />
        <TeamColumn team="enemy" />
      </div>

      {/* 3. Suggestions pour l'emplacement ciblé */}
      {activeTarget && (
        <section className="card p-3">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className={clsx("text-base font-bold", activeTarget.team === "enemy" ? "text-bad" : "text-gold")}>{suggestions.title}</h2>
            <span className="text-xs text-muted">{stepLabel}</span>
          </div>
          <SuggCards items={suggestions.items} />
        </section>
      )}
      {done && <p className="text-center text-sm font-semibold text-good">Draft terminée.</p>}

      {/* 4. Mode duo */}
      {duoSuggest.length > 0 && activeOwner !== "elle" && (
        <section className="card border-[#e66767]/40 p-3">
          <h2 className="mb-2 text-base font-bold text-[#e66767]">
            Pour {playerName("elle")}
            {laneOfOwner("elle") ? ` (${LANE_SHORT[laneOfOwner("elle")!]})` : ""} · selon ton pick
          </h2>
          <SuggCards items={duoSuggest} owner="elle" />
        </section>
      )}

      {/* 5. Indicateurs en direct */}
      <div className="card space-y-1.5 p-2.5">
        <Indicators label="Nous" live={allyLive} team={allyHeroes} />
        {enemies.length > 0 && <Indicators label="Eux" live={enemyLive} team={enemyHeroes} />}
      </div>

      {/* Fiche d'avant-partie */}
      {hasOwnedPick && (
        <button className="btn-gold w-full" onClick={() => setPregame(true)}>
          <ClipboardList size={18} /> Fiche d&apos;avant-partie
        </button>
      )}

      {/* 6. Grille de héros */}
      <section className="card p-3">
        <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
          {["", ...ROLES].map((r) => (
            <button
              key={r || "all"}
              onClick={() => setRoleFilter(r)}
              className={clsx("min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold", roleFilter === r ? "border-gold bg-gold/15 text-gold" : "border-white/10 text-ink-2")}
              style={r && roleFilter !== r ? { borderColor: `${ROLE_COLOR[r as keyof typeof ROLE_COLOR]}66` } : undefined}
            >
              {r ? ROLE_FR[r as keyof typeof ROLE_FR] : "Tous"}
            </button>
          ))}
        </div>
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder="2-3 lettres…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un héros" />
        </div>
        <div className="grid grid-cols-5 gap-1 sm:grid-cols-8">
          {grid.map((h) => {
            const off = taken.has(h.slug) || !activeTarget || (training && activeTarget.team === "enemy");
            return (
              <button
                key={h.slug}
                disabled={off}
                onClick={() => {
                  place(h.slug);
                  backToBoard();
                }}
                className={clsx("relative flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl p-0.5", off ? "opacity-25" : "active:bg-white/15")}
                title={h.name}
              >
                {ownerPool.has(h.slug) && <Star size={11} className="absolute right-1 top-0.5 fill-gold text-gold" />}
                <HeroAvatar hero={h} size={40} />
                <span className="w-full truncate text-center text-[10px] text-ink-2">{h.name}</span>
              </button>
            );
          })}
          {!grid.length && <p className="col-span-5 py-4 text-center text-sm text-muted">Aucun héros.</p>}
        </div>
      </section>

      {/* 7. Détails */}
      <details className="card p-3">
        <summary className="min-h-9 cursor-pointer text-sm font-semibold">Classement complet et explications</summary>
        <div className="mt-2 space-y-2">
          {recommend(ctxFor(allies, enemies, activeOwner, true), combos, 10).map((r, i) => (
            <RecommendationCard key={`${i}-${r.hero.slug}`} rec={r} rank={i + 1} canPick={!!activeTarget && activeTarget.team === "ally" && activeTarget.action === "pick"} onPick={() => place(r.hero.slug)} />
          ))}
        </div>
      </details>
      <details className="card p-3">
        <summary className="min-h-9 cursor-pointer text-sm font-semibold">Analyse de la composition</summary>
        <div className="mt-3">
          <CompPanel a={analysis} />
        </div>
      </details>
      <details className="card p-3">
        <summary className="min-h-9 cursor-pointer text-sm font-semibold">Meilleur premier pick</summary>
        <ul className="mt-2 space-y-2">
          {suggestFirstPicks(ctxFor(allies, enemies), 5).map((f) => (
            <li key={f.hero.slug} className="flex items-center gap-2 text-sm">
              <HeroAvatar hero={f.hero} size={32} />
              <span className="min-w-0 flex-1">
                <b>{f.hero.name}</b> <span className="text-gold">{f.score}</span>
                <span className="block text-xs text-muted">{f.reasons.join(" ")}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
      <details className="card p-3">
        <summary className="min-h-9 cursor-pointer text-sm font-semibold">Drafts sauvegardées ({savedDrafts.length})</summary>
        <ul className="mt-2 space-y-2">
          {savedDrafts.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={compare.includes(s.id)} onChange={(e) => setCompare((c) => (e.target.checked ? [...c, s.id].slice(-3) : c.filter((x) => x !== s.id)))} aria-label="Comparer" />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <button
                className="btn-ghost min-h-10 px-3"
                onClick={() => {
                  if (!s.state) return;
                  setModeId(s.state.modeId);
                  setSide(s.state.side);
                  setLog(s.state.log);
                  if (s.state.owners) setOwners(s.state.owners);
                  setCurrentId(s.id);
                }}
                aria-label="Ouvrir"
              >
                <FolderOpen size={16} />
              </button>
              <button className="btn-ghost min-h-10 px-3" onClick={() => confirm("Supprimer cette draft ?") && personal.deleteDraft(s.id)} aria-label="Supprimer">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        {compareRows.length > 0 && (
          <table className="table-base mt-3">
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
                  <td>{ind.value ?? "n/a"}</td>
                  {compareRows.map((s) => (
                    <td key={s.id}>{analyzeComposition(s.summary?.allies ?? [], s.summary?.enemies ?? [], p.heroes, combos, p.matchups).indicators.find((x) => x.key === ind.key)?.value ?? "n/a"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>

      {pregame && (
        <PregameSheet
          heroes={p.heroes}
          idx={idx}
          allies={state.allyPicks}
          enemies={enemies}
          owners={owners.map((_, i) => effOwner(i))}
          players={players}
          matchups={p.matchups}
          combos={combos}
          laneOf={(s) => {
            const i = state.allyPicks.indexOf(s);
            return laneOfOwner(i >= 0 ? effOwner(i) : null) ?? allyLive.assignment[s] ?? null;
          }}
          onClose={() => setPregame(false)}
        />
      )}
    </div>
  );
}
