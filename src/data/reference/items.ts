/**
 * CATALOGUE ÉDITORIAL DES ÉQUIPEMENTS — source « editorial ».
 *
 * Ne contient que des informations stables : nom, catégorie et rôle tactique de
 * l'objet (étiquettes). Les PRIX, STATISTIQUES et PASSIFS changent à chaque patch :
 * ils sont volontairement absents (« Donnée indisponible ») tant qu'une source
 * n'a pas été importée.
 */

export type ItemCategory = "attack" | "magic" | "defense" | "movement" | "jungle" | "roam";
export const ITEM_CATEGORY_FR: Record<ItemCategory, string> = {
  attack: "Attaque",
  magic: "Magie",
  defense: "Défense",
  movement: "Mouvement",
  jungle: "Jungle",
  roam: "Roam",
};

export const ITEM_TAGS = {
  physatk: "Attaque physique",
  magpow: "Pouvoir magique",
  crit: "Critique",
  atkspd: "Vitesse d'attaque",
  lifesteal: "Vol de vie",
  spellvamp: "Vampirisme de sort",
  physpen: "Pénétration physique",
  magpen: "Pénétration magique",
  antiheal: "Réduction de soins",
  physdef: "Défense physique",
  magdef: "Défense magique",
  hp: "PV",
  cdr: "Réduction des temps de recharge",
  antiburst: "Anti-burst / survie",
  antiatkspd: "Réduit la vitesse d'attaque adverse",
  antishield: "Contre les boucliers",
  slow: "Ralentissement",
  mana: "Mana / régénération",
  ms: "Vitesse de déplacement",
  antitank: "Anti-tank (% PV)",
} as const;
export type ItemTag = keyof typeof ITEM_TAGS;

export interface EditorialItem {
  slug: string;
  name: string;
  category: ItemCategory;
  tags: ItemTag[];
  use: string; // raison d'utilisation (qualitative)
}

import data from "@data/items.json";

// Les données viennent de data/items.json (modifiable à la main, voir MISE-A-JOUR.md).
/** Nom français et icône de chaque objet (objets éditoriaux + autres objets du jeu), par slug. */
export const ITEM_DISPLAY = new Map<string, { fr: string | null; image: string | null; en: string }>(
  [...data.objets, ...(data.autresObjets ?? [])].map((o) => [o.slug, { fr: o.nomFr ?? null, image: o.image ?? null, en: o.nom }]),
);
const FR_BY_EN = new Map([...ITEM_DISPLAY.values()].filter((d) => d.fr).map((d) => [d.en.toLowerCase(), d.fr!]));
/**
 * Traduit un nom d'objet anglais trouvé dans un texte (ex. « Sea Halberd » → « Hallebarde des mers »).
 * Laisse le texte tel quel s'il n'est pas reconnu (ex. « Sort Purify »).
 */
export const itemFr = (name: string) => FR_BY_EN.get(name.trim().toLowerCase()) ?? name;

export const EDITORIAL_ITEMS: EditorialItem[] = data.objets.map((i) => ({ slug: i.slug, name: i.nom, category: i.categorie as ItemCategory, tags: i.tags as ItemTag[], use: i.usage }));

// --- Sorts de combat (Battle Spells) ---
export interface EditorialSpell {
  slug: string;
  name: string;
  nameFr: string;
  use: string;
  roles: string[];
}
export const EDITORIAL_SPELLS: EditorialSpell[] = data.sorts.map((s) => ({ slug: s.slug, name: s.nom, nameFr: s.nomFr, use: s.usage, roles: s.roles }));

// --- Emblèmes ---
export const EDITORIAL_EMBLEMS: { slug: string; name: string; nameFr: string; roles: string[] }[] = data.emblemes.map((e) => ({ slug: e.slug, name: e.nom, nameFr: e.nomFr, roles: e.roles }));

/** Talents : liste 2023–2025 marquée « à vérifier » (remplacée par la synchro quand elle existe). */
export const EDITORIAL_TALENTS: { tier: 1 | 2 | 3; name: string; use: string; aVerifier: boolean }[] = data.talents.map((t) => ({ tier: t.palier as 1 | 2 | 3, name: t.nom, use: t.usage, aVerifier: t.aVerifier }));

export const ITEMS_META = data.meta;
