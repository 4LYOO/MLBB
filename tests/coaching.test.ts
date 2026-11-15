import { describe, expect, it } from "vitest";
import { COACHING_META, COACHING_ROLES, META_PAR_ROLE } from "@/data/reference/coaching";
import { editorialHeroes } from "@/lib/engine/editorial";

describe("data/coaching.json", () => {
  it("a un en-tête patch / date / sources", () => {
    expect(COACHING_META.patch).toBeTruthy();
    expect(COACHING_META.dateMaj).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(COACHING_META.sources.length).toBeGreaterThan(0);
  });
  it("couvre les 5 rôles avec toutes les sections", () => {
    expect(COACHING_ROLES.map((r) => r.id)).toEqual(["exp", "jungle", "mid", "roam", "gold"]);
    for (const r of COACHING_ROLES) {
      expect(r.responsabilites).toHaveLength(3);
      for (const k of ["early", "mid", "late", "vision", "rush", "duo"] as const) expect(r.sections[k].length).toBeGreaterThan(0);
      expect(r.sections.erreurs.length).toBeGreaterThanOrEqual(3);
      expect(r.sections.checklist).toHaveLength(5);
      expect(r.sections.builds.situationnels.length).toBeGreaterThan(0);
    }
  });
  it("les héros méta existent dans data/heroes.json", () => {
    const slugs = new Set(editorialHeroes().map((h) => h.slug));
    for (const lane of ["exp", "jungle", "mid", "roam", "gold"] as const) for (const s of META_PAR_ROLE[lane]) expect(slugs.has(s)).toBe(true);
  });
});
