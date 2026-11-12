import { describe, expect, it } from "vitest";
import { computeTiers, heroScore } from "@/lib/engine/tier";
import { adaptBuild } from "@/lib/engine/builds";
import { coach, summarize, winRateSeries } from "@/lib/engine/coach";
import { editorialHeroes } from "@/lib/engine/editorial";
import { buildIndex } from "@/lib/engine/draft";

const idx = buildIndex(editorialHeroes());
const st = (slug: string, winRate: number, pickRate: number, banRate = 0) => ({ slug, rank: "all" as const, period: "7d" as const, winRate, pickRate, banRate, sourceId: "t", capturedAt: "x", dataAsOf: null, patch: null });

describe("tier list", () => {
  it("ramène vers 50 % un héros très peu joué", () => {
    expect(heroScore(st("a", 61, 0.05)).adjWinRate).toBeLessThan(53);
    expect(heroScore(st("a", 61, 3)).adjWinRate).toBeGreaterThan(59);
  });
  it("classe par score et attribue des tiers cohérents", () => {
    const t = computeTiers([st("a", 56, 2), st("b", 50, 2), st("c", 45, 2), st("d", 50, 2), st("e", 50, 2)]);
    expect(t[0].slug).toBe("a");
    expect(t[0].tier).toBe("S+");
    expect(t.at(-1)!.tier).toBe("C");
  });
  it("renvoie une liste vide sans données", () => expect(computeTiers([])).toEqual([]));
});

describe("builds adaptatifs", () => {
  it("ajoute de la réduction de soins contre des soigneurs", () => {
    const r = adaptBuild(idx.get("claude")!, ["estes", "uranus", "alucard"].map((s) => idx.get(s)!), "gold");
    expect(r.adapted).toContain("sea-halberd");
    expect(r.changes.some((c) => c.add === "sea-halberd")).toBe(true);
  });
  it("ajoute de la défense magique contre une équipe magique", () => {
    const r = adaptBuild(idx.get("tigreal")!, ["eudora", "kagura", "aurora", "lylia"].map((s) => idx.get(s)!), "roam");
    expect(r.adapted).toContain("athenas-shield");
  });
  it("propose Châtiment en jungle", () => {
    expect(adaptBuild(idx.get("fanny")!, [], "jungle").spell.slug).toBe("retribution");
  });
});

describe("coach", () => {
  const base = { role: "Tank", durationMin: 15, mvp: false };
  const mk = (i: number, hero: string, result: "win" | "loss", deaths = 2) => ({ ...base, id: i, playedAt: `2026-10-${String(i + 1).padStart(2, "0")}`, hero, result, kills: 3, deaths, assists: 8 });
  it("demande au moins 5 parties", () => {
    expect(coach([mk(0, "tigreal", "win")])[0].title).toMatch(/assez/);
  });
  it("calcule le KDA et les tendances", () => {
    const ms = Array.from({ length: 10 }, (_, i) => mk(i, i < 5 ? "tigreal" : "fanny", i < 5 ? "win" : "loss", i < 5 ? 1 : 9));
    expect(summarize("x", ms).kda).toBeCloseTo((30 + 80) / 50);
    const tips = coach(ms);
    expect(tips.some((t) => t.title.includes("Héros à retravailler"))).toBe(true);
    expect(tips.some((t) => t.title.includes("défaites d'affilée"))).toBe(true);
    expect(winRateSeries(ms).at(-1)!.cumulative).toBe(50);
  });
});

import { impactedHeroes, parseChangeLines } from "@/lib/engine/patch";
describe("patch notes", () => {
  const heroes = editorialHeroes();
  it("détecte les héros impactés directement et via les objets", () => {
    const ch = parseChangeLines("hero | Fanny | nerf | Dégâts réduits\nitem | sea-halberd | buff | Plus d'attaque\nsystem | Tortue | adjust | Khufra mentionné");
    expect(ch).toHaveLength(3);
    const r = impactedHeroes(ch, heroes, [{ slug: "sea-halberd", name: "Sea Halberd" }]);
    expect(r.direct.has("fanny")).toBe(true);
    expect(r.direct.has("khufra")).toBe(true);
    expect(r.indirect.size).toBe(0); // Sea Halberd n'est dans aucun build de base
    const r2 = impactedHeroes(parseChangeLines("item | holy-crystal | nerf | -10"), heroes, [{ slug: "holy-crystal", name: "Holy Crystal" }]);
    expect(r2.indirect.has("aurora")).toBe(true);
  });
});
