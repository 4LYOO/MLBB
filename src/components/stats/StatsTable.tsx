"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp, Minus } from "lucide-react";
import clsx from "clsx";
import { LANES, LANE_FR, ROLES, ROLE_FR, type Hero, type HeroStat, type Tier } from "@/lib/domain";
import { HeroAvatar, RoleBadge, TierBadge, fmtPct } from "@/components/ui";

export interface StatRow {
  hero: Hero;
  stat: HeroStat | null;
  tier: Tier | null;
  trend: number | null;
}

type SortKey = "name" | "winRate" | "pickRate" | "banRate" | "trend" | "tier";
const TIER_ORDER: Record<string, number> = { "S+": 5, S: 4, A: 3, B: 2, C: 1 };

export function StatsTable({ rows, hasStats }: { rows: StatRow[]; hasStats: boolean }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [lane, setLane] = useState("");
  const [minWr, setMinWr] = useState("");
  const [minPr, setMinPr] = useState("");
  const [minBr, setMinBr] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: hasStats ? "winRate" : "name", dir: hasStats ? -1 : 1 });

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const f = rows.filter(
      (r) =>
        (!n || r.hero.name.toLowerCase().includes(n)) &&
        (!role || r.hero.roles.includes(role as never)) &&
        (!lane || r.hero.lanes.includes(lane as never)) &&
        (!minWr || (r.stat && r.stat.winRate >= Number(minWr))) &&
        (!minPr || (r.stat && r.stat.pickRate >= Number(minPr))) &&
        (!minBr || (r.stat && r.stat.banRate >= Number(minBr))),
    );
    const val = (r: StatRow): number | string => {
      switch (sort.key) {
        case "name":
          return r.hero.name;
        case "tier":
          return r.tier ? TIER_ORDER[r.tier] : -1;
        case "trend":
          return r.trend ?? -999;
        default:
          return r.stat ? r.stat[sort.key] : -1;
      }
    };
    return [...f].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number)) * sort.dir;
    });
  }, [rows, q, role, lane, minWr, minPr, minBr, sort]);

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={className}>
      <button
        className="inline-flex items-center gap-1 hover:text-ink"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : k === "name" ? 1 : -1 }))}
      >
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <input className="input col-span-2 sm:col-span-1" placeholder="Rechercher un héros" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rôle">
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_FR[r]}
            </option>
          ))}
        </select>
        <select className="input" value={lane} onChange={(e) => setLane(e.target.value)} aria-label="Lane">
          <option value="">Toutes les lanes</option>
          {LANES.map((l) => (
            <option key={l} value={l}>
              {LANE_FR[l]}
            </option>
          ))}
        </select>
        <input className="input" type="number" step="0.5" placeholder="WR min %" value={minWr} onChange={(e) => setMinWr(e.target.value)} disabled={!hasStats} />
        <input className="input" type="number" step="0.1" placeholder="Pick min %" value={minPr} onChange={(e) => setMinPr(e.target.value)} disabled={!hasStats} />
        <input className="input" type="number" step="1" placeholder="Ban min %" value={minBr} onChange={(e) => setMinBr(e.target.value)} disabled={!hasStats} />
      </div>
      <p className="mb-2 text-xs text-muted">
        {list.length} héros affichés · les rôles et lanes proviennent du référentiel ou de la dernière source importée. Les statistiques ne sont pas séparées par lane dans les sources identifiées.
      </p>
      <div className="max-h-[70vh] overflow-auto rounded-xl border border-line">
        <table className="table-base min-w-[760px]">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              <Th k="name">Héros</Th>
              <th>Rôles</th>
              <th>Lanes</th>
              <Th k="winRate">Win rate</Th>
              <Th k="pickRate">Pick rate</Th>
              <Th k="banRate">Ban rate</Th>
              <Th k="trend">Tendance</Th>
              <Th k="tier">Tier</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.hero.slug}>
                <td>
                  <Link href={`/heros/${r.hero.slug}`} className="flex items-center gap-2.5 font-medium text-ink hover:text-gold">
                    <HeroAvatar hero={r.hero} size={32} />
                    {r.hero.name}
                    {r.hero.incomplete && <span className="chip text-[10px]">profil incomplet</span>}
                  </Link>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">{r.hero.roles.length ? r.hero.roles.map((ro) => <RoleBadge key={ro} role={ro} />) : <span className="text-xs text-muted">—</span>}</div>
                </td>
                <td className="text-xs text-ink-2">{r.hero.lanes.map((l) => LANE_FR[l]).join(", ") || "—"}</td>
                <td className={clsx("tabular-nums", r.stat && (r.stat.winRate >= 52 ? "text-good" : r.stat.winRate < 48 ? "text-bad" : ""))}>{r.stat ? fmtPct(r.stat.winRate) : <span className="text-xs text-muted">—</span>}</td>
                <td className="tabular-nums">{r.stat ? fmtPct(r.stat.pickRate) : <span className="text-xs text-muted">—</span>}</td>
                <td className="tabular-nums">{r.stat ? fmtPct(r.stat.banRate) : <span className="text-xs text-muted">—</span>}</td>
                <td className="tabular-nums">
                  {r.trend == null ? (
                    <span className="text-xs text-muted">—</span>
                  ) : (
                    <span className={clsx("inline-flex items-center gap-1", r.trend > 0.2 ? "text-good" : r.trend < -0.2 ? "text-bad" : "text-muted")}>
                      {r.trend > 0.2 ? <TrendingUp size={14} /> : r.trend < -0.2 ? <TrendingDown size={14} /> : <Minus size={14} />}
                      {r.trend > 0 ? "+" : ""}
                      {r.trend.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </td>
                <td>
                  <TierBadge tier={r.tier} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
