/**
 * BASE DE CONNAISSANCES — guides rédigés pour MLBB Companion (source « editorial »).
 * Principes stratégiques généraux, sans statistiques ni timers chiffrés
 * (les timers d'objectifs changent avec les patchs : se référer aux patch notes).
 */

export interface Guide {
  slug: string;
  title: string;
  category: "Draft" | "Macro" | "Rôle" | "Méthode" | "Builds";
  roles: string[];
  heroes: string[];
  summary: string;
  body: string[]; // paragraphes / puces
  links: { name: string; url: string }[];
}

import data from "@data/guides.json";

/** Guides lus depuis data/guides.json. */
export const GUIDES: Guide[] = data.guides.map((g) => ({
  slug: g.slug,
  title: g.titre,
  category: g.categorie as Guide["category"],
  roles: g.roles,
  heroes: g.heros,
  summary: g.resume,
  body: g.contenu,
  links: g.liens.map((l) => ({ name: l.nom, url: l.url })),
}));
