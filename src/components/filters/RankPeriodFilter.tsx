"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, X } from "lucide-react";
import { PERIODS, PERIOD_FR, RANKS, RANK_FR } from "@/lib/domain";

interface Saved {
  id: number;
  name: string;
  params: Record<string, string>;
}

/** Filtres rang / période synchronisés avec l'URL + préréglages sauvegardés. */
export function RankPeriodFilter({ available, page }: { available: { rank: string; period: string }[]; page: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const rank = sp.get("rank") ?? "all";
  const period = sp.get("period") ?? "7d";
  const [saved, setSaved] = useState<Saved[]>([]);
  const has = (r: string, p: string) => available.some((a) => a.rank === r && a.period === p);

  useEffect(() => {
    fetch(`/api/filters?page=${page}`).then((r) => r.json()).then(setSaved).catch(() => {});
  }, [page]);

  const set = (k: string, v: string) => {
    const q = new URLSearchParams(sp.toString());
    q.set(k, v);
    router.push(`${path}?${q.toString()}`);
  };
  const save = async () => {
    const name = prompt("Nom du filtre :", `${RANK_FR[rank as keyof typeof RANK_FR] ?? rank} · ${PERIOD_FR[period as keyof typeof PERIOD_FR] ?? period}`);
    if (!name) return;
    await fetch("/api/filters", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page, name, params: Object.fromEntries(sp.entries()) }) });
    setSaved(await (await fetch(`/api/filters?page=${page}`)).json());
  };
  const remove = async (id: number) => {
    await fetch(`/api/filters?id=${id}`, { method: "DELETE" });
    setSaved((s) => s.filter((x) => x.id !== id));
  };

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:flex sm:flex-wrap">
      <label className="sm:min-w-40">
        <span className="label">Rang</span>
        <select className="input" value={rank} onChange={(e) => set("rank", e.target.value)}>
          {RANKS.map((r) => (
            <option key={r} value={r}>
              {RANK_FR[r]}
              {available.some((a) => a.rank === r) ? "" : " (indisponible)"}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:min-w-32">
        <span className="label">Période</span>
        <select className="input" value={period} onChange={(e) => set("period", e.target.value)}>
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_FR[p]}
              {has(rank, p) ? "" : " (indisponible)"}
            </option>
          ))}
        </select>
      </label>
      <button className="btn-ghost" onClick={save} title="Sauvegarder ce filtre">
        <Bookmark size={16} /> <span className="hidden sm:inline">Sauver</span>
      </button>
      {saved.length > 0 && (
        <div className="col-span-3 flex flex-wrap gap-1.5">
          {saved.map((s) => (
            <span key={s.id} className="chip">
              <button onClick={() => router.push(`${path}?${new URLSearchParams(s.params).toString()}`)} className="hover:text-ink">
                {s.name}
              </button>
              <button onClick={() => remove(s.id)} aria-label={`Supprimer ${s.name}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
