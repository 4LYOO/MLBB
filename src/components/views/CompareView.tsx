"use client";
import Link from "next/link";
import { Card, HeroAvatar, PageHeader, Provenance, RoleBadge, TierBadge, Unavailable, fmtPct } from "@/components/ui";
import { GroupedBarChart } from "@/components/charts/Charts";
import { heroStatMatrix } from "@/lib/data/model";
import { statsContext } from "@/lib/data/views";
import { useData } from "@/lib/client/data";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DataGate } from "./Loading";
import { profileTraits } from "@/lib/engine/meta";
import { matchup } from "@/lib/engine/draft";
import { DAMAGE_FR, LANE_FR, RANKS, RANK_FR, type Hero } from "@/lib/domain";


const PROFILE: [keyof NonNullable<Hero["profile"]>, string][] = [
  ["cc", "Contrôle"],
  ["mobility", "Mobilité"],
  ["durability", "Résistance"],
  ["engage", "Engage"],
  ["peel", "Protection"],
  ["burst", "Burst"],
  ["sustain", "Sustain"],
  ["early", "Early"],
  ["mid", "Mid"],
  ["late", "Late"],
];

export function CompareView() {
  return (
    <Suspense>
      <DataGate>
        <Inner />
      </DataGate>
    </Suspense>
  );
}

function Inner() {
  const { model } = useData();
  const router = useRouter();
  const sps = useSearchParams();
  const all = model.heroes;
  const raw = [...sps.getAll("h"), ...(sps.get("heroes")?.split(",") ?? [])].filter(Boolean);
  const sel = [...new Set(raw)].map((s) => all.find((h) => h.slug === s)).filter(Boolean).slice(0, 4) as Hero[];
  const ctx = statsContext(model, "all", "7d");
  const series = sel.map((h) => ({ key: h.slug, label: h.name }));
  const matrices = new Map(sel.map((h) => [h.slug, heroStatMatrix(model, h.slug)]));
  const rankRows = RANKS.filter((r) => sel.some((h) => matrices.get(h.slug)!.some((m) => m.rank === r && m.period === "7d"))).map((r) => {
    const row: Record<string, string | number | null> = { x: RANK_FR[r] };
    for (const h of sel) row[h.slug] = matrices.get(h.slug)!.find((m) => m.rank === r && m.period === "7d")?.winRate ?? null;
    return row;
  });
  const profRows = PROFILE.map(([k, l]) => {
    const row: Record<string, string | number | null> = { x: l };
    for (const h of sel) row[h.slug] = h.profile ? (h.profile[k] as number) : null;
    return row;
  });

  return (
    <>
      <PageHeader kicker="Analyse" title="Comparateur de héros" subtitle="Compare jusqu'à 4 héros : statistiques, rôles, difficulté, forces et faiblesses, performances selon le rang et match-up direct." />
      <Card className="mb-4">
        <form
          className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new URLSearchParams();
            new FormData(e.currentTarget).getAll("h").forEach((v) => v && q.append("h", String(v)));
            router.push(`/comparateur?${q.toString()}`, { scroll: false });
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <label key={i} className="sm:min-w-44 sm:flex-1">
              <span className="label">Héros {i + 1}</span>
              <select name="h" defaultValue={sel[i]?.slug ?? ""} className="input">
                <option value="">—</option>
                {all.map((h) => (
                  <option key={h.slug} value={h.slug}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button className="btn-primary col-span-2">Comparer</button>
        </form>
      </Card>

      {sel.length < 2 ? (
        <Unavailable reason="Choisis au moins deux héros." action={false} />
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th></th>
                    {sel.map((h) => (
                      <th key={h.slug}>
                        <Link href={`/heros/${h.slug}`} className="flex items-center gap-2 normal-case text-ink hover:text-gold">
                          <HeroAvatar hero={h} size={32} /> <span className="text-sm">{h.name}</span>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-muted">Rôles</td>
                    {sel.map((h) => (
                      <td key={h.slug}>
                        <div className="flex flex-wrap gap-1">
                          {h.roles.map((r) => (
                            <RoleBadge key={r} role={r} />
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-muted">Lanes</td>
                    {sel.map((h) => (
                      <td key={h.slug} className="text-xs">
                        {h.lanes.map((l) => LANE_FR[l]).join(", ")}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-muted">Dégâts</td>
                    {sel.map((h) => (
                      <td key={h.slug}>{h.damage ? DAMAGE_FR[h.damage] : "—"}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-muted">Difficulté</td>
                    {sel.map((h) => (
                      <td key={h.slug}>{h.difficulty ? `${h.difficulty}/3` : "—"}</td>
                    ))}
                  </tr>
                  {(["winRate", "pickRate", "banRate"] as const).map((k) => {
                    const vals = sel.map((h) => ctx.statMap[h.slug]?.[k] ?? null);
                    const max = Math.max(...vals.filter((v): v is number => v != null));
                    return (
                      <tr key={k}>
                        <td className="text-muted">{{ winRate: "Win rate", pickRate: "Pick rate", banRate: "Ban rate" }[k]} (tous rangs, 7 j)</td>
                        {vals.map((v, i) => (
                          <td key={i} className={v != null && v === max ? "font-semibold text-gold" : ""}>
                            {v != null ? fmtPct(v) : <Unavailable compact />}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="text-muted">Tier calculé</td>
                    {sel.map((h) => (
                      <td key={h.slug}>
                        <TierBadge tier={ctx.tierMap[h.slug]} size="sm" />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-muted">Forces</td>
                    {sel.map((h) => (
                      <td key={h.slug} className="text-xs text-ink-2">
                        {profileTraits(h).strengths.join(" · ") || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-muted">Faiblesses</td>
                    {sel.map((h) => (
                      <td key={h.slug} className="text-xs text-ink-2">
                        {profileTraits(h).weaknesses.join(" · ") || "—"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-2">
              <Provenance source={ctx.source} capturedAt={ctx.snap.capturedAt} rank="all" period="7d" stale={ctx.stale} />
            </div>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Performance selon le rang" subtitle="Win rate, 7 jours">
              {rankRows.length ? <GroupedBarChart data={rankRows} series={series} unit=" %" /> : <Unavailable reason="Aucune statistique par rang importée pour ces héros." />}
            </Card>
            <Card title="Profils de jeu" subtitle="Référentiel éditorial, échelle 0–3">
              <GroupedBarChart data={profRows} series={series} height={260} />
            </Card>
          </div>
          <Card title="Match-up direct" subtitle="Estimé par règles de mécaniques, ou données importées si disponibles">
            <ul className="space-y-2 text-sm">
              {sel.flatMap((a, i) =>
                sel.slice(i + 1).map((b) => {
                  const m = matchup(a, b);
                  const fav = m.value > 0.1 ? a.name : m.value < -0.1 ? b.name : null;
                  return (
                    <li key={a.slug + b.slug}>
                      <b>
                        {a.name} vs {b.name}
                      </b>{" "}
                      : {fav ? `avantage ${fav}` : "équilibré"} <span className="text-muted">({m.value > 0 ? "+" : ""}{m.value.toFixed(2)})</span>
                      {m.reasons.length > 0 && <span className="text-ink-2"> — {m.reasons.map((r) => r.text).join(" ")}</span>}
                    </li>
                  );
                }),
              )}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
