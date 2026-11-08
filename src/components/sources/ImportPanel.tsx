"use client";
import { useRef, useState } from "react";
import { Download, Trash2, Upload, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { csvToPackage } from "@/lib/data/schema";
import { personal, usePersonal } from "@/lib/client/store";

interface Result {
  ok: boolean;
  counts: Record<string, number>;
  errors: string[];
}

/** Import d'un fichier JSON (mlbb-companion/v1) ou CSV : validé puis conservé sur l'appareil. */
export function ImportPanel() {
  const [res, setRes] = useState<Result | null>(null);
  const [csvMeta, setCsvMeta] = useState({ sourceId: "", sourceName: "", url: "", capturedAt: "", patch: "" });
  const [pending, setPending] = useState<File | null>(null);
  const me = usePersonal();

  const send = async (file: File) => {
    setRes(null);
    const text = await file.text();
    let pkg: unknown;
    if (file.name.toLowerCase().endsWith(".csv")) {
      if (!csvMeta.sourceId || !csvMeta.capturedAt) {
        setPending(file);
        setRes({ ok: false, counts: {}, errors: ["CSV : renseigne l'identifiant de la source et la date de capture (traçabilité), puis relance l'import."] });
        return;
      }
      pkg = csvToPackage(text, { sourceId: csvMeta.sourceId, sourceName: csvMeta.sourceName || csvMeta.sourceId, url: csvMeta.url || null, capturedAt: new Date(csvMeta.capturedAt).toISOString(), patch: csvMeta.patch || null });
    } else {
      try {
        pkg = JSON.parse(text);
      } catch {
        setRes({ ok: false, counts: {}, errors: ["JSON invalide."] });
        return;
      }
    }
    setRes(personal.addPackage(pkg, file.name));
    setPending(null);
  };

  return (
    <div className="space-y-3">
      <label className="glass-inset flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-5 text-center">
        <Upload size={24} className="text-primary" />
        <span className="text-sm">
          Fichier <b>.json</b> (format mlbb-companion/v1) ou <b>.csv</b> (statistiques)
        </span>
        <span className="text-xs text-muted">Validé, puis conservé sur cet appareil avec sa source et sa date.</span>
        <input type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
      </label>
      <details className="glass-inset rounded-2xl p-3 text-sm" open={!!pending}>
        <summary className="cursor-pointer text-ink-2">Métadonnées obligatoires pour un CSV</summary>
        <p className="mt-2 text-xs text-muted">Colonnes : hero;rank;period;winRate;pickRate;banRate (rank : all, epic, legend, mythic, mythical_honor, mythical_glory · period : 1d, 3d, 7d, 15d, 30d).</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Identifiant source (ex. ma-source)" value={csvMeta.sourceId} onChange={(e) => setCsvMeta({ ...csvMeta, sourceId: e.target.value })} />
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
        <div className={clsx("rounded-2xl border p-3 text-sm", res.ok ? "border-good/40 bg-good/5" : "border-bad/40 bg-bad/5")}>
          <p className="font-semibold">{res.ok ? "Import réussi" : "Import refusé"}</p>
          {res.ok && <p className="text-ink-2">{Object.entries(res.counts).map(([k, v]) => `${k} : ${v}`).join(" · ") || "Aucune ligne"}</p>}
          {res.errors.slice(0, 10).map((w, i) => (
            <p key={i} className="text-xs text-ink-2">
              • {w}
            </p>
          ))}
        </div>
      )}
      {me.packages.length > 0 && (
        <div>
          <p className="label">Imports conservés sur cet appareil</p>
          <ul className="space-y-1.5 text-sm">
            {me.packages.map((p) => (
              <li key={p.id} className="glass-inset flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="min-w-0 flex-1 truncate">
                  {p.label} <span className="text-xs text-muted">· {new Date(p.addedAt).toLocaleString("fr-FR")}</span>
                </span>
                <button className="text-muted hover:text-bad" onClick={() => confirm("Supprimer cet import ?") && personal.removePackage(p.id)} aria-label={`Supprimer ${p.label}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Sauvegarde / restauration des données personnelles (fichier JSON). */
export function BackupPanel() {
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const me = usePersonal();
  return (
    <div className="space-y-3 text-sm">
      <p className="text-ink-2">
        Tes données personnelles ({me.matches.length} partie(s), {me.drafts.length} draft(s), {me.favorites.length} favori(s), {me.packages.length} import(s)) sont stockées dans Safari sur cet appareil. Exporte une sauvegarde
        régulièrement : effacer les données de Safari les supprime.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => personal.exportBackup()}>
          <Download size={16} /> Exporter
        </button>
        <button className="btn-ghost" onClick={() => ref.current?.click()}>
          <Upload size={16} /> Restaurer
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            if (confirm("Effacer toutes tes données personnelles sur cet appareil ?")) personal.reset();
          }}
        >
          <RotateCcw size={16} /> Tout effacer
        </button>
        <input
          ref={ref}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (!confirm("Remplacer tes données actuelles par cette sauvegarde ?")) return;
            const r = personal.importBackup(await f.text());
            setMsg(r.ok ? "Sauvegarde restaurée." : `Échec : ${r.error}`);
          }}
        />
      </div>
      {msg && <p className="text-xs text-ink-2">{msg}</p>}
    </div>
  );
}
