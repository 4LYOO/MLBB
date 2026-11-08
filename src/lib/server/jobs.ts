import { getDb, now } from "./db";
import { importPackage, type ImportResult } from "./importer";
import { fetchMlbbioPackage } from "./mlbbio";

/**
 * Synchronisation en arrière-plan (un seul travail à la fois, en mémoire du serveur).
 * La progression est consultable via GET /api/sync?status=1.
 */
export interface JobState {
  running: boolean;
  connector: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  done: number;
  total: number;
  label: string;
  result: (ImportResult & { fetchErrors: string[] }) | null;
  error: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mlbbJob: JobState | undefined;
}

const idle = (): JobState => ({ running: false, connector: null, startedAt: null, finishedAt: null, done: 0, total: 0, label: "", result: null, error: null });
export const jobState = (): JobState => (globalThis.__mlbbJob ??= idle());

export function startMlbbioSync(opts: { limit?: number } = {}): JobState {
  const st = jobState();
  if (st.running) return st;
  Object.assign(st, idle(), { running: true, connector: "mlbbio", startedAt: now(), label: "Démarrage…" });
  const db = getDb();
  const runId = Number(
    db.prepare("INSERT INTO sync_runs (connector, source_id, started_at, status, records, message) VALUES ('mlbbio', 'mlbbio', ?, 'running', 0, 'En cours')").run(st.startedAt).lastInsertRowid,
  );
  const known = new Map((db.prepare("SELECT slug, name FROM heroes").all() as { slug: string; name: string }[]).map((h) => [h.name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), h.slug]));
  fetchMlbbioPackage(
    known,
    (done, total, label) => Object.assign(st, { done, total, label }),
    opts,
  )
    .then(({ pkg, errors }) => {
      const r = importPackage(pkg, "mlbbio");
      st.result = { ...r, fetchErrors: errors };
      if (!r.ok) st.error = r.errors.join(" | ");
      db.prepare("UPDATE sync_runs SET finished_at = ?, status = ?, records = ?, message = ? WHERE id = ?").run(
        now(),
        "done",
        Object.values(r.counts).reduce((a, b) => a + b, 0),
        `Téléchargement terminé${errors.length ? ` (${errors.length} erreur(s) : ${errors.slice(0, 3).join(" ; ")})` : ""} — voir la ligne d'import ci-dessus.`,
        runId,
      );
    })
    .catch((e) => {
      st.error = e instanceof Error ? e.message : String(e);
      db.prepare("UPDATE sync_runs SET finished_at = ?, status = 'error', message = ? WHERE id = ?").run(now(), st.error, runId);
    })
    .finally(() => Object.assign(st, { running: false, finishedAt: now() }));
  return st;
}

/** Synchronisation automatique si la dernière synchro réussie de mlbb.io est trop ancienne. */
export function maybeAutoSync() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.VITEST) return;
  const hours = process.env.AUTO_SYNC_HOURS === undefined ? 12 : Number(process.env.AUTO_SYNC_HOURS);
  if (!hours || !Number.isFinite(hours) || jobState().running) return;
  const last = getDb().prepare("SELECT MAX(started_at) AS t FROM sync_runs WHERE connector = 'mlbbio' AND status IN ('ok','warning','done','running')").get() as { t: string | null };
  if (last.t && Date.now() - new Date(last.t).getTime() < hours * 3600_000) return;
  startMlbbioSync();
}
