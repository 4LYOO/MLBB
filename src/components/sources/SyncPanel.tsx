"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { JobState } from "@/lib/server/jobs";

export function SyncPanel({ lastSync }: { lastSync: string | null }) {
  const router = useRouter();
  const [st, setSt] = useState<JobState | null>(null);
  const poll = async () => setSt(await (await fetch("/api/sync?status=1")).json());
  useEffect(() => {
    poll();
  }, []);
  useEffect(() => {
    if (!st?.running) return;
    const t = setInterval(async () => {
      const s: JobState = await (await fetch("/api/sync?status=1")).json();
      setSt(s);
      if (!s.running) router.refresh();
    }, 1500);
    return () => clearInterval(t);
  }, [st?.running, router]);

  const start = async () => {
    await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ connector: "mlbbio" }) });
    poll();
  };
  const pct = st?.total ? Math.round((st.done / st.total) * 100) : 0;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">
        Statistiques (6 rangs × 5 périodes), compétences, counters, synergies, emblèmes et objets depuis <b>mlbb.io</b>. Durée ≈ 3 min ; tu peux quitter la page, la synchro continue sur le serveur.
      </p>
      <p className="text-xs text-muted">Dernière synchronisation : {lastSync ? new Date(lastSync).toLocaleString("fr-FR") : "jamais"} · automatique toutes les 12 h (AUTO_SYNC_HOURS).</p>
      {st?.running ? (
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink-2">
            <span>{st.label}</span>
            <span className="tabular-nums">
              {st.done}/{st.total} · {pct} %
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <button className="btn-primary w-full sm:w-auto" onClick={start}>
          <RefreshCw size={16} /> Synchroniser maintenant
        </button>
      )}
      {st && !st.running && st.result && (
        <p className="text-xs text-good">
          Terminé : {Object.entries(st.result.counts).map(([k, v]) => `${k} ${v}`).join(" · ")}
          {st.result.fetchErrors.length > 0 && <span className="text-warn"> · {st.result.fetchErrors.length} page(s) en erreur</span>}
        </p>
      )}
      {st?.error && <p className="text-xs text-bad">Erreur : {st.error}</p>}
    </div>
  );
}
