/**
 * Import manuel par collage : reconnaît, dans un texte copié depuis une page web
 * (tableau de statistiques), un nom de héros suivi de ses pourcentages.
 * Aucune donnée n'est devinée : une ligne incomplète est signalée et ignorée.
 */
export type Col = "winRate" | "pickRate" | "banRate";
export interface PastedRow {
  hero: string;
  name: string;
  winRate: number;
  pickRate: number;
  banRate: number;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function parsePastedStats(text: string, heroes: { slug: string; name: string }[], order: Col[] = ["winRate", "pickRate", "banRate"]) {
  // Noms triés du plus long au plus court (« Yu Zhong » avant « Sun »…).
  const names = [...heroes].sort((a, b) => b.name.length - a.name.length).map((h) => ({ ...h, n: norm(h.name) }));
  const t = norm(text).replace(/ /g, " ");
  type Hit = { at: number; end: number; slug: string; name: string };
  const hits: Hit[] = [];
  for (const h of names) {
    const re = new RegExp(`(^|[^a-z0-9])(${h.n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=$|[^a-z0-9])`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const at = m.index + m[1].length;
      const end = at + m[2].length;
      if (!hits.some((x) => at < x.end && end > x.at)) hits.push({ at, end, slug: h.slug, name: h.name });
    }
  }
  hits.sort((a, b) => a.at - b.at);
  const rows: PastedRow[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  hits.forEach((h, i) => {
    const segment = t.slice(h.end, hits[i + 1]?.at ?? t.length);
    const nums = [...segment.matchAll(/(-?\d{1,3}(?:[.,]\d+)?)\s*%/g)].map((m) => Number(m[1].replace(",", ".")));
    if (seen.has(h.slug)) return;
    if (nums.length < 3) {
      skipped.push(`${h.name} : ${nums.length} pourcentage(s) trouvé(s) sur 3`);
      return;
    }
    const v = Object.fromEntries(order.map((c, k) => [c, nums[k]])) as Record<Col, number>;
    if (v.winRate > 100 || v.pickRate > 100 || v.winRate < 0 || v.pickRate < 0 || v.banRate < 0) {
      skipped.push(`${h.name} : valeurs hors bornes`);
      return;
    }
    seen.add(h.slug);
    rows.push({ hero: h.slug, name: h.name, ...v });
  });
  return { rows, skipped };
}
