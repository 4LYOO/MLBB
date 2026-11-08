import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

process.env.DATABASE_PATH = ":memory:";
let importer: typeof import("@/lib/server/importer");
let repo: typeof import("@/lib/server/repo");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/test-package.json"), "utf8"));

beforeAll(async () => {
  importer = await import("@/lib/server/importer");
  repo = await import("@/lib/server/repo");
});

describe("importeur", () => {
  it("amorce le référentiel sans aucune statistique", () => {
    expect(repo.getHeroes().length).toBeGreaterThan(120);
    expect(repo.getLatestSnapshot("all", "7d").stats).toHaveLength(0);
  });
  it("rejette un paquet invalide avec des erreurs lisibles", () => {
    const r = importer.importPackage({ format: "mlbb-companion/v1", source: { id: "X Y" } });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it("importe en conservant la provenance et signale les anomalies", () => {
    const r = importer.importPackage(pkg);
    expect(r.ok).toBe(true);
    expect(r.counts.heroStats).toBe(3);
    expect(r.warnings.join(" ")).toMatch(/inconnu/);
    expect(r.warnings.join(" ")).toMatch(/> 100 %/);
    expect(r.warnings.join(" ")).toMatch(/Nouveau héros/);
    const snap = repo.getLatestSnapshot("all", "7d");
    expect(snap.sourceId).toBe("test-source");
    expect(snap.capturedAt).toBe("2026-11-01T10:00:00Z");
    expect(snap.patch).toBe("0.0.0-test");
    expect(repo.getHero("nouveau-heros")!.incomplete).toBe(false);
    expect(repo.getHeroDetails("alpha")!.sourceId).toBe("test-source");
    expect(repo.getMatchups("khufra")[0].score).toBe(2.4);
    expect(repo.getPatches()[0].changes[0].target).toBe("alpha");
    expect(repo.getSources().find((s) => s.id === "test-source")!.lastSyncAt).toBe("2026-11-01T10:00:00Z");
  });
  it("est idempotent", () => {
    importer.importPackage(pkg);
    expect(repo.getLatestSnapshot("all", "7d").stats).toHaveLength(3);
  });
  it("ne remplace pas une donnée importée par le référentiel éditorial", async () => {
    const { seedReference } = await import("@/lib/server/seed");
    const { getDb } = await import("@/lib/server/db");
    importer.importPackage({ ...pkg, heroes: [{ slug: "alpha", name: "Alpha", roles: ["Tank"] }], capturedAt: "2026-11-02T00:00:00Z" });
    seedReference(getDb());
    expect(repo.getHero("alpha")!.roles).toEqual(["Tank"]);
  });
  it("convertit un CSV en paquet traçable", () => {
    const p = importer.csvToPackage("hero;rank;period;winRate;pickRate;banRate\nalpha;epic;30d;50,5%;1,2;3", { sourceId: "csv-src", sourceName: "CSV", capturedAt: "2026-11-03T00:00:00Z" });
    const r = importer.importPackage(p);
    expect(r.ok).toBe(true);
    expect(repo.getLatestSnapshot("epic", "30d").stats[0].winRate).toBe(50.5);
  });
});
