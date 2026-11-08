import { describe, expect, it } from "vitest";
import { cleanSkill, extractHeroPage, ioSlug, mapHeroPage, mapItems, ourSlug } from "@/lib/server/mlbbio";

const page = {
  heroName: "Alpha",
  initialHero: {
    hero_name: "Alpha",
    role: ["Fighter"],
    lane: ["Jungle", "Exp Lane"],
    speciality: ["Charge", "Damage"],
    img_src: "https://akmweb.youngjoygame.com/x.png",
    damageType: "Physical",
    basicAttackType: "Melee",
    ratings: { durability: 6, offense: 4, controlEffects: 7, difficulty: 1 },
    statistics: [
      { rank_name: "ALL", timeframe_id: 3, win_rate: 48.7, pick_rate: 1.3, ban_rate: 0.6 },
      { rank_name: "Mythical Glory+", timeframe_id: 5, win_rate: 50.1, pick_rate: 2, ban_rate: 1 },
      { rank_name: "Inconnu", timeframe_id: 3, win_rate: 1, pick_rate: 1, ban_rate: 1 },
    ],
    counters: [{ hero_name: "Benedetta", weighted_score: 6.9 }],
    weakAgainst: [{ hero_name: "Phoveus", weighted_score: 8.2 }],
    synergies: [{ hero_name: "X.Borg", weighted_score: 3.1 }],
    skills: [{ skill_key: "skill_1", name: "Rotary Impact", type: "AOE | Damage | Slow", description: "Rotary ImpactAOE SlowAlpha unleashes an energy wave.Skill terms\nblah" }],
    baseStats: { HP: 2468, Mana: 500 },
    statisticsUpdatedAt: "2026-11-08T03:04:05.000Z",
  },
  emblemConsensus: { main: { name: "Fighter", count: 20, sampleSize: 22 } },
  abilityEmblems: [{ name: "Thrill", section: 1, benefits: "+16 Adaptive Attack" }],
};

describe("connecteur mlbb.io", () => {
  it("convertit les slugs", () => {
    expect(ioSlug("X.Borg")).toBe("xborg");
    expect(ioSlug("Chang'e")).toBe("change");
    expect(ioSlug("Popol and Kupa")).toBe("popol-and-kupa");
    expect(ourSlug("X.Borg")).toBe("x-borg");
    expect(ourSlug("Chang'e")).toBe("change");
  });
  it("extrait les données embarquées d'une page", () => {
    const html = `<script>self.__next_f.push([1,${JSON.stringify("1:" + JSON.stringify(page))}])</script>`;
    expect(extractHeroPage(html).initialHero.hero_name).toBe("Alpha");
  });
  it("mappe stats, matchups, compétences et catalogue", () => {
    const out = { heroes: [], heroStats: [], matchups: [], items: [], catalog: [] } as any;
    mapHeroPage(page, out, ourSlug);
    expect(out.heroStats).toEqual([
      { hero: "alpha", rank: "all", period: "7d", winRate: 48.7, pickRate: 1.3, banRate: 0.6 },
      { hero: "alpha", rank: "mythical_glory", period: "30d", winRate: 50.1, pickRate: 2, banRate: 1 },
    ]);
    expect(out.matchups).toContainEqual(expect.objectContaining({ hero: "alpha", other: "benedetta", kind: "counter" }));
    expect(out.matchups).toContainEqual(expect.objectContaining({ hero: "phoveus", other: "alpha", kind: "counter" }));
    expect(out.matchups).toContainEqual(expect.objectContaining({ hero: "alpha", other: "x-borg", kind: "synergy" }));
    const h = out.heroes[0];
    expect(h).toMatchObject({ damage: "P", range: "M", lanes: ["jungle", "exp"], roles: ["Fighter"] });
    expect(h.skills[0].description).toBe("Alpha unleashes an energy wave.");
    expect(out.catalog[0]).toMatchObject({ kind: "talent", slug: "thrill" });
  });
  it("nettoie les descriptions de compétences", () => {
    expect(cleanSkill("Invisible ArmorConceal BuffAamon enters", ["Invisible Armor"], "Buff | Conceal")).toBe("Aamon enters");
  });
  it("mappe les objets (prix, stats, passif) et ignore les objets retirés", () => {
    const out = { heroes: [], heroStats: [], matchups: [], items: [], catalog: [] } as any;
    mapItems([{ name: "Antique Cuirass", category: "Defense", hp: 924, physical_defense: 40, price_total: 2170, passive_name: "Deter", passive_description: "…" }, { name: "Old", removed: 1 }], out);
    expect(out.items).toEqual([{ slug: "antique-cuirass", name: "Antique Cuirass", category: "defense", price: 2170, stats: { PV: 924, "Défense physique": 40 }, passive: "Deter — …" }]);
  });
});
