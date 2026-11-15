import { describe, expect, it } from "vitest";
import { currentSession, currentStreak, duoPairs, sessionSummary, shouldPause, uniqueGames, type RushMatch } from "@/lib/engine/rush";

let id = 0;
const m = (createdAt: string, result: "win" | "loss", extra: Partial<RushMatch> = {}): RushMatch => ({ id: ++id, playedAt: createdAt.slice(0, 10), createdAt, hero: "khufra", role: "Tank", result, ...extra });

describe("journal de rush", () => {
  const games = [
    m("2026-11-14T20:00:00Z", "win"),
    m("2026-11-15T18:00:00Z", "win"), // nouvelle session (> 4 h d'écart)
    m("2026-11-15T18:30:00Z", "loss"),
    m("2026-11-15T19:00:00Z", "loss", { gameId: "g1", player: "moi" }),
    m("2026-11-15T19:00:00Z", "loss", { gameId: "g1", player: "elle", hero: "angela" }),
  ];
  const now = new Date("2026-11-15T19:30:00Z").getTime();
  it("compte une partie en duo une seule fois", () => {
    expect(uniqueGames(games)).toHaveLength(4);
  });
  it("détecte la session en cours", () => {
    expect(currentSession(games, now)).toHaveLength(3);
    expect(sessionSummary(games, now)).toMatchObject({ games: 3, wins: 1, losses: 2, stars: -1 });
    expect(currentSession(games, now + 10 * 3600_000)).toHaveLength(0);
  });
  it("calcule la série et déclenche l'anti-tilt après 2 défaites", () => {
    expect(currentStreak(games)).toBe(-2);
    expect(shouldPause(games)).toBe(true);
    expect(shouldPause(games.slice(0, 3))).toBe(false);
  });
  it("classe les paires du duo", () => {
    const pairs = duoPairs([
      ...games,
      m("2026-11-15T20:00:00Z", "win", { gameId: "g2", player: "moi" }),
      m("2026-11-15T20:00:00Z", "win", { gameId: "g2", player: "elle", hero: "angela" }),
      m("2026-11-15T21:00:00Z", "win", { gameId: "g3", player: "moi", hero: "tigreal" }),
      m("2026-11-15T21:00:00Z", "win", { gameId: "g3", player: "elle", hero: "pharsa" }),
    ]);
    expect(pairs.find((p) => p.moi === "khufra" && p.elle === "angela")).toMatchObject({ games: 2, wins: 1, winRate: 50 });
    expect(pairs[0]).toMatchObject({ moi: "tigreal", elle: "pharsa", games: 1, wins: 1 });
  });
});

import { starsEstimate } from "@/lib/engine/rush";
describe("étoiles estimées", () => {
  it("ajoute les parties enregistrées après la saisie du total", () => {
    const base = { valeur: 100, at: "2026-11-15T10:00:00Z" };
    const ms = [
      { id: 1, playedAt: "2026-11-15", createdAt: "2026-11-15T09:00:00Z", hero: "a", role: null, result: "win" as const },
      { id: 2, playedAt: "2026-11-15", createdAt: "2026-11-15T11:00:00Z", hero: "a", role: null, result: "win" as const },
      { id: 3, playedAt: "2026-11-15", createdAt: "2026-11-15T12:00:00Z", hero: "a", role: null, result: "win" as const },
      { id: 4, playedAt: "2026-11-15", createdAt: "2026-11-15T13:00:00Z", hero: "a", role: null, result: "loss" as const },
    ];
    expect(starsEstimate(ms, base)).toEqual({ total: 101, delta: 1, games: 3 });
    expect(starsEstimate(ms, null)).toBeNull();
  });
});

import { tagInsights, tagStats } from "@/lib/engine/rush";
describe("annotations", () => {
  const ms = [
    { id: 1, playedAt: "2026-11-15", hero: "a", role: null, result: "loss" as const, tags: ["lane-gagnee"] },
    { id: 2, playedAt: "2026-11-15", hero: "a", role: null, result: "loss" as const, tags: ["lane-gagnee", "throw"] },
    { id: 3, playedAt: "2026-11-15", hero: "a", role: null, result: "win" as const, tags: ["lane-gagnee"] },
  ];
  it("compte les parties et le taux de victoire par étiquette", () => {
    const s = tagStats(ms);
    expect(s[0]).toMatchObject({ games: 3, wins: 1 });
    expect(s[0].tag.texte).toBe("Lane gagnée");
  });
  it("tire un enseignement des lanes gagnées mais parties perdues", () => {
    expect(tagInsights(ms).join(" ")).toMatch(/lane gagnée/);
  });
});
