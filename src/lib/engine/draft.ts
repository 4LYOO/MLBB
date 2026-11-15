/**
 * MOTEUR DE DRAFT — déterministe et explicable (source « computed »).
 *
 * Il combine, pour chaque héros candidat, plusieurs critères normalisés dans [-1, 1] :
 *   counter     : avantage moyen contre les héros adverses (données de matchup importées
 *                 si disponibles, sinon règles de mécaniques issues du profil éditorial)
 *   synergy     : synergie moyenne avec les alliés
 *   lane        : occupe une lane encore libre (ou pénalité si sa lane est déjà prise)
 *   damage      : équilibre des dégâts physiques / magiques
 *   cc          : apport de contrôle de foule
 *   composition : frontline, engage, protection du carry
 *   pool        : héros présent dans le pool du joueur (onglet Duo)
 *   mastery     : historique personnel sur ce héros (journal)
 *   stats       : performance statistique (win rate ajusté) dans le rang choisi
 *   meta        : tier calculé
 *   priority    : héros disputé à haut niveau (pick + ban rate) → à sécuriser tôt
 *   safety      : pick sûr à l'aveugle (peu de counters disponibles, héros flex)
 *                 priority et safety pèsent en début de draft et s'effacent au dernier pick
 *   difficulty  : pénalité si le héros dépasse la difficulté maximale choisie
 * Les poids viennent de data/config.json (draft.poids).
 * Score final = 50 + 50 × Σ(poids × critère) / Σ(poids actifs), borné à [0, 100].
 * Un critère sans donnée est désactivé (son poids est retiré) et c'est indiqué.
 *
 * Ce sont des ESTIMATIONS STRATÉGIQUES, pas des probabilités de victoire.
 */
import { LANE_FR, ROLE_FR, type Hero, type HeroStat, type Lane, type Role, type Tag, type Tier } from "@/lib/domain";
import { heroScore, tierValue } from "./tier";
import config from "@data/config.json";

export interface MatchupDatum {
  slug: string;
  other: string;
  kind: "counter" | "synergy";
  score: number;
  unit: string;
  sourceId: string;
}

export interface Weights {
  counter: number;
  synergy: number;
  lane: number;
  damage: number;
  cc: number;
  composition: number;
  pool: number;
  mastery: number;
  stats: number;
  meta: number;
  priority: number;
  safety: number;
  difficulty: number;
}
/** Poids par défaut : réglables dans data/config.json → draft.poids (clés en français). */
const P_ = config.draft.poids;
export const DEFAULT_WEIGHTS: Weights = {
  counter: P_.counter,
  synergy: P_.synergie,
  lane: P_.lane,
  damage: P_.degats,
  cc: P_.cc,
  composition: P_.composition,
  pool: P_.pool,
  mastery: P_.maitrise,
  stats: P_.stats,
  meta: P_.meta,
  priority: P_.priorite,
  safety: P_.securite,
  difficulty: P_.difficulte,
};

export const CRITERIA_FR: Record<keyof Weights, string> = {
  counter: "Counter adverse",
  synergy: "Synergie alliée",
  lane: "Lane / rôle libre",
  damage: "Équilibre des dégâts",
  cc: "Contrôle de foule",
  composition: "Frontline, engage, protection",
  pool: "Pool du joueur",
  mastery: "Maîtrise (journal)",
  stats: "Performance statistique",
  meta: "Méta (tier)",
  priority: "Priorité (héros disputé)",
  safety: "Pick sûr (peu contrable, flex)",
  difficulty: "Prise en main",
};

export interface DraftContext {
  heroes: Hero[];
  allies: string[];
  enemies: string[];
  bans: string[];
  stats?: Record<string, HeroStat>;
  tiers?: Record<string, Tier>;
  matchups?: MatchupDatum[];
  personal?: Record<string, { games: number; wins: number }>;
  maxDifficulty?: number; // 1..3
  weights?: Partial<Weights>;
  /** Héros maîtrisés par le joueur qui choisit (bonus « pool ») et son nom affiché. */
  pool?: string[];
  poolOwner?: string;
  /** Héros à protéger par les bans (pools des deux joueurs du duo). */
  protect?: string[];
}

const fr = (v: number, d: number) => v.toFixed(d).replace(".", ",");
const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const has = (h: Hero, t: Tag) => !!h.profile?.tags.includes(t);
const P = (h: Hero) => h.profile!;
const isFragileCarry = (h: Hero) => !!h.profile && h.profile.durability <= 1 && (h.roles.includes("Marksman") || has(h, "latecarry"));

// ------------------------------------------------------------------ Matchups
export interface Reason {
  text: string;
  value: number;
  source: "data" | "rules";
}

/** Avantage à sens unique de x sur y selon les mécaniques (profil éditorial). */
export function ruleAdvantage(x: Hero, y: Hero): Reason[] {
  if (!x.profile || !y.profile) return [];
  const a = P(x);
  const b = P(y);
  const out: Reason[] = [];
  const add = (value: number, text: string) => out.push({ value, text, source: "rules" });
  if (has(x, "antidash") && (b.mobility >= 3 || has(y, "dash")))
    add(0.6, `${x.name} neutralise les dashs : la mobilité de ${y.name} devient un handicap.`);
  if (has(x, "lockdown") && b.durability <= 1 && (b.mobility >= 3 || has(y, "dash")))
    add(0.35, `Le contrôle ciblé de ${x.name} attrape ${y.name}, fragile et dépendant de sa mobilité.`);
  if (has(x, "antiheal") && (has(y, "heal") || has(y, "selfheal") || b.sustain >= 3))
    add(0.5, `${x.name} réduit les soins dont dépend ${y.name}.`);
  if (has(x, "antitank") && b.durability >= 3) add(0.45, `${x.name} inflige des dégâts anti-tank efficaces contre ${y.name}.`);
  if (a.burst >= 3 && b.durability <= 1 && b.mobility <= 1)
    add(0.4, `${x.name} peut éliminer ${y.name} (fragile et peu mobile) en un seul burst.`);
  if (x.range === "R" && has(x, "poke") && y.range === "M" && b.mobility <= 1)
    add(0.3, `${x.name} harcèle ${y.name} à distance sans risque.`);
  if (has(x, "antidive") && (y.roles.includes("Assassin") || has(y, "dash")))
    add(0.4, `${x.name} punit les plongées de ${y.name}.`);
  if (has(x, "silence") && b.mobility >= 2 && has(y, "dash")) add(0.2, `Le silence de ${x.name} coupe les compétences de ${y.name}.`);
  if (has(y, "immune") && a.cc >= 3 && !has(x, "lockdown"))
    add(-0.2, `${y.name} esquive une partie des contrôles de ${x.name} grâce à ses fenêtres d'immunité.`);
  return out;
}

/**
 * Normalisation des scores de matchup importés vers [-1, 1].
 *  - « pp » : écart en points de pourcentage (±4 pp ⇒ ±1)
 *  - « indice mlbb.io » : indice relatif positif publié par mlbb.io (échelle calibrée sur leurs valeurs)
 */
export const UNIT_SCALE: Record<string, { counter: number; synergy: number }> = {
  pp: { counter: 4, synergy: 4 },
  "indice mlbb.io": { counter: 8, synergy: 5 }, // ≈ 95e centile observé (8 nov. 2026)
};
export const normScore = (score: number, unit: string, kind: "counter" | "synergy") => clamp(score / (UNIT_SCALE[unit]?.[kind] ?? 10));
const fmtData = (score: number, unit: string, kind: "counter" | "synergy", sourceId: string) =>
  unit === "pp"
    ? `Données (${sourceId}) : ${score > 0 ? "+" : ""}${score.toFixed(1)} pp ${kind === "counter" ? "sur ce matchup" : "de synergie"}.`
    : `Données (${sourceId}) : indice de ${kind === "counter" ? "counter" : "synergie"} ${Math.abs(score).toFixed(1)} ${score >= 0 ? "en sa faveur" : "en sa défaveur"}.`;

function dataMatchup(h: string, e: string, data: MatchupDatum[] | undefined): Reason | null {
  if (!data?.length) return null;
  const d = data.find((m) => m.kind === "counter" && m.slug === h && m.other === e);
  if (d) return { value: normScore(d.score, d.unit, "counter"), text: fmtData(d.score, d.unit, "counter", d.sourceId), source: "data" };
  const r = data.find((m) => m.kind === "counter" && m.slug === e && m.other === h);
  if (r) return { value: -normScore(r.score, r.unit, "counter"), text: fmtData(-r.score, r.unit, "counter", r.sourceId), source: "data" };
  return null;
}

/** Matchup global de h contre e dans [-1, 1] (positif = favorable à h). */
export function matchup(h: Hero, e: Hero, data?: MatchupDatum[]): { value: number; reasons: Reason[] } {
  const d = dataMatchup(h.slug, e.slug, data);
  if (d) return { value: d.value, reasons: [d] };
  const pro = ruleAdvantage(h, e);
  const contra = ruleAdvantage(e, h).map((r) => ({ ...r, value: -r.value }));
  const reasons = [...pro, ...contra];
  return { value: clamp(reasons.reduce((s, r) => s + r.value, 0)), reasons };
}

// ------------------------------------------------------------------ Synergies
export const COMBO_KEY = (a: string, b: string) => [a, b].sort().join("+");

export function synergy(h: Hero, a: Hero, combos: Map<string, string>, data?: MatchupDatum[]): { value: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  const d = data?.find((m) => m.kind === "synergy" && ((m.slug === h.slug && m.other === a.slug) || (m.slug === a.slug && m.other === h.slug)));
  if (d) reasons.push({ value: normScore(d.score, d.unit, "synergy"), text: fmtData(d.score, d.unit, "synergy", d.sourceId), source: "data" });
  const combo = combos.get(COMBO_KEY(h.slug, a.slug));
  if (combo) reasons.push({ value: 0.7, text: combo, source: "rules" });
  if (h.profile && a.profile) {
    const x = P(h);
    const y = P(a);
    const add = (value: number, text: string) => reasons.push({ value, text, source: "rules" });
    if (x.engage >= 3 && (has(a, "teamfightult") || (has(a, "aoecc") && y.burst >= 2) || (a.range === "R" && y.burst >= 3)))
      add(0.4, `${h.name} initie, ${a.name} exploite l'engage avec ses dégâts${has(a, "teamfightult") || has(a, "aoecc") ? " de zone" : ""}.`);
    if (y.engage >= 3 && (has(h, "teamfightult") || (has(h, "aoecc") && x.burst >= 2) || (h.range === "R" && x.burst >= 3)))
      add(0.4, `${a.name} initie, ${h.name} exploite l'engage avec ses dégâts${has(h, "teamfightult") || has(h, "aoecc") ? " de zone" : ""}.`);
    if ((has(h, "protect") || has(h, "heal") || x.peel >= 3) && isFragileCarry(a)) add(0.45, `${h.name} protège ${a.name}, carry fragile.`);
    if ((has(a, "protect") || has(a, "heal") || y.peel >= 3) && isFragileCarry(h)) add(0.4, `${a.name} protège ${h.name}, carry fragile.`);
    if (has(h, "heal") && (a.roles.includes("Fighter") || a.roles.includes("Assassin")) && has(a, "dash")) add(0.2, `Les soins de ${h.name} prolongent les plongées de ${a.name}.`);
    if (has(h, "lockdown") && y.burst >= 3 && a.range === "M") add(0.2, `Le contrôle de ${h.name} prépare le burst de ${a.name} (pick-off).`);
    if (has(a, "lockdown") && x.burst >= 3 && h.range === "M") add(0.2, `Le contrôle de ${a.name} prépare le burst de ${h.name} (pick-off).`);
    if (x.durability <= 1 && y.durability <= 1 && x.mobility <= 1 && y.mobility <= 1) add(-0.2, `${h.name} et ${a.name} sont tous deux fragiles et peu mobiles.`);
  }
  if (h.lanes.length === 1 && a.lanes.length === 1 && h.lanes[0] === a.lanes[0])
    reasons.push({ value: -0.35, text: `${h.name} et ${a.name} se disputent la même lane (${LANE_FR[h.lanes[0] as Lane]}).`, source: "rules" });
  return { value: clamp(reasons.reduce((s, r) => s + r.value, 0)), reasons };
}

// ------------------------------------------------------------------ Composition
/** Attribution optimale des lanes (recherche exhaustive, ≤ 5 héros). */
export function assignLanes(team: Hero[]): { assignment: Record<string, Lane | null>; covered: Lane[]; missing: Lane[] } {
  const all: Lane[] = ["exp", "mid", "gold", "jungle", "roam"];
  let best: { score: number; map: Record<string, Lane | null> } = { score: -1, map: {} };
  const rec = (i: number, used: Set<Lane>, map: Record<string, Lane | null>, score: number) => {
    if (i === team.length) {
      if (score > best.score) best = { score, map: { ...map } };
      return;
    }
    const h = team[i];
    let placed = false;
    h.lanes.forEach((l, idx) => {
      if (!used.has(l as Lane)) {
        placed = true;
        used.add(l as Lane);
        map[h.slug] = l as Lane;
        rec(i + 1, used, map, score + 10 - idx); // préfère la lane principale
        used.delete(l as Lane);
      }
    });
    map[h.slug] = null;
    rec(i + 1, used, map, score);
    void placed;
  };
  rec(0, new Set(), {}, 0);
  const covered = Object.values(best.map).filter(Boolean) as Lane[];
  return { assignment: best.map, covered, missing: all.filter((l) => !covered.includes(l)) };
}

export interface TeamMetrics {
  size: number;
  physical: number;
  magic: number;
  cc: number;
  maxDurability: number;
  avgDurability: number;
  maxEngage: number;
  maxPeel: number;
  avgMobility: number;
  early: number;
  mid: number;
  late: number;
  sustain: number;
  hasFragileCarry: boolean;
  lanes: ReturnType<typeof assignLanes>;
  profiled: number;
}

export function teamMetrics(team: Hero[]): TeamMetrics {
  const prof = team.filter((h) => h.profile);
  const n = prof.length || 1;
  const sum = (f: (h: Hero) => number) => prof.reduce((s, h) => s + f(h), 0);
  const max = (f: (h: Hero) => number) => prof.reduce((m, h) => Math.max(m, f(h)), 0);
  return {
    size: team.length,
    physical: team.reduce((s, h) => s + (h.damage === "P" ? 1 : h.damage === "H" ? 0.5 : 0), 0),
    magic: team.reduce((s, h) => s + (h.damage === "M" ? 1 : h.damage === "H" ? 0.5 : 0), 0),
    cc: sum((h) => P(h).cc),
    maxDurability: max((h) => P(h).durability),
    avgDurability: sum((h) => P(h).durability) / n,
    maxEngage: max((h) => P(h).engage),
    maxPeel: max((h) => P(h).peel),
    avgMobility: sum((h) => P(h).mobility) / n,
    early: sum((h) => P(h).early) / n,
    mid: sum((h) => P(h).mid) / n,
    late: sum((h) => P(h).late) / n,
    sustain: sum((h) => P(h).sustain) + prof.filter((h) => has(h, "heal")).length * 2,
    hasFragileCarry: prof.some(isFragileCarry),
    lanes: assignLanes(team),
    profiled: prof.length,
  };
}

/** Une partie du score de composition : valeur [-1, 1], raisons détaillées et étiquette courte. */
export interface FitPart {
  value: number;
  reasons: Reason[];
  short: string | null;
}

/**
 * Ce que le candidat apporte à la composition alliée, critère par critère :
 * lane libre, équilibre des dégâts, contrôle de foule, frontline/engage/protection.
 */
export function fitParts(h: Hero, allies: Hero[]): { lane: Lane | null; parts: { lane: FitPart; damage: FitPart; cc: FitPart; composition: FitPart } } {
  const before = teamMetrics(allies);
  const after = teamMetrics([...allies, h]);
  const lane = after.lanes.assignment[h.slug] ?? null;
  const part = (): FitPart => ({ value: 0, reasons: [], short: null });
  const add = (p: FitPart, value: number, text: string, short?: string) => {
    p.reasons.push({ value, text, source: "rules" });
    p.value = clamp(p.value + value);
    if (short && value > 0 && !p.short) p.short = short;
  };
  const pl = part();
  const pd = part();
  const pc = part();
  const pk = part();

  // Lane / rôle libre
  if (after.lanes.covered.length > before.lanes.covered.length) {
    if (allies.length) add(pl, 0.8, `Occupe la lane manquante : ${LANE_FR[lane!]}.`, `${LANE_FR[lane!]} manquante`);
    else add(pl, 0.2, `Se place en ${LANE_FR[lane!]}.`);
  } else if (allies.length) {
    add(pl, -0.8, `Aucune lane libre compatible (${h.lanes.map((l) => LANE_FR[l as Lane]).join(", ")} déjà occupée).`);
  }
  if (!h.profile) return { lane, parts: { lane: pl, damage: pd, cc: pc, composition: pk } };
  const x = P(h);

  // Équilibre physique / magique
  const mag = h.damage === "M" || h.damage === "H";
  const phy = h.damage === "P" || h.damage === "H";
  if (allies.length >= 1) {
    if (before.magic === 0 && mag) add(pd, allies.length >= 2 ? 0.8 : 0.4, "Apporte les dégâts magiques qui manquent à l'équipe.", "dégâts magiques manquants");
    else if (before.magic === 1 && h.damage === "M" && before.physical >= 2) add(pd, 0.4, "Deuxième source de dégâts magiques : l'adversaire ne pourra pas tout miser sur une défense.", "2e dégât magique");
    if (before.physical === 0 && phy) add(pd, allies.length >= 2 ? 0.8 : 0.4, "Apporte les dégâts physiques qui manquent à l'équipe.", "dégâts physiques manquants");
    else if (before.physical === 1 && h.damage === "P" && before.magic >= 2) add(pd, 0.4, "Deuxième source de dégâts physiques.", "2e dégât physique");
    if (before.magic >= 3 && h.damage === "M") add(pd, -0.5, "Rend l'équipe trop dépendante des dégâts magiques.");
    if (before.physical >= 3 && h.damage === "P") add(pd, -0.5, "Rend l'équipe trop dépendante des dégâts physiques.");
  }

  // Contrôle de foule (CC)
  const ccPerHero = allies.length ? before.cc / allies.length : 0;
  if (allies.length && ccPerHero < 1.6) {
    if (x.cc >= 3) add(pc, 0.8, "L'équipe manque de contrôle de foule : il en apporte beaucoup.", "CC manquant");
    else if (x.cc === 2) add(pc, 0.4, "Ajoute du contrôle à une équipe qui en manque.", "CC manquant");
    else if (x.cc === 0) add(pc, -0.3, "N'apporte aucun contrôle alors que l'équipe en manque.");
  } else if (x.cc >= 3) add(pc, 0.3, "Renforce la chaîne de contrôles.", "chaîne de CC");

  // Frontline, engage, protection du carry
  if (allies.length) {
    if (before.maxDurability < 3 && x.durability >= 3) add(pk, 0.6, "Donne enfin une frontline à l'équipe.", "frontline manquante");
    if (before.maxEngage < 3 && x.engage >= 3) add(pk, 0.4, "Apporte une capacité d'engage.", "engage manquant");
    if (before.hasFragileCarry && before.maxPeel < 2 && x.peel >= 2) add(pk, 0.4, "Protège le carry fragile de l'équipe.", "protège le carry");
    if (allies.length >= 3 && before.maxDurability >= 3 && x.durability >= 3 && x.burst === 0 && before.physical + before.magic < 3)
      add(pk, -0.3, "Encore un profil défensif alors que l'équipe manque de dégâts.");
  }
  return { lane, parts: { lane: pl, damage: pd, cc: pc, composition: pk } };
}

/** Apport total à la composition (compatibilité : somme des 4 critères). */
export function needsFit(h: Hero, allies: Hero[]): { value: number; reasons: Reason[]; lane: Lane | null } {
  const { lane, parts } = fitParts(h, allies);
  const all = [parts.lane, parts.damage, parts.cc, parts.composition];
  return { value: clamp(all.reduce((s2, p) => s2 + p.value, 0)), reasons: all.flatMap((p) => p.reasons), lane };
}

// ------------------------------------------------------------------ Recommandation
export interface Recommendation {
  hero: Hero;
  score: number;
  lane: Lane | null;
  role: Role | null;
  components: Record<keyof Weights, number | null>;
  favorable: { hero: Hero; value: number; reasons: Reason[] }[];
  unfavorable: { hero: Hero; value: number; reasons: Reason[] }[];
  synergies: { hero: Hero; value: number; reasons: Reason[] }[];
  needs: Reason[];
  weaknesses: string[];
  explanation: string[];
  notes: string[];
  /** UNE raison courte, celle qui pèse le plus dans le score (ex. « counter Ling », « CC manquant »). */
  short: string;
  /** Héros du pool du joueur. */
  inPool: boolean;
}

export function buildIndex(heroes: Hero[]) {
  return new Map(heroes.map((h) => [h.slug, h]));
}

// ------------------------------------------------------------------ Haut niveau : counters disponibles
/**
 * Pour chaque héros, la liste des héros qui le contrent fortement.
 * Données de matchup synchronisées si présentes (indice élevé), sinon règles de mécaniques.
 * Calcul mis en cache : il ne dépend que de la liste des héros et des matchups.
 */
const counterCache = new WeakMap<Hero[], { data: MatchupDatum[] | undefined; map: Map<string, string[]> }>();
export function hardCounters(heroes: Hero[], data?: MatchupDatum[]): Map<string, string[]> {
  const c = counterCache.get(heroes);
  if (c && c.data === data) return c.map;
  const map = new Map<string, string[]>();
  for (const d of data ?? []) {
    if (d.kind !== "counter" || normScore(d.score, d.unit, "counter") < 0.5) continue;
    map.set(d.other, [...(map.get(d.other) ?? []), d.slug]);
  }
  for (const h of heroes) {
    if (!h.profile || (map.get(h.slug)?.length ?? 0) >= 3) continue;
    const byRules = heroes.filter((o) => o.slug !== h.slug && o.profile && ruleAdvantage(o, h).reduce((s2, r) => s2 + r.value, 0) >= 0.5).map((o) => o.slug);
    map.set(h.slug, [...new Set([...(map.get(h.slug) ?? []), ...byRules])]);
  }
  counterCache.set(heroes, { data, map });
  return map;
}

export function recommend(ctx: DraftContext, combos: Map<string, string>, limit = 10): Recommendation[] {
  const idx = buildIndex(ctx.heroes);
  const allies = ctx.allies.map((s) => idx.get(s)).filter(Boolean) as Hero[];
  const enemies = ctx.enemies.map((s) => idx.get(s)).filter(Boolean) as Hero[];
  const taken = new Set([...ctx.allies, ...ctx.enemies, ...ctx.bans]);
  const w = { ...DEFAULT_WEIGHTS, ...ctx.weights };
  const hasStats = !!ctx.stats && Object.keys(ctx.stats).length > 0;
  const hasTiers = !!ctx.tiers && Object.keys(ctx.tiers).length > 0;

  // Haut niveau : plus il reste de picks adverses à venir, plus il faut sécuriser les héros
  // disputés et éviter ceux qui se font contrer facilement (early = 1 au premier pick, 0 au dernier).
  const early = Math.max(0, Math.min(1, (5 - enemies.length) / 5));
  const wEff: Weights = { ...w, priority: w.priority * early, safety: w.safety * early };
  // Classement des héros les plus disputés (pick + ban rate) dans le rang choisi.
  const contest = hasStats ? Object.values(ctx.stats!).map((s2) => ({ slug: s2.slug, v: s2.pickRate + s2.banRate })).sort((a, b) => a.v - b.v) : [];
  const contestPct = new Map(contest.map((c2, i) => [c2.slug, contest.length > 1 ? i / (contest.length - 1) : 0.5]));
  const counters = early > 0 ? hardCounters(ctx.heroes, ctx.matchups) : new Map<string, string[]>();

  const out: Recommendation[] = [];
  for (const h of ctx.heroes) {
    if (taken.has(h.slug) || h.incomplete || !h.profile) continue;
    const comp: Record<keyof Weights, number | null> = { counter: null, synergy: null, lane: null, damage: null, cc: null, composition: null, pool: null, mastery: null, stats: null, meta: null, priority: null, safety: null, difficulty: null };
    const notes: string[] = [];

    const mus = enemies.map((e) => ({ hero: e, ...matchup(h, e, ctx.matchups) }));
    if (enemies.length) comp.counter = mus.reduce((s, m) => s + m.value, 0) / enemies.length;
    const syns = allies.map((a) => ({ hero: a, ...synergy(h, a, combos, ctx.matchups) }));
    if (allies.length) comp.synergy = syns.reduce((s, m) => s + m.value, 0) / allies.length;
    const fit = fitParts(h, allies);
    const nf = { lane: fit.lane, reasons: [fit.parts.lane, fit.parts.damage, fit.parts.cc, fit.parts.composition].flatMap((p) => p.reasons) };
    comp.lane = fit.parts.lane.value;
    if (allies.length) {
      comp.damage = fit.parts.damage.value;
      comp.composition = fit.parts.composition.value;
    }
    comp.cc = fit.parts.cc.value;
    const inPool = !!ctx.pool?.includes(h.slug);
    if (ctx.pool?.length) comp.pool = inPool ? 1 : 0;

    const st = ctx.stats?.[h.slug];
    if (st) comp.stats = clamp((heroScore(st).adjWinRate - 50) / 4);
    else if (hasStats) notes.push("Pas de statistique pour ce héros dans le rang choisi.");
    if (hasTiers && ctx.tiers![h.slug]) comp.meta = tierValue(ctx.tiers![h.slug]);
    const me = ctx.personal?.[h.slug];
    if (me && me.games >= 3) comp.mastery = clamp(0.2 + (me.wins / me.games - 0.5) * 2);
    let available: string[] = [];
    if (early > 0) {
      const pct = contestPct.get(h.slug);
      if (pct != null) comp.priority = clamp((pct - 0.5) * 2, -0.3, 1);
      available = (counters.get(h.slug) ?? []).filter((s2) => !taken.has(s2));
      const n = available.length;
      comp.safety = clamp((n === 0 ? 0.7 : n <= 2 ? 0.3 : n <= 4 ? -0.2 : -0.6) + (h.lanes.length >= 2 ? 0.3 : 0));
    }
    if (ctx.maxDifficulty && h.difficulty && h.difficulty > ctx.maxDifficulty) comp.difficulty = -0.6;
    else if (ctx.maxDifficulty) comp.difficulty = 0;

    let num = 0;
    let den = 0;
    (Object.keys(comp) as (keyof Weights)[]).forEach((k) => {
      if (comp[k] != null) {
        num += wEff[k] * comp[k]!;
        den += wEff[k];
      }
    });
    const score = Math.round(Math.max(0, Math.min(100, 50 + (50 * num) / (den || 1))));

    const favorable = mus.filter((m) => m.value >= 0.2).sort((a, b) => b.value - a.value);
    const unfavorable = mus.filter((m) => m.value <= -0.2).sort((a, b) => a.value - b.value);
    const goodSyn = syns.filter((s) => s.value > 0.15).sort((a, b) => b.value - a.value);

    const weaknesses: string[] = [];
    const x = P(h);
    if (x.durability <= 1) weaknesses.push("Fragile : vulnérable au burst et aux contrôles.");
    if (x.mobility <= 0) weaknesses.push("Très peu mobile : dépend de son positionnement.");
    if (x.early <= 1) weaknesses.push("Faible en début de partie.");
    if (x.late <= 1) weaknesses.push("Perd en impact en fin de partie.");
    if (early >= 0.6 && available.length >= 4) weaknesses.push(`Facile à contrer (${available.slice(0, 3).map((s2) => idx.get(s2)?.name ?? s2).join(", ")}…) : plutôt en dernier pick.`);

    const explanation: string[] = [];
    if (favorable.length) explanation.push(`Avantagé contre ${favorable.map((f) => f.hero.name).join(", ")}.`);
    explanation.push(...nf.reasons.filter((r) => r.value > 0).map((r) => r.text));
    if (goodSyn.length) explanation.push(`Bonne synergie avec ${goodSyn.map((s) => s.hero.name).join(", ")}.`);
    if (st) {
      explanation.push(`Win rate ${fr(st.winRate, 1)} % (pick ${fr(st.pickRate, 2)} %, ban ${fr(st.banRate, 1)} %) dans le rang sélectionné.`);
      const conf = heroScore(st).confidence;
      if (conf < 0.7) notes.push(`Pick rate faible (${fr(st.pickRate, 2)} %) : le win rate reflète surtout des spécialistes ; il est déjà ramené vers 50 % dans le score (WR ajusté ${fr(heroScore(st).adjWinRate, 1)} %).`);
    }
    if (comp.mastery != null) explanation.push(`Tu as joué ${me!.games} parties avec ce héros (${Math.round((me!.wins / me!.games) * 100)} % de victoires).`);
    if (!hasStats) notes.push("Statistiques indisponibles : score fondé uniquement sur l'analyse de composition.");
    if (!ctx.matchups?.length) notes.push("Matchups estimés par règles de mécaniques (aucune donnée de matchup importée).");
    if (h.confidence === "low") notes.push("Profil éditorial de faible confiance pour ce héros (à vérifier).");

    // Raison courte : le critère qui contribue le plus (poids × valeur) au score.
    const shortOf: Partial<Record<keyof Weights, string | null>> = {
      counter: favorable[0] ? `counter ${favorable[0].hero.name}` : null,
      synergy: goodSyn[0] ? `synergie ${goodSyn[0].hero.name}` : null,
      lane: fit.parts.lane.short,
      damage: fit.parts.damage.short,
      cc: fit.parts.cc.short,
      composition: fit.parts.composition.short,
      pool: inPool ? (ctx.poolOwner ? `pool de ${ctx.poolOwner}` : "dans ton pool") : null,
      mastery: me && me.games >= 3 ? `${Math.round((me.wins / me.games) * 100)} % sur ${me.games} parties` : null,
      stats: st ? `WR ${fr(st.winRate, 1)} %` : null,
      meta: hasTiers && ctx.tiers![h.slug] ? `tier ${ctx.tiers![h.slug]}` : null,
      priority: st && (comp.priority ?? 0) > 0.5 ? `disputé (pick+ban ${fr(st.pickRate + st.banRate, 0)} %)` : null,
      safety: (comp.safety ?? 0) > 0 ? (h.lanes.length >= 2 && available.length > 2 ? `flex ${h.lanes.map((l) => LANE_FR[l as Lane].replace(" Lane", "")).join("/")}` : "peu contrable") : null,
    };
    // La lane (déjà affichée à part) et le pool (étoile) ne servent qu'en dernier recours :
    // on préfère la raison qui distingue ce héros des autres candidats.
    const ranked = (Object.keys(shortOf) as (keyof Weights)[])
      .filter((k) => shortOf[k] && (comp[k] ?? 0) > 0)
      .sort((a, b) => wEff[b] * (comp[b] ?? 0) - wEff[a] * (comp[a] ?? 0));
    const best = ranked.find((k) => k !== "lane" && k !== "pool") ?? ranked[0];
    const short = best ? shortOf[best]! : "choix équilibré";

    const role = (h.roles.find((r) => (nf.lane === "roam" ? r === "Tank" || r === "Support" : nf.lane === "gold" ? r === "Marksman" : nf.lane === "mid" ? r === "Mage" : true)) ?? h.roles[0] ?? null) as Role | null;
    out.push({
      hero: h,
      score,
      lane: nf.lane,
      role,
      components: comp,
      favorable,
      unfavorable,
      synergies: goodSyn,
      needs: nf.reasons,
      weaknesses,
      explanation,
      notes,
      short,
      inPool,
    });
  }
  return out.sort((a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name)).slice(0, limit);
}

// ------------------------------------------------------------------ Bans & premier pick
export interface BanSuggestion {
  hero: Hero;
  score: number;
  reasons: string[];
}

export function suggestBans(ctx: DraftContext, limit = 6): BanSuggestion[] {
  const idx = buildIndex(ctx.heroes);
  const allies = ctx.allies.map((s) => idx.get(s)).filter(Boolean) as Hero[];
  const taken = new Set([...ctx.allies, ...ctx.enemies, ...ctx.bans]);
  const res: BanSuggestion[] = [];
  for (const h of ctx.heroes) {
    if (taken.has(h.slug) || h.incomplete || !h.profile) continue;
    const reasons: string[] = [];
    let score = 0;
    let parts = 0;
    if (allies.length) {
      const threats = allies.map((a) => ({ a, m: matchup(h, a, ctx.matchups) })).filter((t) => t.m.value > 0.2);
      const t = allies.reduce((s, a) => s + Math.max(0, matchup(h, a, ctx.matchups).value), 0) / allies.length;
      score += t * 0.5;
      parts += 0.5;
      if (threats.length) reasons.push(`Menace directe pour ${threats.map((x) => x.a.name).join(", ")}.`);
    }
    const st = ctx.stats?.[h.slug];
    if (st) {
      const { adjWinRate } = heroScore(st);
      score += clamp((adjWinRate - 50) / 3) * 0.3 + clamp(st.banRate / 50, 0, 1) * 0.2;
      parts += 0.5;
      reasons.push(`WR ${fr(st.winRate, 1)} %, ban ${fr(st.banRate, 1)} % dans le rang choisi.`);
    }
    if (!parts) continue;
    res.push({ hero: h, score: score / parts, reasons });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Premier pick : fort, flexible (plusieurs lanes) et difficile à contrer. */
export function suggestFirstPicks(ctx: DraftContext, limit = 6) {
  const pool = ctx.heroes.filter((h) => !h.incomplete && h.profile && !ctx.bans.includes(h.slug) && !ctx.enemies.includes(h.slug) && !ctx.allies.includes(h.slug));
  return pool
    .map((h) => {
      const hardCounters = pool.filter((o) => o.slug !== h.slug && matchup(o, h, ctx.matchups).value >= 0.4).length;
      const safety = clamp(1 - hardCounters / 8, -1, 1);
      const flex = clamp((h.lanes.length - 1) / 2, 0, 1);
      const st = ctx.stats?.[h.slug];
      const stat = st ? clamp((heroScore(st).adjWinRate - 50) / 3) : null;
      const meta = ctx.tiers?.[h.slug] ? tierValue(ctx.tiers[h.slug]) : null;
      const parts: [number, number][] = [
        [safety, 0.4],
        [flex, 0.25],
      ];
      if (stat != null) parts.push([stat, 0.25]);
      if (meta != null) parts.push([meta, 0.1]);
      const den = parts.reduce((s, p) => s + p[1], 0);
      const score = Math.round(50 + (50 * parts.reduce((s, p) => s + p[0] * p[1], 0)) / den);
      const reasons = [
        hardCounters === 0 ? "Aucun counter évident dans le pool restant." : `${hardCounters} counter(s) potentiel(s) dans le pool.`,
        h.lanes.length > 1 ? `Flexible : ${h.lanes.map((l) => LANE_FR[l as Lane]).join(" / ")}.` : `Lane : ${LANE_FR[h.lanes[0] as Lane]}.`,
      ];
      if (st) reasons.push(`WR ${fr(st.winRate, 1)} % dans le rang choisi.`);
      return { hero: h, score, reasons, hardCounters };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ------------------------------------------------------------------ Analyse de composition
export interface CompAnalysis {
  indicators: { key: string; label: string; value: number | null; hint: string }[];
  overall: number | null;
  strengths: string[];
  weaknesses: string[];
  threats: string[];
  winConditions: string[];
  tips: string[];
  missingLanes: Lane[];
  fragile: boolean;
  laneAssignment: Record<string, Lane | null>;
}

export function analyzeComposition(allySlugs: string[], enemySlugs: string[], heroes: Hero[], combos: Map<string, string>, data?: MatchupDatum[]): CompAnalysis {
  const idx = buildIndex(heroes);
  const allies = allySlugs.map((s) => idx.get(s)).filter(Boolean) as Hero[];
  const enemies = enemySlugs.map((s) => idx.get(s)).filter(Boolean) as Hero[];
  const m = teamMetrics(allies);
  const em = teamMetrics(enemies);
  const pct = (v: number) => Math.round(Math.max(0, Math.min(100, v)));
  const empty = !allies.length;

  let syn: number | null = null;
  if (allies.length >= 2) {
    let s = 0;
    let c = 0;
    for (let i = 0; i < allies.length; i++)
      for (let k = i + 1; k < allies.length; k++) {
        s += synergy(allies[i], allies[k], combos, data).value;
        c++;
      }
    syn = pct(((s / c + 1) / 2) * 100);
  }
  const dmgTotal = m.physical + m.magic;
  const balance = dmgTotal ? pct(100 - (Math.abs(m.physical - m.magic) / dmgTotal) * 100) : null;
  const scale = m.profiled ? 5 / Math.max(m.profiled, 1) : 1; // projette une équipe partielle sur 5
  const indicators = [
    { key: "synergy", label: "Synergie globale", value: syn, hint: "Moyenne des synergies entre paires d'alliés." },
    { key: "damage", label: "Équilibre des dégâts", value: balance, hint: `${m.physical} physique(s) / ${m.magic} magique(s).` },
    { key: "engage", label: "Capacité d'engagement", value: empty ? null : pct((m.maxEngage / 3) * 100), hint: "Meilleur initiateur de l'équipe." },
    { key: "resistance", label: "Résistance", value: empty ? null : pct(((m.maxDurability + m.avgDurability) / 6) * 100), hint: "Frontline principale + durabilité moyenne." },
    { key: "cc", label: "Contrôle de foule", value: empty ? null : pct(((m.cc * scale) / 10) * 100), hint: "Somme des contrôles, projetée sur 5 héros." },
    { key: "peel", label: "Protection des carries", value: m.hasFragileCarry ? pct((m.maxPeel / 3) * 100) : null, hint: m.hasFragileCarry ? "Meilleur protecteur face au carry fragile." : "Pas de carry fragile à protéger." },
    { key: "early", label: "Puissance early", value: empty ? null : pct((m.early / 3) * 100), hint: "Moyenne du profil early." },
    { key: "late", label: "Puissance late", value: empty ? null : pct((m.late / 3) * 100), hint: "Moyenne du profil late." },
    { key: "mobility", label: "Mobilité", value: empty ? null : pct((m.avgMobility / 3) * 100), hint: "Mobilité moyenne." },
  ];
  const vals = indicators.map((i) => i.value).filter((v): v is number => v != null);
  const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (!empty) {
    if (m.maxEngage >= 3) strengths.push("Capacité d'engage fiable pour lancer les teamfights.");
    if (m.cc * scale >= 9) strengths.push("Chaîne de contrôles riche.");
    if (balance != null && balance >= 60 && allies.length >= 3) strengths.push("Dégâts physiques et magiques bien répartis.");
    if (m.late >= 2.5) strengths.push("Très forte en fin de partie.");
    if (m.early >= 2.5) strengths.push("Très forte en début de partie.");
    if (m.sustain >= 6) strengths.push("Bon sustain pour les combats prolongés.");
    if (m.maxDurability < 3 && allies.length >= 3) weaknesses.push("Aucune vraie frontline : l'équipe subira l'engage adverse.");
    if (m.maxEngage < 2 && allies.length >= 3) weaknesses.push("Peu de capacité à initier un combat.");
    if (m.magic === 0 && allies.length >= 3) weaknesses.push("Aucun dégât magique : l'adversaire peut tout miser sur la défense physique.");
    if (m.physical === 0 && allies.length >= 3) weaknesses.push("Aucun dégât physique : l'adversaire peut tout miser sur la défense magique.");
    if (m.hasFragileCarry && m.maxPeel < 2) weaknesses.push("Carry fragile sans protection dédiée.");
    if (m.cc * scale < 5 && allies.length >= 3) weaknesses.push("Contrôle de foule insuffisant.");
    if (m.lanes.missing.length && allies.length >= 4) weaknesses.push(`Lane(s) non couverte(s) : ${m.lanes.missing.map((l) => LANE_FR[l]).join(", ")}.`);
  }
  const fragile = allies.length >= 3 && m.maxDurability < 3 && m.avgDurability < 1.6;
  if (fragile) weaknesses.unshift("Composition fragile : peu de héros capables d'encaisser.");

  const threats: string[] = [];
  for (const e of enemies) {
    const hits = allies.map((a) => ({ a, m: matchup(e, a, data) })).filter((x) => x.m.value >= 0.3).sort((p, q) => q.m.value - p.m.value);
    if (hits.length) threats.push(`${e.name} : ${hits[0].m.reasons.find((r) => r.value > 0)?.text ?? `menace ${hits.map((x) => x.a.name).join(", ")}`}`);
    else if (e.profile && e.profile.burst >= 3 && allies.some((a) => a.profile && a.profile.durability <= 1))
      threats.push(`${e.name} : burst capable de supprimer vos héros fragiles.`);
  }

  const winConditions: string[] = [];
  const tips: string[] = [];
  if (!empty) {
    if (enemies.length) {
      if (m.early - em.early >= 0.4) winConditions.push("Prendre l'avantage tôt : vous êtes plus forts en début de partie, accélérez avant leur pic.");
      if (m.late - em.late >= 0.4) winConditions.push("Temporiser : vous êtes plus forts en fin de partie, évitez les combats inutiles au début.");
      if (em.late - m.late >= 0.4) tips.push("L'adversaire scale mieux : jouez les objectifs tôt (Tortue, tours).");
    }
    if (m.maxEngage >= 3 && m.cc * scale >= 8) winConditions.push("Teamfight à 5 autour des objectifs, engage sur la backline adverse.");
    if (allies.some((a) => has(a, "poke")) && allies.filter((a) => has(a, "poke")).length >= 2) winConditions.push("Siège à distance : harcelez avant d'engager les tours.");
    if (allies.some((a) => has(a, "splitpush"))) winConditions.push("Pression latérale : le split pusher attire des adversaires pendant que l'équipe prend l'objectif.");
    if (allies.filter((a) => has(a, "pick") || has(a, "lockdown")).length >= 2) winConditions.push("Pick-offs : chassez les cibles isolées dans la jungle.");
    if (m.hasFragileCarry) tips.push("Jouez autour de votre carry : restez groupés et protégez-le pendant les combats.");
    if (enemies.some((e) => has(e, "heal") || has(e, "selfheal"))) tips.push("Adversaires avec soins : prévoyez tôt un objet de réduction de soins.");
    if (em.magic >= 3) tips.push("Dégâts adverses majoritairement magiques : priorisez la défense magique.");
    if (em.physical >= 3) tips.push("Dégâts adverses majoritairement physiques : priorisez la défense physique.");
    if (enemies.some((e) => e.profile && e.profile.mobility >= 3)) tips.push("Adversaires très mobiles : gardez vos contrôles pour après leurs dashs.");
  }
  if (!winConditions.length && !empty) winConditions.push("Pas de condition de victoire dominante : jouez la vision et les objectifs sûrs.");

  return { indicators, overall, strengths, weaknesses, threats, winConditions, tips, missingLanes: m.lanes.missing, fragile, laneAssignment: m.lanes.assignment };
}

// ------------------------------------------------------------------ Modes de draft
export type Team = "ally" | "enemy";
export interface DraftStep {
  team: Team;
  action: "ban" | "pick";
}
export interface DraftMode {
  id: string;
  label: string;
  bansPerTeam: number;
  description: string;
  /** Séquence côté BLEU ; inversée automatiquement si tu joues côté rouge. */
  sequence: ("B" | "R")[][] | null;
  phases: ("ban" | "pick")[];
}

const seq = (s: string) => s.split(" ").map((g) => g.split("") as ("B" | "R")[]);

export const DRAFT_MODES: DraftMode[] = [
  { id: "free", label: "Libre (entraînement)", bansPerTeam: 5, description: "Place les héros dans l'ordre que tu veux.", sequence: null, phases: [] },
  {
    id: "ranked-6",
    label: "Classé – 6 bans (Epic, Legend)",
    bansPerTeam: 3,
    description: "Bans simultanés à l'aveugle, puis picks 1-2-2-2-2-1. Ordre indicatif : vérifie les règles en jeu.",
    sequence: seq("BBBRRR B RR BB RR BB R"),
    phases: ["ban", "pick", "pick", "pick", "pick", "pick", "pick"],
  },
  {
    id: "ranked-10",
    label: "Classé – 10 bans (Mythic+)",
    bansPerTeam: 5,
    description: "Bans simultanés à l'aveugle, puis picks 1-2-2-2-2-1. Ordre indicatif : vérifie les règles en jeu.",
    sequence: seq("BBBBBRRRRR B RR BB RR BB R"),
    phases: ["ban", "pick", "pick", "pick", "pick", "pick", "pick"],
  },
  {
    id: "tournament",
    label: "Tournoi (inspiré MPL)",
    bansPerTeam: 5,
    description: "Bans alternés en deux phases. Approche d'entraînement, pas la règle officielle exacte d'un tournoi.",
    sequence: seq("B R B R B R B RR BB R R B R B R BB R"),
    phases: ["ban", "ban", "ban", "ban", "ban", "ban", "pick", "pick", "pick", "pick", "ban", "ban", "ban", "ban", "pick", "pick", "pick"],
  },
];

/** Déroule la séquence d'un mode en étapes unitaires, selon le côté choisi. */
export function expandSteps(mode: DraftMode, side: "blue" | "red"): DraftStep[] {
  if (!mode.sequence) return [];
  const steps: DraftStep[] = [];
  mode.sequence.forEach((group, gi) => {
    for (const c of group) {
      const isBlue = c === "B";
      const team: Team = (isBlue && side === "blue") || (!isBlue && side === "red") ? "ally" : "enemy";
      steps.push({ team, action: mode.phases[gi] });
    }
  });
  return steps;
}

export const roleLabel = (r: Role | null) => (r ? ROLE_FR[r] : "—");

// ------------------------------------------------------------------ Écran de draft : indicateurs et bans
/** Indicateurs en direct d'une équipe : lanes couvertes, dégâts, CC total, faiblesses courtes. */
export function liveIndicators(team: Hero[]) {
  const m = teamMetrics(team);
  const weak: string[] = [];
  if (team.length >= 3) {
    if (m.maxDurability < 3) weak.push("pas de frontline");
    if (m.magic === 0) weak.push("pas de dégâts magiques");
    if (m.physical === 0) weak.push("pas de dégâts physiques");
    if (m.cc / Math.max(1, m.profiled) < 1.6) weak.push("CC faible");
    if (m.maxEngage < 2) weak.push("pas d'engage");
    if (m.hasFragileCarry && m.maxPeel < 2) weak.push("carry non protégé");
  }
  return {
    covered: m.lanes.covered,
    missing: m.lanes.missing,
    assignment: m.lanes.assignment,
    physical: m.physical,
    magic: m.magic,
    cc: m.cc,
    weaknesses: weak,
  };
}

/** Résultats d'un joueur/duo face à un héros adverse (déduits du journal). */
export type EnemyRecord = Record<string, { games: number; wins: number }>;

export interface SmartBan {
  hero: Hero;
  score: number;
  short: string;
  reasons: string[];
}

/**
 * Bans conseillés = héros forts du patch (tier / ban rate) + héros que NOUS controns mal
 * (journal : au moins 2 parties contre lui et moins de 50 % de victoires) + menaces pour nos picks.
 */
export function suggestSmartBans(ctx: DraftContext, record: EnemyRecord = {}, limit = 3): SmartBan[] {
  const idx = buildIndex(ctx.heroes);
  const allies = ctx.allies.map((s) => idx.get(s)).filter(Boolean) as Hero[];
  const taken = new Set([...ctx.allies, ...ctx.enemies, ...ctx.bans]);
  const out: SmartBan[] = [];
  for (const h of ctx.heroes) {
    if (taken.has(h.slug) || h.incomplete || !h.profile) continue;
    const parts: { v: number; short: string; reason: string }[] = [];
    const tier = ctx.tiers?.[h.slug];
    const st = ctx.stats?.[h.slug];
    if (tier === "S+" || tier === "S") parts.push({ v: tier === "S+" ? 1 : 0.7, short: `fort du patch (${tier})`, reason: `Tier ${tier} du patch${st ? ` : WR ${fr(st.winRate, 1)} %, ban ${fr(st.banRate, 1)} %` : ""}.` });
    else if (st && st.banRate >= 30) parts.push({ v: 0.6, short: `ban ${fr(st.banRate, 0)} %`, reason: `Très banni (${fr(st.banRate, 1)} %).` });
    const r = record[h.slug];
    if (r && r.games >= 2 && r.wins / r.games < 0.5) {
      const loss = Math.round((1 - r.wins / r.games) * 100);
      parts.push({ v: 0.5 + (0.5 - r.wins / r.games) * 2, short: `vous perdez ${loss} %`, reason: `Votre journal : ${r.games - r.wins} défaite(s) sur ${r.games} partie(s) contre lui.` });
    }
    // Haut niveau : bannir ce qui contre vos héros de confort (pools du duo) encore jouables.
    if (ctx.protect?.length) {
      const cmap = hardCounters(ctx.heroes, ctx.matchups);
      const threatened = ctx.protect.filter((p2) => !taken.has(p2) && cmap.get(p2)?.includes(h.slug));
      if (threatened.length) {
        const names = threatened.slice(0, 3).map((p2) => idx.get(p2)?.name ?? p2);
        parts.push({ v: Math.min(1, 0.35 + threatened.length * 0.2), short: `contre ${names[0]}${threatened.length > 1 ? ` +${threatened.length - 1}` : ""}`, reason: `Contre vos héros de pool : ${names.join(", ")}.` });
      }
    }
    if (allies.length) {
      const hits = allies.map((a) => ({ a, m: matchup(h, a, ctx.matchups) })).filter((x) => x.m.value >= 0.3).sort((p, q) => q.m.value - p.m.value);
      if (hits.length) parts.push({ v: 0.4 + hits[0].m.value * 0.4, short: `menace ${hits[0].a.name}`, reason: hits[0].m.reasons.find((x) => x.value > 0)?.text ?? `Menace ${hits[0].a.name}.` });
    }
    if (!parts.length) continue;
    parts.sort((a, b) => b.v - a.v);
    const score = Math.round(Math.min(100, 50 + parts.reduce((s2, p) => s2 + p.v, 0) * 25));
    out.push({ hero: h, score, short: parts[0].short, reasons: parts.map((p) => p.reason) });
  }
  return out.sort((a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name)).slice(0, limit);
}

/** Bilan face à chaque héros adverse, à partir des parties du journal qui listent les ennemis. */
export function enemyRecordFrom(matches: { result: "win" | "loss"; enemies?: string[]; gameId?: string | null }[]): EnemyRecord {
  const rec: EnemyRecord = {};
  const seen = new Set<string>();
  for (const m of matches) {
    if (!m.enemies?.length) continue;
    if (m.gameId) {
      if (seen.has(m.gameId)) continue; // une même partie enregistrée pour les deux joueurs ne compte qu'une fois
      seen.add(m.gameId);
    }
    for (const e of m.enemies) {
      const r = (rec[e] ??= { games: 0, wins: 0 });
      r.games++;
      if (m.result === "win") r.wins++;
    }
  }
  return rec;
}
