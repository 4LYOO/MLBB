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
