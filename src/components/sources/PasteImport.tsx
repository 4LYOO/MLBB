"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Check } from "lucide-react";
import { parsePastedStats, type Col } from "@/lib/engine/paste";
import { PERIODS, PERIOD_FR, RANKS, RANK_FR } from "@/lib/domain";

const SOURCES = [
  { id: "mlbbhub-manual", name: "MLBBHub (copie manuelle)", url: "https://mlbbhub.com/statistics" },
  { id: "mobilelegends-manual", name: "Site officiel (copie manuelle)", url: "https://www.mobilelegends.com" },
  { id: "other-manual", name: "Autre source (copie manuelle)", url: "" },
];
const ORDERS: { label: string; v: Col[] }[] = [
  { label: "Win · Pick · Ban", v: ["winRate", "pickRate", "banRate"] },
  { label: "Pick · Win · Ban", v: ["pickRate", "winRate", "banRate"] },
  { label: "Win · Ban · Pick", v: ["winRate", "banRate", "pickRate"] },
];
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export function PasteImport({ heroes }: { heroes: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [src, setSrc] = useState(SOURCES[0].id);
  const [customName, setCustomName] = useState("");
  const [url, setUrl] = useState(SOURCES[0].url);
  const [rank, setRank] = useState("all");
  const [period, setPeriod] = useState("7d");
  const [order, setOrder] = useState(0);
  const [capturedAt, setCapturedAt] = useState(localNow());
  const [patch, setPatch] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const parsed = useMemo(() => parsePastedStats(text, heroes, ORDERS[order].v), [text, heroes, order]);
  const source = SOURCES.find((s) => s.id === src)!;

  const pasteFromClipboard = async () => {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      setMsg({ ok: false, text: "Accès au presse-papiers refusé : colle le texte dans le champ (appui long → Coller)." });
    }
  };

  const submit = async () => {
    const pkg = {
      format: "mlbb-companion/v1",
      source: { id: src === "other-manual" && customName ? `manual-${customName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : src, name: src === "other-manual" && customName ? customName : source.name, kind: "manual", url: url || null, reliability: 3 },
      capturedAt: new Date(capturedAt).toISOString(),
      patch: patch || null,
      heroStats: parsed.rows.map((r) => ({ hero: r.hero, rank, period, winRate: r.winRate, pickRate: r.pickRate, banRate: r.banRate })),
    };
    const r = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pkg) });
    const j = await r.json();
    if (j.ok) {
      setMsg({ ok: true, text: `${j.counts.heroStats ?? 0} statistiques importées (${RANK_FR[rank as keyof typeof RANK_FR]}, ${PERIOD_FR[period as keyof typeof PERIOD_FR]}).` });
      setText("");
      router.refresh();
    } else setMsg({ ok: false, text: [].concat(j.errors ?? j.error).join(" · ") });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Pour les sites qui interdisent l&apos;extraction automatique (MLBBHub) : ouvre la page dans Safari, sélectionne le tableau, copie-le, puis colle-le ici. L&apos;appli reconnaît les héros et leurs trois pourcentages ; rien n&apos;est importé sans ta validation.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2">
          <span className="label">Source</span>
          <select
            className="input"
            value={src}
            onChange={(e) => {
              setSrc(e.target.value);
              setUrl(SOURCES.find((s) => s.id === e.target.value)!.url);
            }}
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {src === "other-manual" && <input className="input col-span-2" placeholder="Nom de la source" value={customName} onChange={(e) => setCustomName(e.target.value)} />}
        <input className="input col-span-2" placeholder="Lien de la page copiée" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
        <label>
          <span className="label">Rang affiché</span>
          <select className="input" value={rank} onChange={(e) => setRank(e.target.value)}>
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {RANK_FR[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Période affichée</span>
          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_FR[p]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Date des données</span>
          <input className="input" type="datetime-local" value={capturedAt} onChange={(e) => setCapturedAt(e.target.value)} />
        </label>
        <label>
          <span className="label">Ordre des colonnes</span>
          <select className="input" value={order} onChange={(e) => setOrder(Number(e.target.value))}>
            {ORDERS.map((o, i) => (
              <option key={o.label} value={i}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <input className="input col-span-2" placeholder="Patch (facultatif, ex. 2.2.16a)" value={patch} onChange={(e) => setPatch(e.target.value)} />
      </div>
      <div className="relative">
        <textarea className="input min-h-36 text-xs" placeholder="Colle ici le tableau copié…" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="button" className="btn-ghost absolute bottom-2 right-2 px-2.5 py-1.5 text-xs" onClick={pasteFromClipboard}>
          <ClipboardPaste size={14} /> Coller
        </button>
      </div>
      {text && (
        <div className="glass-inset rounded-2xl p-3 text-xs">
          <p className="mb-2 font-semibold text-ink">
            {parsed.rows.length} héros reconnu(s){parsed.skipped.length ? ` · ${parsed.skipped.length} ignoré(s)` : ""}
          </p>
          {parsed.rows.length > 0 && (
            <div className="max-h-48 overflow-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Héros</th>
                    <th>WR</th>
                    <th>Pick</th>
                    <th>Ban</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r) => (
                    <tr key={r.hero}>
                      <td>{r.name}</td>
                      <td>{r.winRate} %</td>
                      <td>{r.pickRate} %</td>
                      <td>{r.banRate} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {parsed.skipped.slice(0, 5).map((s) => (
            <p key={s} className="text-muted">
              • {s}
            </p>
          ))}
        </div>
      )}
      <button className="btn-primary w-full" disabled={!parsed.rows.length || !capturedAt} onClick={submit}>
        <Check size={16} /> Importer {parsed.rows.length || ""} statistique(s)
      </button>
      {msg && <p className={msg.ok ? "text-sm text-good" : "text-sm text-bad"}>{msg.text}</p>}
    </div>
  );
}
