"use client";
import { useState } from "react";
import { personal } from "@/lib/client/store";
import { parseChangeLines } from "@/lib/engine/patch";

export function PatchForm() {
  const [v, setV] = useState({ version: "", date: "", server: "official", title: "", url: "", lines: "" });
  const [msg, setMsg] = useState("");
  const changes = parseChangeLines(v.lines);
  const submit = () => {
    if (v.url && !/^https?:\/\//.test(v.url)) return setMsg("Le lien doit commencer par https://");
    personal.savePatch({ version: v.version.slice(0, 30), date: v.date || null, server: v.server, title: v.title || null, url: v.url || null, changes: changes.slice(0, 300) });
    setMsg("Patch enregistré sur cet appareil.");
    setV({ version: "", date: "", server: "official", title: "", url: "", lines: "" });
  };
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-4">
        <input className="input" placeholder="Version (ex. 2.2.16a)" value={v.version} onChange={(e) => setV({ ...v, version: e.target.value })} />
        <input className="input" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} aria-label="Date" />
        <select className="input" value={v.server} onChange={(e) => setV({ ...v, server: e.target.value })} aria-label="Serveur">
          <option value="official">Serveur officiel</option>
          <option value="advanced">Serveur avancé</option>
        </select>
        <input className="input" placeholder="Lien source (URL)" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} />
      </div>
      <input className="input" placeholder="Titre" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      <textarea
        className="input min-h-32 font-mono text-xs"
        placeholder={"Une ligne par changement : type | cible | changement | texte\nhero | Fanny | nerf | Dégâts du câble réduits\nitem | sea-halberd | buff | Attaque physique augmentée\nemblem | Lethal Ignition | adjust | …\nsystem | Tortue | adjust | Apparition décalée"}
        value={v.lines}
        onChange={(e) => setV({ ...v, lines: e.target.value })}
      />
      <p className="text-xs text-muted">
        Types : hero, item, emblem, spell, system · Changements : buff, nerf, adjust, new, revamp, other · {changes.length} changement(s) détecté(s).
      </p>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={!v.version || !changes.length} onClick={submit}>
          Enregistrer le patch
        </button>
        {msg && <span className="text-sm text-ink-2">{msg}</span>}
      </div>
    </div>
  );
}

export function DeletePatch({ version }: { version: string }) {
  return (
    <button
      className="text-xs text-muted hover:text-bad"
      onClick={() => {
        if (confirm(`Supprimer le patch ${version} ?`)) personal.deletePatch(version);
      }}
    >
      Supprimer
    </button>
  );
}
