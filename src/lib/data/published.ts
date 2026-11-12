/**
 * Fichiers publiés sur GitHub Pages par le workflow de synchronisation :
 *  - /data/published.json : dernier paquet de chaque source + journal de synchronisation
 *  - /data/history.json   : historique compact des captures (évolution, tendances)
 */
import type { DataPackage } from "./schema";
import type { Period, Rank } from "@/lib/domain";

export interface SyncLogEntry {
  at: string;
  connector: string;
  status: "ok" | "warning" | "error" | "kept-previous";
  message: string;
  counts?: Record<string, number>;
}

export interface PublishedFile {
  format: "mlbb-companion/published-v1";
  generatedAt: string;
  packages: DataPackage[];
  syncLog: SyncLogEntry[];
}

/** Ligne compacte : [héros, rang, période, WR, PR, BR] */
export type CompactRow = [string, Rank, Period, number, number, number];
export interface HistoryCapture {
  capturedAt: string;
  dataAsOf: string | null;
  sourceId: string;
  sourceName: string;
  rows: CompactRow[];
}
export interface HistoryFile {
  format: "mlbb-companion/history-v1";
  captures: HistoryCapture[];
}

/** Rangs et périodes conservés dans l'historique (taille maîtrisée pour mobile). */
export const HISTORY_RANKS: Rank[] = ["all", "mythic", "mythical_glory"];
export const HISTORY_PERIODS: Period[] = ["7d"];
export const HISTORY_MAX_CAPTURES = 90;

export function historyToPackages(h: HistoryFile): unknown[] {
  return (h.captures ?? []).map((c) => ({
    format: "mlbb-companion/v1",
    source: { id: c.sourceId, name: c.sourceName, kind: "statistical", reliability: 4 },
    capturedAt: c.capturedAt,
    dataAsOf: c.dataAsOf,
    heroStats: c.rows.map(([hero, rank, period, winRate, pickRate, banRate]) => ({ hero, rank, period, winRate, pickRate, banRate })),
  }));
}

/** Ajoute la capture d'un paquet à l'historique (dédoublonnée sur la date des données). */
export function appendHistory(h: HistoryFile | null, pkg: DataPackage): HistoryFile {
  const captures = [...(h?.captures ?? [])];
  const key = pkg.dataAsOf ?? pkg.capturedAt;
  if (!captures.some((c) => c.sourceId === pkg.source.id && (c.dataAsOf ?? c.capturedAt) === key)) {
    captures.push({
      capturedAt: pkg.capturedAt,
      dataAsOf: pkg.dataAsOf ?? null,
      sourceId: pkg.source.id,
      sourceName: pkg.source.name,
      rows: (pkg.heroStats ?? []).filter((s) => HISTORY_RANKS.includes(s.rank) && HISTORY_PERIODS.includes(s.period)).map((s) => [s.hero, s.rank, s.period, s.winRate, s.pickRate, s.banRate]),
    });
  }
  captures.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  return { format: "mlbb-companion/history-v1", captures: captures.slice(-HISTORY_MAX_CAPTURES) };
}
