"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Upload } from "lucide-react";
import clsx from "clsx";

interface Result {
  ok: boolean;
  counts: Record<string, number>;
  warnings: string[];
  errors: string[];
}

export function ImportPanel() {
  const router = useRouter();
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [csvMeta, setCsvMeta] = useState({ sourceId: "", sourceName: "", url: "", capturedAt: "", patch: "" });
  const [pending, setPending] = useState<File | null>(null);

  const send = async (file: File) => {
    setBusy(true);
    setRes(null);
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    let url = "/api/import";
    if (isCsv) {
      if (!csvMeta.sourceId || !csvMeta.capturedAt) {
        setPending(file);
        setBusy(false);
        setRes({ ok: false, counts: {}, warnings: [], errors: ["CSV : renseigne l'identifiant de la source et la date de capture (traçabilité), puis relance l'import."] });
        return;
      }
      const q = new URLSearchParams({ ...csvMeta, capturedAt: new Date(csvMeta.capturedAt).toISOString() });
      url += `?${q.toString()}`;
    }
    const r = await fetch(url, { method: "POST", headers: { "content-type": isCsv ? "text/csv" : "application/json" }, body: await file.text() });
    const j = await r.json();
    setRes(j.error ? { ok: false, counts: {}, warnings: [], errors: [].concat(j.error) } : j);
    setBusy(false);
    setPending(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <label className={clsx("flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line p-6 text-center hover:border-primary/60", busy && "opacity-50")}>
        <Upload size={24} className="text-primary" />
        <span className="text-sm">Dépose ou choisis un fichier <b>.json</b> (format mlbb-companion/v1) ou <b>.csv</b> (statistiques)</span>
        <span className="text-xs text-muted">Chaque donnée conserve sa source, sa date et sa période.</span>
        <input type="file" accept=".json,.csv,application/json,text/csv" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
      </label>
      <details className="rounded-xl border border-line p-3 text-sm" open={!!pending}>
        <summary className="cursor-pointer text-ink-2">Métadonnées obligatoires pour un CSV</summary>
        <p className="mt-2 text-xs text-muted">Colonnes : hero;rank;period;winRate;pickRate;banRate (rank : all, epic, legend, mythic, mythical_honor, mythical_glory · period : 1d, 3d, 7d, 15d, 30d).</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Identifiant source (ex. mlbb-officiel)" value={csvMeta.sourceId} onChange={(e) => setCsvMeta({ ...csvMeta, sourceId: e.target.value })} />
          <input className="input" placeholder="Nom de la source" value={csvMeta.sourceName} onChange={(e) => setCsvMeta({ ...csvMeta, sourceName: e.target.value })} />
          <input className="input" placeholder="URL de la source" value={csvMeta.url} onChange={(e) => setCsvMeta({ ...csvMeta, url: e.target.value })} />
          <input className="input" type="datetime-local" value={csvMeta.capturedAt} onChange={(e) => setCsvMeta({ ...csvMeta, capturedAt: e.target.value })} aria-label="Date de capture" />
          <input className="input" placeholder="Patch (ex. 2.2.16a)" value={csvMeta.patch} onChange={(e) => setCsvMeta({ ...csvMeta, patch: e.target.value })} />
          {pending && (
            <button className="btn-primary" onClick={() => send(pending)}>
              Relancer l&apos;import de {pending.name}
            </button>
          )}
        </div>
      </details>
      {res && (
        <div className={clsx("rounded-xl border p-3 text-sm", res.ok ? "border-good/40 bg-good/5" : "border-bad/40 bg-bad/5")}>
          <p className="font-semibold">{res.ok ? "Import réussi" : "Import refusé"}</p>
          {res.ok && <p className="text-ink-2">{Object.entries(res.counts).map(([k, v]) => `${k} : ${v}`).join(" · ") || "Aucune ligne"}</p>}
          {[...res.errors, ...res.warnings].slice(0, 12).map((w, i) => (
            <p key={i} className="text-xs text-ink-2">
              • {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function RunConnector({ id, disabled }: { id: string; disabled: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="btn-ghost px-2 py-1 text-xs"
        disabled={disabled}
        onClick={async () => {
          const r: Result[] = await (await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ connector: id }) })).json();
          setMsg(r.length ? r.map((x) => (x.ok ? "OK" : x.errors[0])).join(" · ") : "Aucun fichier à importer.");
          router.refresh();
        }}
      >
        <Play size={12} /> Lancer
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
