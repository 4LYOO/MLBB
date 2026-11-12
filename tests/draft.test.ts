import { describe, expect, it } from "vitest";
import { editorialHeroes, comboMap } from "@/lib/engine/editorial";
import { analyzeComposition, assignLanes, buildIndex, DRAFT_MODES, expandSteps, matchup, recommend, suggestBans, suggestFirstPicks } from "@/lib/engine/draft";

const heroes = editorialHeroes();
const idx = buildIndex(heroes);
const combos = comboMap();
const H = (s: string) => idx.get(s)!;

describe("matchups par règles", () => {
  it("Khufra (anti-dash) est favorisé contre Fanny", () => {
    expect(matchup(H("khufra"), H("fanny")).value).toBeGreaterThan(0.3);
    expect(matchup(H("fanny"), H("khufra")).value).toBeLessThan(-0.3);
  });
  it("est antisymétrique sans données", () => {
    for (const [a, b] of [["baxia", "estes"], ["karrie", "tigreal"], ["saber", "miya"]]) {
      expect(matchup(H(a), H(b)).value).toBeCloseTo(-matchup(H(b), H(a)).value, 5);
    }
  });
  it("les données importées priment sur les règles", () => {
    const data = [{ slug: "fanny", other: "khufra", kind: "counter" as const, score: 3, unit: "pp", sourceId: "test" }];
    const m = matchup(H("khufra"), H("fanny"), data);
    expect(m.value).toBeCloseTo(-0.75);
    expect(m.reasons[0].source).toBe("data");
  });
});

describe("lanes", () => {
  it("attribue les lanes sans conflit", () => {
    const r = assignLanes([H("tigreal"), H("claude"), H("valentina")]);
    expect(r.assignment).toEqual({ tigreal: "roam", claude: "gold", valentina: "mid" });
    expect(r.missing.sort()).toEqual(["exp", "jungle"]);
  });
});

describe("recommandations – exemple du cahier des charges", () => {
  const ctx = { heroes, allies: ["tigreal", "claude", "valentina"], enemies: ["fanny", "lylia", "karrie"], bans: ["ling", "khufra"] };
  const recs = recommend(ctx, combos, 15);
  it("ne propose ni héros pris ni bannis ni incomplets", () => {
    const forbidden = new Set([...ctx.allies, ...ctx.enemies, ...ctx.bans, "obsidia", "sora", "marcel"]);
    expect(recs.every((r) => !forbidden.has(r.hero.slug))).toBe(true);
  });
  it("propose des héros pour les lanes manquantes (EXP / Jungle)", () => {
    expect(recs.slice(0, 8).every((r) => r.lane === "exp" || r.lane === "jungle")).toBe(true);
  });
  it("est déterministe et trié", () => {
    const again = recommend(ctx, combos, 15);
    expect(again.map((r) => r.hero.slug)).toEqual(recs.map((r) => r.hero.slug));
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
  });
  it("explique chaque recommandation et signale l'absence de statistiques", () => {
    for (const r of recs) {
      expect(r.explanation.length + r.needs.length).toBeGreaterThan(0);
      expect(r.notes.some((n) => n.includes("Statistiques indisponibles"))).toBe(true);
      expect(r.components.stats).toBeNull();
    }
  });
  it("un anti-dash dispo (Minsitthar) est avantagé contre Fanny", () => {
    const m = recs.find((r) => r.hero.slug === "minsitthar");
    expect(m).toBeDefined();
    expect(m!.favorable.some((f) => f.hero.slug === "fanny")).toBe(true);
  });
});

describe("statistiques et difficulté", () => {
  it("les stats influencent le score quand elles existent", () => {
    const base = { heroes, allies: ["tigreal"], enemies: [], bans: [] };
    const mk = (wr: number) => ({ slug: "alpha", rank: "all" as const, period: "7d" as const, winRate: wr, pickRate: 2, banRate: 1, sourceId: "t", capturedAt: "x", dataAsOf: null, patch: null });
    const hi = recommend({ ...base, stats: { alpha: mk(55) } }, combos, 200).find((r) => r.hero.slug === "alpha")!;
    const lo = recommend({ ...base, stats: { alpha: mk(45) } }, combos, 200).find((r) => r.hero.slug === "alpha")!;
    expect(hi.score).toBeGreaterThan(lo.score);
  });
  it("pénalise un héros trop difficile", () => {
    const base = { heroes, allies: [], enemies: [], bans: [] };
    const free = recommend(base, combos, 200).find((r) => r.hero.slug === "fanny")!;
    const capped = recommend({ ...base, maxDifficulty: 1 }, combos, 200).find((r) => r.hero.slug === "fanny")!;
    expect(capped.score).toBeLessThan(free.score);
  });
});

describe("analyse de composition", () => {
  it("détecte une composition fragile sans frontline", () => {
    const a = analyzeComposition(["miya", "eudora", "fanny", "layla"], [], heroes, combos);
    expect(a.fragile).toBe(true);
    expect(a.weaknesses.join(" ")).toMatch(/frontline|fragile/i);
  });
  it("identifie les menaces adverses", () => {
    const a = analyzeComposition(["tigreal", "claude", "valentina"], ["fanny", "lylia", "karrie"], heroes, combos);
    expect(a.indicators.find((i) => i.key === "engage")!.value).toBe(100);
    expect(a.missingLanes.sort()).toEqual(["exp", "jungle"]);
  });
  it("suggère des bans et des premiers picks", () => {
    expect(suggestBans({ heroes, allies: ["miya"], enemies: [], bans: [] }).length).toBeGreaterThan(0);
    expect(suggestFirstPicks({ heroes, allies: [], enemies: [], bans: [] }).length).toBe(6);
  });
});

describe("modes de draft", () => {
  it("chaque mode guidé contient 10 picks et le bon nombre de bans", () => {
    for (const m of DRAFT_MODES.filter((m) => m.sequence)) {
      const steps = expandSteps(m, "blue");
      expect(steps.filter((s) => s.action === "pick").length).toBe(10);
      expect(steps.filter((s) => s.action === "ban").length).toBe(m.bansPerTeam * 2);
      expect(steps.filter((s) => s.action === "pick" && s.team === "ally").length).toBe(5);
    }
  });
  it("inverse l'ordre côté rouge", () => {
    const m = DRAFT_MODES.find((x) => x.id === "ranked-10")!;
    const firstPickBlue = expandSteps(m, "blue").find((s) => s.action === "pick")!;
    const firstPickRed = expandSteps(m, "red").find((s) => s.action === "pick")!;
    expect(firstPickBlue.team).toBe("ally");
    expect(firstPickRed.team).toBe("enemy");
  });
});
