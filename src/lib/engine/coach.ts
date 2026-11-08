/**
 * Statistiques personnelles et coach (source « computed » à partir de tes saisies).
 * Les conseils sont des règles simples et transparentes, pas une IA.
 */
export interface MatchLike {
  id: number;
  playedAt: string;
  hero: string;
  role: string | null;
  result: "win" | "loss";
  kills: number;
  deaths: number;
  assists: number;
  durationMin: number | null;
  mvp: boolean;
}

export interface Agg {
  key: string;
  games: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  mvp: number;
}

export const kdaOf = (k: number, d: number, a: number) => (k + a) / Math.max(1, d);

export function aggregate(matches: MatchLike[], keyOf: (m: MatchLike) => string | null): Agg[] {
  const map = new Map<string, MatchLike[]>();
  for (const m of matches) {
    const k = keyOf(m);
    if (!k) continue;
    map.set(k, [...(map.get(k) ?? []), m]);
  }
  return [...map.entries()]
    .map(([key, ms]) => summarize(key, ms))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

export function summarize(key: string, ms: MatchLike[]): Agg {
  const games = ms.length;
  const wins = ms.filter((m) => m.result === "win").length;
  const k = ms.reduce((s, m) => s + m.kills, 0);
  const d = ms.reduce((s, m) => s + m.deaths, 0);
  const a = ms.reduce((s, m) => s + m.assists, 0);
  return {
    key,
    games,
    wins,
    winRate: games ? (wins / games) * 100 : 0,
    kills: games ? k / games : 0,
    deaths: games ? d / games : 0,
    assists: games ? a / games : 0,
    kda: kdaOf(k, d, a),
    mvp: ms.filter((m) => m.mvp).length,
  };
}

/** Win rate cumulé et glissant (fenêtre 10) dans l'ordre chronologique. */
export function winRateSeries(matches: MatchLike[], window = 10) {
  const chrono = [...matches].sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id - b.id);
  let wins = 0;
  return chrono.map((m, i) => {
    if (m.result === "win") wins++;
    const slice = chrono.slice(Math.max(0, i - window + 1), i + 1);
    return {
      n: i + 1,
      date: m.playedAt.slice(0, 10),
      cumulative: (wins / (i + 1)) * 100,
      rolling: (slice.filter((x) => x.result === "win").length / slice.length) * 100,
      kda: kdaOf(m.kills, m.deaths, m.assists),
    };
  });
}

/** Regroupement par semaine ISO (lundi). */
export function byWeek(matches: MatchLike[]) {
  const wk = (iso: string) => {
    const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  };
  return aggregate(matches, (m) => wk(m.playedAt)).sort((a, b) => a.key.localeCompare(b.key));
}

export interface CoachTip {
  level: "positive" | "info" | "warning";
  title: string;
  detail: string;
}

export function coach(matches: MatchLike[], heroName: (slug: string) => string = (s) => s): CoachTip[] {
  const tips: CoachTip[] = [];
  const n = matches.length;
  if (n < 5) {
    return [{ level: "info", title: "Pas encore assez de parties", detail: `Le coach a besoin d'au moins 5 parties (tu en as ${n}). Ajoute tes parties après chaque session.` }];
  }
  const all = summarize("all", matches);
  const chrono = [...matches].sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id - b.id);

  if (all.deaths >= 6) tips.push({ level: "warning", title: "Trop de morts", detail: `Tu meurs en moyenne ${all.deaths.toFixed(1)} fois par partie. Travaille ton positionnement et la vision avant d'entrer dans les buissons.` });
  else if (all.deaths <= 3) tips.push({ level: "positive", title: "Survie maîtrisée", detail: `Seulement ${all.deaths.toFixed(1)} morts par partie en moyenne : continue.` });

  const heroes = aggregate(matches, (m) => m.hero);
  const weak = heroes.filter((h) => h.games >= 3 && h.winRate < 45);
  const strong = heroes.filter((h) => h.games >= 3 && h.winRate >= 55);
  if (strong.length) tips.push({ level: "positive", title: "Tes héros fiables", detail: `${strong.slice(0, 3).map((h) => `${heroName(h.key)} (${h.winRate.toFixed(0)} % sur ${h.games})`).join(", ")}. Priorise-les en ranked.` });
  if (weak.length) tips.push({ level: "warning", title: "Héros à retravailler", detail: `${weak.slice(0, 3).map((h) => `${heroName(h.key)} (${h.winRate.toFixed(0)} % sur ${h.games})`).join(", ")}. Entraîne-les en partie classique avant de les jouer en ranked.` });

  const occasional = heroes.filter((h) => h.games <= 2).length;
  if (heroes.length >= 8 && occasional / heroes.length > 0.6) tips.push({ level: "info", title: "Pool de héros dispersé", detail: `${occasional} héros joués 1 ou 2 fois seulement. Un pool de 3 à 5 héros par rôle aide à progresser plus vite.` });

  const roles = aggregate(matches, (m) => m.role);
  if (roles.length >= 2) {
    const best = [...roles].filter((r) => r.games >= 3).sort((a, b) => b.winRate - a.winRate)[0];
    const worst = [...roles].filter((r) => r.games >= 3).sort((a, b) => a.winRate - b.winRate)[0];
    if (best && worst && best.key !== worst.key && best.winRate - worst.winRate >= 10)
      tips.push({ level: "info", title: "Écart entre rôles", detail: `Tu gagnes ${best.winRate.toFixed(0)} % en ${best.key} contre ${worst.winRate.toFixed(0)} % en ${worst.key}. Demande ton meilleur rôle en pré-draft.` });
  }

  if (n >= 20) {
    const last = summarize("last", chrono.slice(-10));
    const prev = summarize("prev", chrono.slice(-20, -10));
    if (last.winRate - prev.winRate >= 15) tips.push({ level: "positive", title: "En progression", detail: `${last.winRate.toFixed(0)} % sur tes 10 dernières parties contre ${prev.winRate.toFixed(0)} % sur les 10 précédentes.` });
    if (prev.winRate - last.winRate >= 15) tips.push({ level: "warning", title: "Baisse de forme", detail: `${last.winRate.toFixed(0)} % sur tes 10 dernières parties contre ${prev.winRate.toFixed(0)} % avant. Fais une pause après deux défaites d'affilée.` });
  }

  let streak = 0;
  for (let i = chrono.length - 1; i >= 0 && chrono[i].result === "loss"; i--) streak++;
  if (streak >= 3) tips.push({ level: "warning", title: `${streak} défaites d'affilée`, detail: "Le tilt coûte des étoiles : fais une pause ou passe en partie classique." });

  const timed = matches.filter((m) => m.durationMin != null);
  if (timed.length >= 8) {
    const longG = timed.filter((m) => m.durationMin! >= 18);
    const shortG = timed.filter((m) => m.durationMin! < 13);
    const wr = (ms: MatchLike[]) => (ms.length ? (ms.filter((m) => m.result === "win").length / ms.length) * 100 : null);
    const wl = wr(longG);
    const ws = wr(shortG);
    if (longG.length >= 3 && wl != null && wl < 40) tips.push({ level: "warning", title: "Fins de partie difficiles", detail: `${wl.toFixed(0)} % de victoires dans les parties de 18 min et plus. Travaille les prises de Seigneur et le regroupement.` });
    if (shortG.length >= 3 && ws != null && ws < 40) tips.push({ level: "warning", title: "Débuts de partie difficiles", detail: `${ws.toFixed(0)} % de victoires dans les parties courtes : l'adversaire prend l'avantage tôt. Soigne ta phase de lane.` });
  }
  if (all.mvp / n >= 0.3) tips.push({ level: "positive", title: "Impact élevé", detail: `MVP dans ${Math.round((all.mvp / n) * 100)} % de tes parties.` });
  return tips;
}
