import { describe, expect, it } from "vitest";
import { parsePastedStats } from "@/lib/engine/paste";

const heroes = [{ slug: "sun", name: "Sun" }, { slug: "yu-zhong", name: "Yu Zhong" }, { slug: "aamon", name: "Aamon" }, { slug: "masha", name: "Masha" }];
describe("import par collage", () => {
  it("lit un tableau copié (tabulations)", () => {
    const r = parsePastedStats("Hero\tRole\tWin\tPick\tBan\nAamon\tAssassin\t50.23%\t0.64%\t2.48%\t+0.06\nYu Zhong\tFighter\t51,1 %\t1,2 %\t3 %", heroes);
    expect(r.rows).toEqual([
      { hero: "aamon", name: "Aamon", winRate: 50.23, pickRate: 0.64, banRate: 2.48 },
      { hero: "yu-zhong", name: "Yu Zhong", winRate: 51.1, pickRate: 1.2, banRate: 3 },
    ]);
  });
  it("lit un format une valeur par ligne (copie mobile)", () => {
    const r = parsePastedStats("Masha\nFighter\n61.46%\n0.54%\n41.02%\nSun\nFighter\n53.76%\n1.84%\n32.23%", heroes);
    expect(r.rows.map((x) => x.hero)).toEqual(["masha", "sun"]);
  });
  it("signale les lignes incomplètes au lieu de deviner", () => {
    const r = parsePastedStats("Sun 53%\nAamon 50% 1% 2%", heroes);
    expect(r.rows).toHaveLength(1);
    expect(r.skipped[0]).toMatch(/Sun/);
  });
  it("respecte un ordre de colonnes personnalisé", () => {
    const r = parsePastedStats("Sun 1% 2% 52%", heroes, ["pickRate", "banRate", "winRate"]);
    expect(r.rows[0]).toMatchObject({ winRate: 52, pickRate: 1, banRate: 2 });
  });
});
