/**
 * Connecteur mlbb.io — activé à la demande explicite de l'utilisateur (8 nov. 2026).
 *
 * Ce qui est lu (pages et données publiques ; robots.txt : « Allow: / ») :
 *  - /api/hero/all-heroes          liste des héros
 *  - /en/hero/{slug}               page publique d'un héros (données embarquées dans la page) :
 *                                  stats 6 rangs × 5 périodes, compétences, stats de base, counters,
 *                                  synergies, consensus emblème/talents/sort avec taille d'échantillon
 *  - /api/item/all-items           objets (prix, statistiques, passifs)
 *  - /api/emblem/main-emblems      emblèmes principaux
 *
 * Politesse : User-Agent identifiable, une requête à la fois, pause entre requêtes, reprise limitée.
 * mlbb.io indique tirer ses données du site officiel de Mobile Legends ; il n'est pas affilié à Moonton.
 */
import type { DataPackage } from "@/lib/data/schema";
import type { Lane, Period, Rank, Role } from "@/lib/domain";

export const MLBBIO_BASE = "https://mlbb.io";
const UA = "MLBB-Companion/0.1 (application personnelle ; synchronisation peu fréquente)";
const DELAY_MS = Number(process.env.MLBBIO_DELAY_MS) || 1200;

// ------------------------------------------------------------------ correspondances
export const ourSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Slug d'URL utilisé par mlbb.io (« X.Borg » → « xborg », « Chang'e » → « change »). */
export const ioSlug = (name: string) => name.toLowerCase().replace(/['’.]/g, "").trim().replace(/\s+/g, "-");

const RANK_MAP: Record<string, Rank> = {
  ALL: "all",
  Epic: "epic",
  Legend: "legend",
  Mythic: "mythic",
  "Mythical Honor": "mythical_honor",
  "Mythical Glory+": "mythical_glory", // inclut Mythical Immortal chez mlbb.io
  "Mythical Glory": "mythical_glory",
};
const PERIOD_MAP: Record<number, Period> = { 1: "1d", 2: "3d", 3: "7d", 4: "15d", 5: "30d" };
const LANE_MAP: Record<string, Lane> = { "exp lane": "exp", "mid lane": "mid", "gold lane": "gold", jungle: "jungle", roam: "roam" };
const ROLES: Role[] = ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];

const toLanes = (v: unknown): Lane[] =>
  (Array.isArray(v) ? v : String(v ?? "").split(","))
    .map((x) => LANE_MAP[String(x).trim().toLowerCase()])
    .filter(Boolean) as Lane[];
const toRoles = (v: unknown): Role[] =>
  (Array.isArray(v) ? v : String(v ?? "").split(","))
    .map((x) => String(x).trim())
    .filter((x): x is Role => ROLES.includes(x as Role));

// ------------------------------------------------------------------ extraction de la page
/** Reconstitue le flux de données embarqué d'une page Next.js (self.__next_f). */
export function rscText(html: string): string {
  const out: string[] = [];
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(`"${m[1]}"`));
    } catch {
      /* fragment non décodable : ignoré */
    }
  }
  return out.join("");
}

/** Extrait l'objet JSON qui commence à `start` (parcours équilibré, chaînes comprises). */
export function jsonAt(text: string, start: number): unknown {
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("JSON incomplet");
}

export function extractHeroPage(html: string): any | null {
  const t = rscText(html);
  const i = t.indexOf('{"heroName":');
  if (i < 0) return null;
  return jsonAt(t, i);
}

// ------------------------------------------------------------------ conversion vers mlbb-companion/v1
type Pkg = Required<Pick<DataPackage, "heroes" | "heroStats" | "matchups" | "items" | "catalog">>;

const SKILL_KEY: Record<string, string> = { passive: "passive", skill_1: "skill_1", skill_2: "skill_2", skill_3: "skill_3", ultimate: "ultimate" };
const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/ /g, " ")
    .split("Skill terms")[0]
    .trim();

const numbersOnly = <T extends Record<string, unknown>>(o: T) => {
  const r = Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === "number" && Number.isFinite(v)));
  return Object.keys(r).length ? (r as { [K in keyof T]?: number }) : undefined;
};

/** Retire du début de la description le nom et les étiquettes de type collés (« Rotary ImpactAOE Slow… »). */
export function cleanSkill(raw: unknown, names: (string | undefined)[], type: string): string {
  let d = clean(raw);
  for (const n of names) if (n && d.startsWith(n)) d = d.slice(n.length);
  const words = type.split("|").map((w) => w.trim()).filter(Boolean);
  let changed = true;
  while (changed) {
    changed = false;
    d = d.replace(/^\s+/, "");
    for (const w of words)
      if (d.toLowerCase().startsWith(w.toLowerCase())) {
        d = d.slice(w.length);
        changed = true;
      }
  }
  return d.trim();
}

export function mapHeroPage(page: any, out: Pkg, nameToSlug: (n: string) => string) {
  const h = page?.initialHero;
  if (!h?.hero_name) return;
  const slug = nameToSlug(h.hero_name);
  const dmg = String(h.damageType ?? "").toLowerCase();
  out.heroes.push({
    slug,
    name: h.hero_name,
    roles: toRoles(h.role),
    lanes: toLanes(h.lane),
    portraitUrl: typeof h.img_src === "string" && h.img_src.startsWith("https://") ? h.img_src : undefined,
    specialities: Array.isArray(h.speciality) ? h.speciality : undefined,
    damage: dmg.startsWith("phys") ? "P" : dmg.startsWith("mag") ? "M" : dmg ? "H" : undefined,
    range: /melee/i.test(h.basicAttackType ?? "") ? "M" : /ranged/i.test(h.basicAttackType ?? "") ? "R" : undefined,
    ratings: h.ratings ? numbersOnly({ durability: h.ratings.durability, offense: h.ratings.offense, control: h.ratings.controlEffects, difficulty: h.ratings.difficulty }) : undefined,
    skills: Array.isArray(h.skills)
      ? h.skills.map((s: any) => ({
          key: SKILL_KEY[s.skill_key] ?? String(s.skill_key),
          name: s.skill_key === "passive" && s.fandomName ? s.fandomName : s.name,
          type: s.type ?? undefined,
          description: cleanSkill(s.description, [s.name, s.fandomName], String(s.type ?? "")) || undefined,
          cooldown: s.cooldown ?? null,
          cost: s.cost ?? null,
        }))
      : undefined,
    baseStats: h.baseStats && typeof h.baseStats === "object" ? Object.fromEntries(Object.entries(h.baseStats).filter(([, v]) => typeof v === "number")) as Record<string, number> : undefined,
    extras: {
      emblemConsensus: page.emblemConsensus ?? null,
      battleSpellConsensus: page.battleSpellConsensus ?? null,
      sourceTier: h.tier ?? null,
      sourcePreviousTier: h.previous_tier ?? null,
      statisticsUpdatedAt: h.statisticsUpdatedAt ?? null,
    },
  });
  for (const s of h.statistics ?? []) {
    const rank = RANK_MAP[s.rank_name];
    const period = PERIOD_MAP[s.timeframe_id];
    if (!rank || !period || typeof s.win_rate !== "number") continue;
    if (typeof s.pick_rate !== "number" || typeof s.ban_rate !== "number") continue; // jamais de valeur supposée
    out.heroStats.push({ hero: slug, rank, period, winRate: s.win_rate, pickRate: s.pick_rate, banRate: s.ban_rate });
  }
  // counters : héros que CE héros contre ; weakAgainst : héros qui le contrent. Indice relatif mlbb.io.
  for (const c of h.counters ?? []) if (c?.hero_name && typeof c.weighted_score === "number") out.matchups.push({ hero: slug, other: nameToSlug(c.hero_name), kind: "counter", score: c.weighted_score, unit: "indice mlbb.io", rank: "all" });
  for (const c of h.weakAgainst ?? []) if (c?.hero_name && typeof c.weighted_score === "number") out.matchups.push({ hero: nameToSlug(c.hero_name), other: slug, kind: "counter", score: c.weighted_score, unit: "indice mlbb.io", rank: "all" });
  for (const c of h.synergies ?? []) if (c?.hero_name && typeof c.weighted_score === "number") out.matchups.push({ hero: slug, other: nameToSlug(c.hero_name), kind: "synergy", score: c.weighted_score, unit: "indice mlbb.io", rank: "all" });
  for (const t of page.abilityEmblems ?? []) if (t?.name) out.catalog.push({ kind: "talent", slug: ourSlug(t.name), data: { name: t.name, tier: t.section ?? null, benefits: t.benefits ?? null, description: t.description ?? null } });
  for (const e of page.mainEmblems ?? []) if (e?.name) out.catalog.push({ kind: "emblem", slug: ourSlug(e.name), data: { name: e.name, attributes: e.attributes ?? [] } });
}

const ITEM_CAT: Record<string, "attack" | "magic" | "defense" | "movement"> = { attack: "attack", magic: "magic", defense: "defense", movement: "movement" };
export const ITEM_STAT_FR: Record<string, string> = {
  physical_attack: "Attaque physique",
  magic_power: "Pouvoir magique",
  hp: "PV",
  physical_defense: "Défense physique",
  magic_defense: "Défense magique",
  movement_speed: "Vitesse",
  attack_speed: "Vitesse d'attaque",
  cooldown_reduction: "Réd. recharge",
  lifesteal: "Vol de vie",
  spell_vamp: "Vampirisme",
  penetration: "Pénétration",
};

export function mapItems(list: any[], out: Pkg) {
  const seen = new Set<string>();
  for (const it of list ?? []) {
    if (!it?.name || it.removed) continue;
    const slug = ourSlug(it.name);
    if (seen.has(slug)) continue;
    seen.add(slug);
    const cat = ITEM_CAT[String(it.category ?? "").split(/[ ,&]/)[0].toLowerCase()] ?? "attack";
    const stats = Object.fromEntries(
      Object.entries(ITEM_STAT_FR)
        .map(([k, label]) => [label, Number(it[k])] as const)
        .filter(([, v]) => Number.isFinite(v) && v !== 0),
    );
    const passive = [it.passive_name, it.passive_description ?? it.passive_effects].filter(Boolean).join(" — ") || null;
    out.items.push({ slug, name: it.name, category: cat, price: Number(it.price_total) > 0 ? Number(it.price_total) : null, stats: Object.keys(stats).length ? stats : null, passive });
  }
}

// ------------------------------------------------------------------ réseau
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, kind: "json" | "text", attempt = 1): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: kind === "json" ? "application/json" : "text/html" }, signal: ctrl.signal, cache: "no-store" });
    if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { fatal: true });
    return kind === "json" ? await r.json() : await r.text();
  } catch (e: any) {
    if (e?.fatal || attempt >= 3) throw e;
    await sleep(2000 * attempt);
    return get(url, kind, attempt + 1);
  } finally {
    clearTimeout(timer);
  }
}

export interface SyncProgress {
  (done: number, total: number, label: string): void;
}

/** Télécharge et convertit l'ensemble des données en un paquet mlbb-companion/v1. */
export async function fetchMlbbioPackage(knownNames: Map<string, string>, onProgress: SyncProgress = () => {}, opts: { limit?: number } = {}): Promise<{ pkg: DataPackage; errors: string[] }> {
  const errors: string[] = [];
  const out: Pkg = { heroes: [], heroStats: [], matchups: [], items: [], catalog: [] };
  // Héros connus : on garde nos slugs (ex. « x-borg ») ; nouveaux héros : slug dérivé du nom.
  const nameToSlug = (n: string) => knownNames.get(ourSlug(n)) ?? ourSlug(n);

  const roster = await get(`${MLBBIO_BASE}/api/hero/all-heroes`, "json");
  const heroes: { hero_name: string }[] = (roster?.data ?? []).filter((h: any) => h?.hero_name).slice(0, opts.limit ?? Infinity);
  if (!heroes.length) throw new Error("Liste des héros vide : format de mlbb.io modifié ?");
  const total = heroes.length + 2;
  let done = 0;

  for (const h of heroes) {
    onProgress(done, total, h.hero_name);
    try {
      const page = extractHeroPage(await get(`${MLBBIO_BASE}/en/hero/${encodeURIComponent(ioSlug(h.hero_name))}`, "text"));
      if (page) mapHeroPage(page, out, nameToSlug);
      else errors.push(`${h.hero_name} : données introuvables dans la page.`);
    } catch (e) {
      errors.push(`${h.hero_name} : ${e instanceof Error ? e.message : e}`);
    }
    done++;
    await sleep(DELAY_MS);
  }
  onProgress(done, total, "objets");
  try {
    mapItems((await get(`${MLBBIO_BASE}/api/item/all-items`, "json"))?.data ?? [], out);
  } catch (e) {
    errors.push(`objets : ${e instanceof Error ? e.message : e}`);
  }
  done++;
  await sleep(DELAY_MS);
  onProgress(done, total, "emblèmes");
  try {
    for (const e of (await get(`${MLBBIO_BASE}/api/emblem/main-emblems`, "json"))?.data ?? [])
      if (e?.name) out.catalog.push({ kind: "emblem", slug: ourSlug(e.name), data: { name: e.name, attributes: e.attributes ?? [] } });
  } catch (e) {
    errors.push(`emblèmes : ${e instanceof Error ? e.message : e}`);
  }
  done++;
  onProgress(done, total, "terminé");

  // Dédoublonnage du catalogue (les talents sont répétés sur chaque page).
  const cat = new Map(out.catalog.map((c) => [`${c.kind}:${c.slug}`, c]));
  const dataAsOf = out.heroes.map((h) => (h.extras as any)?.statisticsUpdatedAt).filter(Boolean).sort().at(-1) ?? null;
  const pkg: DataPackage = {
    format: "mlbb-companion/v1",
    source: { id: "mlbbio", name: "mlbb.io", kind: "statistical", url: `${MLBBIO_BASE}/en/hero-statistics`, reliability: 4 },
    capturedAt: new Date().toISOString(),
    dataAsOf,
    patch: null,
    heroes: out.heroes,
    heroStats: out.heroStats,
    matchups: out.matchups,
    items: out.items,
    catalog: [...cat.values()],
  };
  return { pkg, errors };
}
