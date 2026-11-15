import { describe, expect, it } from "vitest";
import { parseResultText } from "@/lib/engine/ocr";

const heroes = [{ slug: "sun", name: "Sun" }, { slug: "yu-zhong", name: "Yu Zhong" }, { slug: "chang-e", name: "Chang'e" }];
describe("OCR écran de résultat", () => {
  it("extrait résultat, KDA, durée, MVP et héros", () => {
    const g = parseResultText("VICTORY  12:34  Yu Zhong  7 / 2 / 11  MVP", heroes);
    expect(g).toMatchObject({ hero: "yu-zhong", result: "win", kills: 7, deaths: 2, assists: 11, mvp: true });
    expect(g.durationMin).toBeCloseTo(12.6, 1);
  });
  it("ne devine rien quand le texte est vide", () => {
    expect(parseResultText("", heroes)).toMatchObject({ hero: null, result: null, kills: null });
  });
  it("gère la défaite en français", () => {
    expect(parseResultText("Défaite 3/8/4", heroes).result).toBe("loss");
  });
});

import { lineHasPseudo, parseHeroStats, parseRow, parseScoreboard } from "@/lib/engine/ocr";
describe("capture du tableau de fin de partie", () => {
  const text = `VICTOIRE 15 - 8
Durée 14:32
Kaizer 7 2 11 9,512 11.8 MVP
Lunaa 3 1 14 7,204 9.6
Random 1 5 3 5,100 5.2`;
  it("trouve la ligne de chaque pseudo et ses chiffres", () => {
    const g = parseScoreboard(text, { moi: "Kaizer", elle: "Luna" });
    expect(g.result).toBe("win");
    expect(g.durationMin).toBeCloseTo(14.5, 1);
    expect(g.rows.moi).toMatchObject({ kills: 7, deaths: 2, assists: 11, gold: 9512, rating: 11.8, mvp: true });
    expect(g.rows.elle).toMatchObject({ kills: 3, deaths: 1, assists: 14, rating: 9.6, mvp: false });
  });
  it("tolère une petite erreur de lecture du pseudo", () => {
    expect(lineHasPseudo("KaIzer 7 2 11", "Kaizer")).toBe(true);
    expect(lineHasPseudo("Kalzer 7 2 11", "Kaizer")).toBe(true);
    expect(lineHasPseudo("Autre 7 2 11", "Kaizer")).toBe(false);
  });
  it("lit le format 7/2/11", () => {
    expect(parseRow("Kaizer 7/2/11 10.2")).toMatchObject({ kills: 7, deaths: 2, assists: 11, rating: 10.2 });
  });
  it("ne trouve rien sans pseudo", () => {
    expect(parseScoreboard("DEFEAT 10:00", {})).toMatchObject({ result: "loss", rows: {} });
  });
});

describe("capture des statistiques de héros", () => {
  const heroes = [{ slug: "yu-zhong", name: "Yu Zhong" }, { slug: "ling", name: "Ling" }, { slug: "estes", name: "Estes" }];
  it("associe parties et taux de victoire à chaque héros", () => {
    const g = parseHeroStats(`Yu Zhong
Matches 245  Win Rate 56.3%
Ling
Parties 88 Taux de victoire 49,1 %
Estes 12 75%`, heroes);
    expect(g).toEqual([
      { hero: "yu-zhong", matches: 245, winRate: 56.3 },
      { hero: "ling", matches: 88, winRate: 49.1 },
      { hero: "estes", matches: 12, winRate: 75 },
    ]);
  });
});
