/**
 * RÉFÉRENTIEL DES HÉROS — lu depuis data/heroes.json (à modifier à la main, voir MISE-A-JOUR.md).
 *
 * Ce fichier ne contient AUCUNE statistique (win rate, pick rate, ban rate…) : uniquement des
 * caractéristiques de gameplay (rôles, lanes, type de dégâts, profil 0–3) utilisées par le draft.
 * Un héros sans rôle (« roles »: []) est connu mais incomplet : il n'est jamais recommandé.
 */
import data from "@data/heroes.json";

export interface EditorialHeroRow {
  slug: string;
  name: string;
  /** Adresse du portrait (data/heroes.json → image), chargé directement par le téléphone. */
  image: string | null;
  roles: string[];
  lanes: string[];
  damage: string | null;
  range: string | null;
  profile: number[] | null; // cc mob dur eng peel burst sus early mid late
  difficulty: number | null;
  tags: string[];
  confidence: "high" | "medium" | "low";
  incomplete: boolean;
  aVerifier: boolean;
}

/** Ordre des valeurs du profil (clés françaises du JSON). */
const PROFIL = ["cc", "mobilite", "resistance", "engage", "protection", "burst", "sustain", "early", "mid", "late"] as const;

interface HeroJson {
  slug: string;
  nom: string;
  roles: string[];
  lanes: string[];
  degats: string | null;
  portee: string | null;
  difficulte: number | null;
  profil: Record<(typeof PROFIL)[number], number> | null;
  tags: string[];
  confiance: string;
  aVerifier?: boolean;
  image?: string;
}

export function parseEditorialHeroes(): EditorialHeroRow[] {
  return (data.heroes as HeroJson[]).map((h) => ({
    slug: h.slug,
    name: h.nom,
    image: h.image ?? null,
    roles: h.roles,
    lanes: h.lanes,
    damage: h.degats,
    range: h.portee,
    profile: h.profil ? PROFIL.map((k) => h.profil![k] ?? 0) : null,
    difficulty: h.difficulte,
    tags: h.tags ?? [],
    confidence: (["high", "medium", "low"].includes(h.confiance) ? h.confiance : "low") as EditorialHeroRow["confidence"],
    incomplete: !h.roles.length,
    aVerifier: h.aVerifier ?? h.confiance !== "high",
  }));
}

/** Synergies connues (combos d'ultimes), lues depuis data/heroes.json → "combos". */
export const EDITORIAL_COMBOS: { a: string; b: string; why: string }[] = data.combos.map((c) => ({ a: c.a, b: c.b, why: c.pourquoi }));

/** En-tête du fichier : patch, date de mise à jour, sources. */
export const HEROES_META = data.meta;

/** Changements du patch (data/heroes.json → changements), affichés dans « Nouveautés du patch ». */
export interface Changement {
  type: "buff" | "nerf" | "ajustement" | "nouveau" | "objet" | string;
  hero?: string;
  texte: string;
  aVerifier?: boolean;
}
export const CHANGEMENTS = data.changements as unknown as { patch: string; date: string | null; source: string | null; aVerifier: boolean; liste: Changement[] };
