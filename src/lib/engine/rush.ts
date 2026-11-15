/**
 * JOURNAL DE RUSH — calculs à partir de vos parties enregistrées (fonctions pures, testées).
 *  - session : parties enchaînées sans pause de plus de N heures (data/config.json → rush)
 *  - série en cours, étoiles de la session, anti-tilt
 *  - meilleures paires de héros du duo (parties jouées ensemble)
 */
import config from "@data/config.json";

export interface RushMatch {
  id: number;
  playedAt: string; // AAAA-MM-JJ ou date ISO complète
  hero: string;
  role: string | null;
  result: "win" | "loss";
  player?: "moi" | "elle";
  gameId?: string | null;
  createdAt?: string;
}

const R = config.rush;

/** Horodatage d'une partie : date de création si connue (plus précise), sinon date jouée. */
const timeOf = (m: RushMatch) => new Date(m.createdAt ?? m.playedAt).getTime();

/** Une « partie » = une ligne par gameId (une partie en duo n'est comptée qu'une fois). */
export function uniqueGames<T extends RushMatch>(matches: T[]): T[] {
  const seen = new Set<string>();
  return [...matches]
    .sort((a, b) => timeOf(a) - timeOf(b) || a.id - b.id)
    .filter((m) => {
      if (!m.gameId) return true;
      if (seen.has(m.gameId)) return false;
      seen.add(m.gameId);
      return true;
    });
}

/** Parties de la session en cours : on remonte tant que l'écart entre deux parties < N heures. */
export function currentSession<T extends RushMatch>(matches: T[], now = Date.now()): T[] {
  const games = uniqueGames(matches);
  const gap = R.sessionNouvelleApresHeures * 3600_000;
  if (!games.length || now - timeOf(games[games.length - 1]) > gap) return [];
  let i = games.length - 1;
  while (i > 0 && timeOf(games[i]) - timeOf(games[i - 1]) <= gap) i--;
  return games.slice(i);
}

/** Bilan de session : victoires, défaites, étoiles (approximation réglable). */
export function sessionSummary(matches: RushMatch[], now = Date.now()) {
  const s = currentSession(matches, now);
  const wins = s.filter((m) => m.result === "win").length;
  const losses = s.length - wins;
  return { games: s.length, wins, losses, stars: wins * R.etoilesVictoire + losses * R.etoilesDefaite, starsAVerifier: R.etoilesAVerifier };
}

/** Série en cours : nombre de victoires (positif) ou de défaites (négatif) d'affilée. */
export function currentStreak(matches: RushMatch[]): number {
  const games = uniqueGames(matches);
  if (!games.length) return 0;
  const last = games[games.length - 1].result;
  let n = 0;
  for (let i = games.length - 1; i >= 0 && games[i].result === last; i--) n++;
  return last === "win" ? n : -n;
}

/** Anti-tilt : vrai après N défaites d'affilée (data/config.json → rush.antiTiltDefaitesDAffilee). */
export const shouldPause = (matches: RushMatch[]) => currentStreak(matches) <= -R.antiTiltDefaitesDAffilee;

export interface Pair {
  moi: string;
  elle: string;
  games: number;
  wins: number;
  winRate: number;
}

/** Meilleures paires de héros (toi + ta conjointe) d'après les parties jouées ensemble. */
export function duoPairs(matches: RushMatch[]): Pair[] {
  const byGame = new Map<string, { moi?: string; elle?: string; result: "win" | "loss" }>();
  for (const m of matches) {
    if (!m.gameId || !m.player) continue;
    const g = byGame.get(m.gameId) ?? { result: m.result };
    g[m.player] = m.hero;
    byGame.set(m.gameId, g);
  }
  const pairs = new Map<string, Pair>();
  for (const g of byGame.values()) {
    if (!g.moi || !g.elle) continue;
    const key = `${g.moi}+${g.elle}`;
    const p = pairs.get(key) ?? { moi: g.moi, elle: g.elle, games: 0, wins: 0, winRate: 0 };
    p.games++;
    if (g.result === "win") p.wins++;
    p.winRate = (p.wins / p.games) * 100;
    pairs.set(key, p);
  }
  // Tri : win rate (avec un léger lissage pour ne pas surclasser une seule victoire), puis nombre de parties
  const smooth = (p: Pair) => (p.wins + 1) / (p.games + 2);
  return [...pairs.values()].sort((a, b) => smooth(b) - smooth(a) || b.games - a.games);
}

/**
 * Étoiles estimées : total saisi à la main (ex. 100) + étoiles des parties enregistrées depuis.
 * Estimation (+1 / −1 par défaut) : les protections et bonus d'étoiles du jeu ne sont pas comptés.
 */
export function starsEstimate(matches: RushMatch[], base: { valeur: number; at: string } | null | undefined) {
  if (!base) return null;
  const since = new Date(base.at).getTime();
  const games = uniqueGames(matches).filter((m) => timeOf(m) >= since);
  const delta = games.reduce((s, m) => s + (m.result === "win" ? R.etoilesVictoire : R.etoilesDefaite), 0);
  return { total: Math.max(0, base.valeur + delta), delta, games: games.length };
}

// ------------------------------------------------------------------ Annotations
export interface TagDef {
  id: string;
  texte: string;
  ton: "bon" | "mauvais" | "neutre" | string;
}
export const TAGS = config.annotations.etiquettes as TagDef[];
export const tagById = new Map(TAGS.map((t) => [t.id, t]));

export interface TagStat {
  tag: TagDef;
  games: number;
  wins: number;
  winRate: number;
}

/** Bilan par étiquette : nombre de parties annotées et taux de victoire associé. */
export function tagStats(matches: (RushMatch & { tags?: string[] })[]): TagStat[] {
  const map = new Map<string, TagStat>();
  for (const m of matches)
    for (const id of new Set(m.tags ?? [])) {
      const tag = tagById.get(id) ?? { id, texte: id, ton: "neutre" };
      const s = map.get(id) ?? { tag, games: 0, wins: 0, winRate: 0 };
      s.games++;
      if (m.result === "win") s.wins++;
      s.winRate = (s.wins / s.games) * 100;
      map.set(id, s);
    }
  return [...map.values()].sort((a, b) => b.games - a.games);
}

/** Enseignements tirés des annotations (règles simples et transparentes). */
export function tagInsights(matches: (RushMatch & { tags?: string[] })[]): string[] {
  const has = (m: { tags?: string[] }, id: string) => !!m.tags?.includes(id);
  const out: string[] = [];
  const laneWonLost = matches.filter((m) => has(m, "lane-gagnee") && m.result === "loss").length;
  if (laneWonLost >= 2) out.push(`${laneWonLost} défaites malgré une lane gagnée : convertis ton avance en objectifs (Tortue, tours) et rejoins ton équipe plus tôt.`);
  const throws = matches.filter((m) => has(m, "throw")).length;
  if (throws >= 2) out.push(`${throws} parties avec une avance perdue : en fin de partie, ne combats qu'avec vision et objectif à la clé.`);
  const earlyBad = matches.filter((m) => has(m, "early-detruit"));
  const lateSaved = earlyBad.filter((m) => m.result === "win").length;
  if (earlyBad.length >= 3) out.push(`Détruit en early ${earlyBad.length} fois (${lateSaved} victoire(s) quand même) : revois la phase de lane, ou choisis des héros plus solides en début de partie.`);
  const tilt = matches.filter((m) => has(m, "moi-tilt"));
  if (tilt.length >= 2) out.push(`${tilt.filter((m) => m.result === "loss").length}/${tilt.length} défaites quand tu as tilt : l'alerte anti-tilt est là pour ça.`);
  const draft = matches.filter((m) => has(m, "draft-perdue")).length;
  if (draft >= 3) out.push(`${draft} drafts jugées perdues : utilise les bans conseillés et le premier pick « sûr » du Draft.`);
  return out;
}
