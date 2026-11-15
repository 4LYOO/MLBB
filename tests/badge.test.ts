import { describe, expect, it } from "vitest";
import { dataAgeDays } from "@/components/layout/PatchBadge";

describe("badge du patch", () => {
  it("calcule l'âge des données en jours", () => {
    expect(dataAgeDays("2026-11-08", new Date("2026-11-15T12:00:00").getTime())).toBe(7);
    expect(dataAgeDays("2026-10-01", new Date("2026-11-15T12:00:00").getTime())).toBeGreaterThan(21);
  });
});
