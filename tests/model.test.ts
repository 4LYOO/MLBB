import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { availableStatKeys, buildModel, heroStatMatrix, latestSnapshot, matchupsOf, statHistory, trendReference } from "@/lib/data/model";
import { csvToPackage, validatePackage } from "@/lib/data/schema";

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/test-package.json"), "utf8"));

describe("modèle de données", () => {
  it("part du référentiel sans aucune statistique", () => {
    const m = buildModel({ packages: [] });
    expect(m.heroes.length).toBeGreaterThan(120);
    expect(latestSnapshot(m, "all", "7d").stats).toHaveLength(0);
    expect(m.items.every((i) => i.price === null)).toBe(true);
  });
  it("rejette un paquet invalide avec des erreurs lisibles", () => {
    const v = validatePackage({ format: "mlbb-companion/v1", source: { id: "X Y" } });
    expect(v.ok).toBe(false);
    const m = buildModel({ packages: [{ format: "x" }] });
    expect(m.warnings.length).toBe(1);
  });
  it("fusionne un paquet en conservant la provenance", () => {
    const m = buildModel({ packages: [pkg] });
    const snap = latestSnapshot(m, "all", "7d");
    expect(snap.stats).toHaveLength(3); // le héros inconnu est ignoré
    expect(snap.sourceId).toBe("test-source");
    expect(snap.patch).toBe("0.0.0-test");
    expect(m.heroBySlug.get("nouveau-heros")!.incomplete).toBe(false);
    expect(m.details.get("alpha")!.sourceId).toBe("test-source");
    expect(matchupsOf(m, "khufra")[0].score).toBe(2.4);
    expect(m.patches[0].changes[0].target).toBe("alpha");
    expect(m.sourceById.get("test-source")!.lastSyncAt).toBe("2026-11-01T10:00:00Z");
  });
  it("est idempotent et garde l'historique des captures", () => {
    const later = { ...pkg, capturedAt: "2026-11-05T10:00:00Z", heroStats: pkg.heroStats.map((s: any) => ({ ...s, winRate: s.winRate + 1 })) };
    const m = buildModel({ packages: [later, pkg, pkg] });
    expect(latestSnapshot(m, "all", "7d").capturedAt).toBe("2026-11-05T10:00:00Z");
    expect(statHistory(m, "alpha", "all", "7d")).toHaveLength(2);
    expect(trendReference(m, latestSnapshot(m, "all", "7d")).stats![0].winRate).toBeLessThan(latestSnapshot(m, "all", "7d").stats[0].winRate);
    expect(availableStatKeys(m).find((k) => k.rank === "all")!.captures).toBe(2);
    expect(heroStatMatrix(m, "alpha")[0].capturedAt).toBe("2026-11-05T10:00:00Z");
  });
  it("une donnée importée prime sur le référentiel éditorial", () => {
    const m = buildModel({ packages: [{ ...pkg, heroes: [{ slug: "alpha", name: "Alpha", roles: ["Tank"] }] }] });
    expect(m.heroBySlug.get("alpha")!.roles).toEqual(["Tank"]);
  });
  it("dérive un profil pour un héros sans profil éditorial", () => {
    const m = buildModel({ packages: [{ ...pkg, heroes: [{ slug: "obsidia", name: "Obsidia", roles: ["Marksman"], lanes: ["gold"], ratings: { durability: 3, offense: 9, control: 2, difficulty: 5 } }] }] });
    const h = m.heroBySlug.get("obsidia")!;
    expect(h.incomplete).toBe(false);
    expect(h.confidence).toBe("low");
    expect(h.profile!.burst).toBe(3);
  });
  it("convertit un CSV en paquet traçable", () => {
    const p = csvToPackage("hero;rank;period;winRate;pickRate;banRate\nalpha;epic;30d;50,5%;1,2;3", { sourceId: "csv-src", sourceName: "CSV", capturedAt: "2026-11-03T00:00:00Z" });
    const m = buildModel({ packages: [p] });
    expect(latestSnapshot(m, "epic", "30d").stats[0].winRate).toBe(50.5);
  });
});
