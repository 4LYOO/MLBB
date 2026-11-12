"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { LANES, LANE_FR, ROLES, ROLE_FR, type Hero } from "@/lib/domain";
import { HeroAvatar } from "@/components/ui";

export function HeroPicker({ heroes, taken, onPick, disabled, favorites }: { heroes: Hero[]; taken: Set<string>; onPick: (slug: string) => void; disabled?: boolean; favorites: Set<string> }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [lane, setLane] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return heroes.filter(
      (h) => (!n || h.name.toLowerCase().includes(n)) && (!role || h.roles.includes(role as never)) && (!lane || h.lanes.includes(lane as never)) && (!favOnly || favorites.has(h.slug)),
    );
  }, [heroes, q, role, lane, favOnly, favorites]);
  return (
    <div>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input className="input col-span-2 sm:col-span-1" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un héros" />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rôle">
          <option value="">Rôle</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_FR[r]}
            </option>
          ))}
        </select>
        <select className="input" value={lane} onChange={(e) => setLane(e.target.value)} aria-label="Lane">
          <option value="">Lane</option>
          {LANES.map((l) => (
            <option key={l} value={l}>
              {LANE_FR[l]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-ink-2">
          <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} /> Favoris
        </label>
      </div>
      <div className="grid max-h-[340px] grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5 overflow-y-auto pr-1">
        {list.map((h) => {
          const off = taken.has(h.slug) || disabled;
          return (
            <button
              key={h.slug}
              disabled={off}
              onClick={() => onPick(h.slug)}
              title={`${h.name}${h.incomplete ? " (profil incomplet : jamais recommandé)" : ""}`}
              className={clsx("group flex flex-col items-center gap-1 rounded-lg p-1.5 text-center transition", off ? "opacity-25" : "hover:bg-surface-3")}
            >
              <HeroAvatar hero={h} size={44} className={clsx(!off && "group-hover:ring-2 group-hover:ring-gold")} />
              <span className="w-full truncate text-[10px] text-ink-2">{h.name}</span>
            </button>
          );
        })}
        {!list.length && <p className="col-span-full py-6 text-center text-sm text-muted">Aucun héros.</p>}
      </div>
    </div>
  );
}
