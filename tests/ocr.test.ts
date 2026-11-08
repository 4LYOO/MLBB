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
