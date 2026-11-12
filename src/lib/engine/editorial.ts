import { EDITORIAL_COMBOS, parseEditorialHeroes } from "@/data/reference/heroes";
import type { Hero, Tag } from "@/lib/domain";
import { COMBO_KEY } from "./draft";

/** Héros du référentiel éditorial au format domaine (utile hors base : tests, client). */
export function editorialHeroes(): Hero[] {
  return parseEditorialHeroes().map((h) => {
    const p = h.profile;
    return {
      slug: h.slug,
      name: h.name,
      roles: h.roles as Hero["roles"],
      lanes: h.lanes as Hero["lanes"],
      damage: h.damage as Hero["damage"],
      range: h.range as Hero["range"],
      difficulty: h.difficulty,
      confidence: h.confidence,
      incomplete: h.incomplete,
      portraitUrl: null,
      profile: p
        ? { cc: p[0], mobility: p[1], durability: p[2], engage: p[3], peel: p[4], burst: p[5], sustain: p[6], early: p[7], mid: p[8], late: p[9], tags: h.tags as Tag[] }
        : null,
      sourceId: "editorial",
      updatedAt: "2026-11-08T00:00:00.000Z",
    };
  });
}

export function comboMap(): Map<string, string> {
  return new Map(EDITORIAL_COMBOS.map((c) => [COMBO_KEY(c.a, c.b), c.why]));
}
