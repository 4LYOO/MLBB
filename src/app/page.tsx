import Link from "next/link";
import { Suspense } from "react";
import { Card, HeroChip, Notice, PageHeader, Provenance, StatTile, Unavailable, fmtPct } from "@/components/ui";
import { RankPeriodFilter } from "@/components/filters/RankPeriodFilter";
import { StatsTable, type StatRow } from "@/components/stats/StatsTable";
import { HBarChart, LineSeriesChart } from "@/components/charts/Charts";
import { getAvailableStatKeys, getCaptureTimeline, getHeroStatMatrix } from "@/lib/server/repo";
import { parsePeriod, parseRank, statsContext } from "@/lib/server/views";
import { PERIODS, PERIOD_FR, RANK_FR, ROLES, ROLE_FR } from "@/lib/domain";
import { REFERENCE_PATCH, REFERENCE_SEASON } from "@/data/reference/sources";

export const dynamic = "force-dynamic";

export default async function StatsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rank = parseRank(sp.rank);
  const period = parsePeriod(sp.period);
  const ctx = statsContext(rank, period);
  const { heroes, snap, tiers } = ctx;
  const has = snap.stats.length > 0;
  const available = getAvailableStatKeys();
  const name = (slug: string) => heroes.find((h) => h.slug === slug);

  const avg = (k: "winRate" | "pickRate" | "banRate") => (has ? snap.stats.reduce((s, x) => s + x[k], 0) / snap.stats.length : null);
  const top = (k: "winRate" | "pickRate" | "banRate", minPick = 0) =>
    [...snap.stats].filter((s) => s.pickRate >= minPick).sort((a, b) => b[k] - a[k]).slice(0, 5);
  const metaCount = tiers.filter((t) => t.tier === "S+" || t.tier === "S").length;
  const trendMap = new Map((ctx.trend.stats ?? []).map((s) => [s.slug, s.winRate]));

  const rows: StatRow[] = heroes.map((h) => {
    const stat = ctx.statMap[h.slug] ?? null;
    const ref = trendMap.get(h.slug);
    return { hero: h, stat, tier: ctx.tierMap[h.slug] ?? null, trend: stat && ref != null ? stat.winRate - ref : null };
  });

  const roleDist = ROLES.map((r) => ({ label: ROLE_FR[r], value: heroes.filter((h) => h.roles.includes(r)).length }));
  const timeline = getCaptureTimeline(rank, period);
  const mostPicked = top("pickRate").slice(0, 3);
  const windowSeries = mostPicked.length
    ? PERIODS.map((p) => {
        const row: Record<string, string | number | null> = { x: PERIOD_FR[p] };
        for (const s of mostPicked) {
          const m = getHeroStatMatrix(s.slug).find((x) => x.rank === rank && x.period === p);
          row[s.slug] = m ? m.winRate : null;
        }
        return row;
      })
    : [];

  return (
    <>
      <PageHeader
        kicker="Tableau de bord"
        title="Statistiques globales"
        subtitle={
          <>
            Vue d&apos;ensemble des héros de MLBB. Référence du dossier de sources : {REFERENCE_SEASON}, patch {REFERENCE_PATCH} (serveur officiel, 8 nov. 2026).
          </>
        }
        actions={
          <Suspense>
            <RankPeriodFilter available={available} page="stats" />
          </Suspense>
        }
      />
      <div className="mb-4">
        <Provenance source={ctx.source} capturedAt={snap.capturedAt} rank={rank} period={period} patch={snap.patch} stale={ctx.stale} />
      </div>
      {!has && (
        <div className="mb-6">
          <Notice tone="warn">
            Aucune statistique importée pour <b>{RANK_FR[rank]}</b> · <b>{PERIOD_FR[period]}</b>. Les rôles et lanes ci-dessous viennent du référentiel éditorial ; win rate, pick rate,
            ban rate, tiers et tendances s&apos;afficheront dès qu&apos;un paquet de données sera importé depuis la page <Link className="underline" href="/sources">Sources</Link>. Aucune valeur n&apos;est
            inventée.
            {rank === "mythical_immortal" && " Aucune source vérifiée ne publie de statistiques Mythical Immortal."}
          </Notice>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Héros" value={heroes.length} hint={`${heroes.filter((h) => h.incomplete).length} profil(s) incomplet(s)`} />
        <StatTile label="Héros méta (S+/S)" value={has ? metaCount : "—"} hint={has ? "Tier calculé" : "Donnée indisponible"} accent="gold" />
        <StatTile label="Win rate moyen" value={has ? fmtPct(avg("winRate")) : "—"} hint={has ? undefined : "Donnée indisponible"} accent="violet" />
        <StatTile label="Pick rate moyen" value={has ? fmtPct(avg("pickRate")) : "—"} hint={has ? undefined : "Donnée indisponible"} />
        <StatTile label="Ban rate moyen" value={has ? fmtPct(avg("banRate")) : "—"} hint={has ? undefined : "Donnée indisponible"} accent="violet" />
        <StatTile label="Héros avec stats" value={has ? snap.stats.length : 0} hint={has ? `sur ${heroes.length}` : "Aucun import"} accent="gold" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {[
          { title: "Les plus sélectionnés", k: "pickRate" as const, min: 0 },
          { title: "Les plus bannis", k: "banRate" as const, min: 0 },
          { title: "Meilleur win rate", k: "winRate" as const, min: 0.3, sub: "pick rate ≥ 0,3 % (évite les spécialistes)" },
        ].map((b) => (
          <Card key={b.title} title={b.title} subtitle={b.sub}>
            {has ? (
              <ol className="space-y-2">
                {top(b.k, b.min).map((s, i) => {
                  const h = name(s.slug);
                  return (
                    <li key={s.slug} className="flex items-center gap-3">
                      <span className="h-display w-5 text-muted">{i + 1}</span>
                      {h ? <HeroChip hero={h} /> : s.slug}
                      <span className="ml-auto text-sm tabular-nums text-ink">{fmtPct(s[b.k])}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <Unavailable compact />
            )}
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="Répartition des héros par rôle" subtitle="Un héros à deux rôles compte dans chacun · source : référentiel / dernière synchronisation">
          <HBarChart data={roleDist} />
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {roleDist.map((r) => (
              <li key={r.label}>
                {r.label} : <span className="text-ink-2">{r.value}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Win rate selon la fenêtre" subtitle={`3 héros les plus joués · ${RANK_FR[rank]} · même capture, fenêtres de 1 à 30 jours`}>
          {windowSeries.length && windowSeries.some((r) => Object.values(r).filter((v) => typeof v === "number").length > 0) ? (
            <LineSeriesChart data={windowSeries} series={mostPicked.map((s) => ({ key: s.slug, label: name(s.slug)?.name ?? s.slug }))} unit=" %" reference={50} />
          ) : (
            <Unavailable reason="Nécessite des statistiques sur plusieurs périodes pour ce rang." />
          )}
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {(
          [
            ["avg_wr", "Évolution du win rate moyen"],
            ["avg_pr", "Évolution du pick rate moyen"],
            ["avg_br", "Évolution du ban rate moyen"],
          ] as const
        ).map(([k, t]) => (
          <Card key={k} title={t} subtitle="Une valeur par capture importée (évolution de la méta)">
            {timeline.length >= 2 ? (
              <LineSeriesChart data={timeline.map((c) => ({ x: new Date(c.captured_at).toLocaleDateString("fr-FR"), v: c[k] }))} series={[{ key: "v", label: t }]} unit=" %" height={180} />
            ) : (
              <Unavailable reason={timeline.length === 1 ? "Une seule capture : l'évolution apparaîtra après la prochaine synchronisation." : "Aucune capture importée."} action={timeline.length === 0} />
            )}
          </Card>
        ))}
      </div>

      <Card title="Statistiques par héros" subtitle="Clique sur un héros pour sa fiche détaillée · comparaison de plusieurs héros dans le Comparateur" actions={<Link className="btn-ghost" href="/comparateur">Comparer</Link>}>
        <StatsTable rows={rows} hasStats={has} />
        {ctx.trend.label && <p className="mt-2 text-xs text-muted">Tendance = win rate actuel − win rate {ctx.trend.label}.</p>}
      </Card>
    </>
  );
}
