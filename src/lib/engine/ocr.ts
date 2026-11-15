/**
 * Analyse du texte OCR d'un écran de fin de partie (expérimental).
 * Ne fait que PRÉ-REMPLIR le formulaire : l'utilisateur vérifie toujours avant d'enregistrer.
 */
export interface OcrGuess {
  hero: string | null;
  result: "win" | "loss" | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  durationMin: number | null;
  mvp: boolean;
  confidence: string[];
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function parseResultText(text: string, heroes: { slug: string; name: string }[]): OcrGuess {
  const t = norm(text);
  const notes: string[] = [];
  let result: OcrGuess["result"] = null;
  if (/(victory|victoire|victoria|menang)/.test(t)) result = "win";
  else if (/(defeat|defaite|derrota|kalah)/.test(t)) result = "loss";
  if (result) notes.push("résultat détecté");

  let kills: number | null = null;
  let deaths: number | null = null;
  let assists: number | null = null;
  const kda = text.match(/\b(\d{1,2})\s*[/|]\s*(\d{1,2})\s*[/|]\s*(\d{1,2})\b/);
  if (kda) {
    [kills, deaths, assists] = [Number(kda[1]), Number(kda[2]), Number(kda[3])];
    notes.push("K/D/A détecté");
  }
  let durationMin: number | null = null;
  const dur = text.match(/\b([0-5]?\d):([0-5]\d)\b/);
  if (dur) {
    durationMin = Math.round((Number(dur[1]) + Number(dur[2]) / 60) * 10) / 10;
    notes.push("durée détectée");
  }
  const mvp = /\bmvp\b/.test(t);
  // Héros : nom le plus long trouvé dans le texte (évite « Sun » dans « Sunday »)
  const found = heroes
    .filter((h) => new RegExp(`\\b${norm(h.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t))
    .sort((a, b) => b.name.length - a.name.length);
  const hero = found[0]?.slug ?? null;
  if (hero) notes.push(`héros détecté (${found.length} candidat(s))`);
  return { hero, result, kills, deaths, assists, durationMin, mvp, confidence: notes };
}

// ------------------------------------------------------------------ Tableau de fin de partie
/** Ligne d'un joueur sur le tableau des scores. */
export interface ScoreRow {
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  /** Note de performance affichée par le jeu (ex. 9,8). */
  rating: number | null;
  gold: number | null;
  mvp: boolean;
  /** Texte reconnu sur cette ligne (affiché pour vérification). */
  line: string;
}
export interface ScoreboardGuess {
  result: "win" | "loss" | null;
  durationMin: number | null;
  /** Ligne trouvée pour chaque pseudo (toi / ta conjointe). */
  rows: Partial<Record<"moi" | "elle", ScoreRow>>;
  notes: string[];
}

const alnum = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");

/** Distance d'édition (nombre de lettres à changer) : tolère les petites erreurs de lecture. */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Le pseudo apparaît-il dans la ligne (à 1-2 lettres près) ? */
export function lineHasPseudo(line: string, pseudo: string): boolean {
  const p = alnum(pseudo);
  if (p.length < 2) return false;
  const l = alnum(line);
  if (l.includes(p)) return true;
  const tolerance = p.length >= 8 ? 2 : p.length >= 4 ? 1 : 0;
  if (!tolerance) return false;
  const tokens = norm(line).split(/\s+/).map(alnum).filter(Boolean);
  for (let i = 0; i < tokens.length; i++)
    for (let n = 1; n <= 3 && i + n <= tokens.length; n++) if (editDistance(tokens.slice(i, i + n).join(""), p) <= tolerance) return true;
  return false;
}

/** Extrait K/D/A, note, or et MVP d'un morceau de texte (une ligne du tableau). */
export function parseRow(text: string): ScoreRow {
  const row: ScoreRow = { kills: null, deaths: null, assists: null, rating: null, gold: null, mvp: /\bmvp\b/i.test(text), line: text.trim() };
  const slash = text.match(/\b(\d{1,2})\s*[/|]\s*(\d{1,2})\s*[/|]\s*(\d{1,2})\b/);
  let rest = text;
  if (slash) {
    [row.kills, row.deaths, row.assists] = [Number(slash[1]), Number(slash[2]), Number(slash[3])];
    rest = text.replace(slash[0], " ");
  }
  // Or : nombre ≥ 1000 (avec ou sans séparateur de milliers)
  const gold = rest.match(/\b(\d{1,2}[ ,.]\d{3}|\d{4,5})\b/);
  if (gold) {
    row.gold = Number(gold[1].replace(/[ ,.]/g, ""));
    rest = rest.replace(gold[0], " ");
  }
  // Note : nombre à une décimale entre 1 et 20 (ex. 9.8 ou 9,8)
  const rating = rest.match(/\b(1?\d)[.,](\d)\b/);
  if (rating) {
    row.rating = Number(`${rating[1]}.${rating[2]}`);
    rest = rest.replace(rating[0], " ");
  }
  if (row.kills == null) {
    const ints = [...rest.matchAll(/\b\d{1,2}\b/g)].map((m) => Number(m[0])).filter((n) => n <= 60);
    if (ints.length >= 3) [row.kills, row.deaths, row.assists] = ints.slice(0, 3);
  }
  return row;
}

/**
 * Analyse le texte d'une capture du tableau de fin de partie.
 * Les héros sont des images (pas du texte) : ils ne sont pas lus, on les choisit dans le formulaire.
 */
export function parseScoreboard(text: string, pseudos: Partial<Record<"moi" | "elle", string>>): ScoreboardGuess {
  const t = norm(text);
  const notes: string[] = [];
  let result: ScoreboardGuess["result"] = null;
  if (/(victory|victoire|victoria|menang)/.test(t)) result = "win";
  else if (/(defeat|defaite|derrota|kalah)/.test(t)) result = "loss";
  if (result) notes.push("résultat");
  let durationMin: number | null = null;
  const dur = text.match(/\b([0-5]?\d)\s*:\s*([0-5]\d)\b/);
  if (dur) {
    durationMin = Math.round((Number(dur[1]) + Number(dur[2]) / 60) * 10) / 10;
    notes.push("durée");
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ScoreboardGuess["rows"] = {};
  for (const who of ["moi", "elle"] as const) {
    const pseudo = pseudos[who];
    if (!pseudo) continue;
    const i = lines.findIndex((l) => lineHasPseudo(l, pseudo));
    if (i < 0) continue;
    // Les colonnes sont parfois lues sur la ligne suivante : on l'ajoute si la ligne est incomplète.
    let row = parseRow(lines[i]);
    if (row.kills == null && lines[i + 1] && !Object.values(pseudos).some((p) => p && lineHasPseudo(lines[i + 1], p))) row = parseRow(`${lines[i]} ${lines[i + 1]}`);
    rows[who] = row;
    notes.push(`ligne de ${pseudo}`);
  }
  return { result, durationMin, rows, notes };
}

// ------------------------------------------------------------------ Statistiques de héros (profil du jeu)
export interface HeroStatGuess {
  hero: string;
  matches: number | null;
  winRate: number | null;
}

/**
 * Analyse une capture des statistiques de héros du profil (liste ou fiche d'un héros) :
 * pour chaque nom de héros reconnu, le nombre de parties et le taux de victoire qui suivent.
 */
export function parseHeroStats(text: string, heroes: { slug: string; name: string }[]): HeroStatGuess[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sorted = [...heroes].sort((a, b) => b.name.length - a.name.length);
  const esc = (s: string) => norm(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const findHero = (l: string) => sorted.find((h) => h.name.length >= 3 && new RegExp(`(^|[^a-z])${esc(h.name)}([^a-z]|$)`).test(norm(l)));
  const out: HeroStatGuess[] = [];
  for (let i = 0; i < lines.length; i++) {
    const h = findHero(lines[i]);
    if (!h || out.some((o) => o.hero === h.slug)) continue;
    // Fenêtre : la ligne du héros et les 3 suivantes, sans déborder sur le héros suivant.
    const win: string[] = [lines[i]];
    for (let k = i + 1; k < Math.min(lines.length, i + 4) && !findHero(lines[k]); k++) win.push(lines[k]);
    const block = win.join(" \n ");
    const pct = block.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*%/);
    const winRate = pct ? Number(pct[1].replace(",", ".")) : null;
    // Parties : nombre précédé d'un libellé, sinon premier entier qui n'est pas le pourcentage.
    const labelled = norm(block).match(/(matchs?|matches|parties|games|total)\D{0,12}(\d{1,5})/);
    let matches = labelled ? Number(labelled[2]) : null;
    if (matches == null) {
      const noPct = block.replace(pct?.[0] ?? "§", " ");
      const n = noPct.match(/\b(\d{1,5})\b/);
      matches = n ? Number(n[1]) : null;
    }
    if (matches == null && winRate == null) continue;
    out.push({ hero: h.slug, matches, winRate: winRate != null && winRate <= 100 ? winRate : null });
  }
  return out;
}
