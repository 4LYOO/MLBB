import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, HeroAvatar, Notice, PageHeader, Provenance, TierBadge, Unavailable, fmtPct } from "@/components/ui";
import { RankPeriodFilter } from "@/components/filters/RankPeriodFilter";
import { LinkTabs } from "@/components/filters/LinkTabs";
import { getAvailableStatKeys, getPatches, getProStats } from "@/lib/server/repo";
import { getDb } from "@/lib/server/db";
import { parsePeriod, parseRank, statsContext } from "@/lib/server/views";
import { computeProTiers, computeTiers, TIER_THRESHOLDS } from "@/lib/engine/tier";
import { computeTrends, explainHero, profileTraits } from "@/lib/engine/meta";
import { matchup, synergy } from "@/lib/engine/draft";
import { comboMap } from "@/lib/engine/editorial";
import { LANES, LANE_FR, RANK_FR, ROLES, ROLE_FR, TIERS, type Hero, type HeroStat, type Tier } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Méta & Tier list" };

const VIEWS = [
  { value: "global", label: "Globale" },
  { value: "role", label: "Par rôle" },
  { value: "lane", label: "Par lane" },
  { value: "solo", label: "Solo queue" },
  { value: "pro", label: "Compétitive" },
];

export default async function MetaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rank = parseRank(sp.rank);
  const period = parsePeriod(sp.period);
  const view = VIEWS.some((v) => v.value === sp.view) ? sp.view! : "global";
  const role = ROLES.includes(sp.role as never) ? sp.role! : "Tank";
  const lane = LANES.includes(sp.lane as never) ? sp.lane! : "exp";
  const ctx = statsContext(rank, period);
  const heroBySlug = new Map(ctx.heroes.map((h) => [h.slug, h]));
  const has = ctx.snap.stats.length > 0;

  // --- Tier list affichée
  let entries: { slug: string; tier: Tier; label: string }[] = [];
  let proInfo: string | null = null;
  if (view === "pro") {
    const pro = computeProTiers(getProStats());
    entries = pro.map((p) => ({ slug: p.slug, tier: p.tier, label: `${p.presence.toFixed(0)} % présence · ${p.winRate.toFixed(0)} % WR` }));
    proInfo = pro.length ? `Calcul : présence (picks + bans) et win rate en pick sur ${new Set(getProStats().map((x) => x.tournament)).size} tournoi(s) importé(s).` : null;
  } else {
    entries = ctx.tiers
      .filter((t) => {
        const h = heroBySlug.get(t.slug);
        if (!h) return false;
        if (view === "role") return h.roles.includes(role as never);
        if (view === "lane") return h.lanes.includes(lane as never);
        return true;
      })
      .map((t) => ({ slug: t.slug, tier: t.tier, label: `${fmtPct(t.stat.winRate)} WR` }));
  }

  const trends = computeTrends(ctx.snap.stats, ctx.trend.stats, ctx.trend.label);

  // --- Changements de tier entre patchs
  const patchCaps = getDb()
    .prepare("SELECT patch, MAX(captured_at) AS cap FROM hero_stats WHERE rank = ? AND period = ? AND patch IS NOT NULL GROUP BY patch ORDER BY cap DESC LIMIT 2")
    .all(rank, period) as { patch: string; cap: string }[];
  let tierChanges: { slug: string; from: Tier; to: Tier }[] = [];
  if (patchCaps.length === 2) {
    const load = (cap: string) => (getDb().prepare("SELECT slug, win_rate winRate, pick_rate pickRate, ban_rate banRate FROM hero_stats WHERE rank = ? AND period = ? AND captured_at = ?").all(rank, period, cap) as HeroStat[]);
    const now = new Map(computeTiers(load(patchCaps[0].cap)).map((t) => [t.slug, t.tier]));
    const before = new Map(computeTiers(load(patchCaps[1].cap)).map((t) => [t.slug, t.tier]));
    tierChanges = [...now.entries()].filter(([s, t]) => before.has(s) && before.get(s) !== t).map(([slug, to]) => ({ slug, from: before.get(slug)!, to }));
  }

  // --- Analyse d'un héros
  const focus = sp.hero ? heroBySlug.get(sp.hero) : undefined;
  const combos = comboMap();
  const pool = ctx.heroes.filter((h) => h.profile && !h.incomplete);

  const Avatar = ({ slug, sub }: { slug: string; sub?: string }) => {
    const h = heroBySlug.get(slug);
    if (!h) return null;
    const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    q.set("hero", slug);
    return (
      <Link href={`/meta?${q.toString()}#analyse`} className="group flex w-16 flex-col items-center gap-1 text-center" title={`${h.name}${sub ? ` · ${sub}` : ""}`}>
        <HeroAvatar hero={h} size={48} className="transition group-hover:ring-2 group-hover:ring-gold" />
        <span className="w-full truncate text-[11px] text-ink-2">{h.name}</span>
        {sub && <span className="-mt-1 text-[10px] text-muted">{sub}</span>}
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        kicker="Méta"
        title="Méta & Tier list"
        subtitle="Tier lists recalculées à partir des statistiques importées (win rate ajusté par la confiance + présence en ban). Aucune tier list n'est affichée sans données réelles."
        actions={
          <Suspense>
            <RankPeriodFilter available={getAvailableStatKeys()} page="meta" />
          </Suspense>
        }
      />
      <div className="mb-4 space-y-2">
        <Provenance source={view === "pro" ? null : ctx.source} capturedAt={view === "pro" ? undefined : ctx.snap.capturedAt} rank={view === "pro" ? null : rank} period={view === "pro" ? null : period} patch={ctx.snap.patch} stale={ctx.stale} note="Tier : analyse calculée" />
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Suspense>
            <LinkTabs param="view" options={VIEWS} defaultValue="global" />
          </Suspense>
          {view === "role" && (
            <Suspense>
              <LinkTabs param="role" options={ROLES.map((r) => ({ value: r, label: ROLE_FR[r] }))} defaultValue="Tank" />
            </Suspense>
          )}
          {view === "lane" && (
            <Suspense>
              <LinkTabs param="lane" options={LANES.map((l) => ({ value: l, label: LANE_FR[l] }))} defaultValue="exp" />
            </Suspense>
          )}
        </div>
        {view === "solo" && (
          <div className="mb-3">
            <Notice>Aucune source identifiée ne sépare solo queue, duo, trio et 5-stack : cette vue utilise les statistiques ranked (majoritairement solo queue) du rang choisi.</Notice>
          </div>
        )}
        {view === "lane" && (
          <div className="mb-3">
            <Notice>Les statistiques ranked ne sont pas séparées par lane : un héros flex affiche les mêmes chiffres dans chaque lane.</Notice>
          </div>
        )}
        {entries.length ? (
          <div className="space-y-2">
            {TIERS.map((t) => {
              const list = entries.filter((e) => e.tier === t);
              return (
                <div key={t} className="flex gap-3 rounded-xl border border-line bg-surface-2/40 p-2">
                  <div className="grid w-14 shrink-0 place-items-center">
                    <TierBadge tier={t} size="lg" />
                  </div>
                  <div className="flex flex-wrap gap-2">{list.length ? list.map((e) => <Avatar key={e.slug} slug={e.slug} sub={e.label} />) : <span className="self-center text-xs text-muted">—</span>}</div>
                </div>
              );
            })}
            <p className="text-xs text-muted">
              {proInfo ??
                `Seuils (écart au score moyen) : ${TIER_THRESHOLDS.filter((x) => Number.isFinite(x.min))
                  .map((x) => `${x.tier} ≥ ${x.min > 0 ? "+" : ""}${x.min}`)
                  .join(" · ")} · C sinon. Tiers calculés sur l'ensemble des héros puis filtrés. Méthode : docs/METHODOLOGIE.md.`}
            </p>
          </div>
        ) : (
          <Unavailable
            reason={
              view === "pro"
                ? "Aucune statistique e-sport importée (picks/bans/WR par tournoi). Source recommandée : Liquipedia (CC BY-SA)."
                : `Aucune statistique pour ${RANK_FR[rank]}. La tier list ne peut pas être calculée sans données réelles.`
            }
          />
        )}
      </Card>

      <h2 className="h-display mb-3 text-2xl">Tendances</h2>
      {has ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TrendCard title="Héros en hausse" items={trends.rising.map((r) => ({ slug: r.slug, txt: `+${r.delta.toFixed(2)} pt` }))} heroBySlug={heroBySlug} empty={trends.method} />
          <TrendCard title="Héros en baisse" items={trends.falling.map((r) => ({ slug: r.slug, txt: `${r.delta.toFixed(2)} pt` }))} heroBySlug={heroBySlug} empty={trends.method} />
          <TrendCard title="Sous-estimés" sub="WR ajusté élevé, pick rate sous la médiane" items={trends.underrated.map((t) => ({ slug: t.slug, txt: `${fmtPct(t.stat.winRate)} · pick ${fmtPct(t.stat.pickRate)}` }))} heroBySlug={heroBySlug} />
          <TrendCard title="Surévalués" sub="Très joués mais WR < 49 %" items={trends.overrated.map((t) => ({ slug: t.slug, txt: `${fmtPct(t.stat.winRate)} · pick ${fmtPct(t.stat.pickRate)}` }))} heroBySlug={heroBySlug} />
          <TrendCard title="À bannir en priorité" sub="Ban rate et WR ajusté" items={trends.banPriority.map((t) => ({ slug: t.slug, txt: `ban ${fmtPct(t.stat.banRate, 1)} · ${fmtPct(t.stat.winRate)}` }))} heroBySlug={heroBySlug} />
          <TrendCard title="Pourraient devenir méta" sub="En hausse, WR ≥ 51 %, tier A/B" items={trends.potential.map((t) => ({ slug: t.slug, txt: `+${t.delta.toFixed(2)} pt · ${t.entry.tier}` }))} heroBySlug={heroBySlug} empty={trends.method} />
        </div>
      ) : (
        <div className="mb-6">
          <Unavailable reason="Les tendances nécessitent des statistiques importées (idéalement plusieurs périodes ou plusieurs captures)." />
        </div>
      )}
      {ctx.trend.label && <p className="-mt-4 mb-6 text-xs text-muted">{trends.method}</p>}

      <Card title="Changements de tier après la dernière mise à jour" className="mb-6" subtitle={patchCaps.length === 2 ? `Patch ${patchCaps[1].patch} → ${patchCaps[0].patch}` : undefined}>
        {patchCaps.length < 2 ? (
          <Unavailable reason="Nécessite des captures de statistiques rattachées à au moins deux patchs différents." />
        ) : tierChanges.length ? (
          <ul className="flex flex-wrap gap-3">
            {tierChanges.map((c) => (
              <li key={c.slug} className="chip gap-2 py-1">
                {heroBySlug.get(c.slug)?.name} <TierBadge tier={c.from} size="sm" /> → <TierBadge tier={c.to} size="sm" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucun changement de tier.</p>
        )}
      </Card>

      <div id="analyse" className="scroll-mt-20">
        <Card title="Analyse d'un héros dans la méta" subtitle="Clique un héros dans la tier list, ou choisis-le ci-dessous.">
          <form className="mb-4 flex flex-wrap gap-2" action="/meta#analyse">
            {Object.entries(sp)
              .filter(([k, v]) => k !== "hero" && v)
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <select name="hero" defaultValue={focus?.slug ?? ""} className="input max-w-xs">
              <option value="">Choisir un héros…</option>
              {ctx.heroes.map((h) => (
                <option key={h.slug} value={h.slug}>
                  {h.name}
                </option>
              ))}
            </select>
            <button className="btn-primary">Analyser</button>
          </form>
          {focus ? <HeroMetaAnalysis hero={focus} ctx={ctx} pool={pool} combos={combos} /> : <p className="text-sm text-muted">Aucun héros sélectionné.</p>}
        </Card>
      </div>
    </>
  );
}

function TrendCard({ title, sub, items, heroBySlug, empty }: { title: string; sub?: string; items: { slug: string; txt: string }[]; heroBySlug: Map<string, Hero>; empty?: string }) {
  return (
    <Card title={title} subtitle={sub}>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((i) => {
            const h = heroBySlug.get(i.slug);
            return h ? (
              <li key={i.slug} className="flex items-center gap-2">
                <HeroAvatar hero={h} size={28} />
                <Link href={`/heros/${h.slug}`} className="text-sm hover:text-gold">
                  {h.name}
                </Link>
                <span className="ml-auto text-xs tabular-nums text-ink-2">{i.txt}</span>
              </li>
            ) : null;
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{empty ?? "Aucun héros ne remplit ce critère."}</p>
      )}
    </Card>
  );
}

function HeroMetaAnalysis({ hero, ctx, pool, combos }: { hero: Hero; ctx: ReturnType<typeof statsContext>; pool: Hero[]; combos: Map<string, string> }) {
  const stat = ctx.statMap[hero.slug] ?? null;
  const tier = ctx.tierMap[hero.slug] ?? null;
  const why = explainHero(hero, stat, ctx.snap.stats, tier);
  const traits = profileTraits(hero);
  const mus = hero.profile ? pool.filter((o) => o.slug !== hero.slug).map((o) => ({ o, m: matchup(hero, o) })) : [];
  const best = mus.filter((x) => x.m.value > 0.25).sort((a, b) => b.m.value - a.m.value).slice(0, 6);
  const counters = mus.filter((x) => x.m.value < -0.25).sort((a, b) => a.m.value - b.m.value).slice(0, 6);
  const syn = hero.profile ? pool.filter((o) => o.slug !== hero.slug).map((o) => ({ o, s: synergy(hero, o, combos) })).filter((x) => x.s.value > 0.3).sort((a, b) => b.s.value - a.s.value).slice(0, 6) : [];
  const changes = getPatches().flatMap((p) => p.changes.filter((c) => c.target.toLowerCase() === hero.slug || c.target.toLowerCase() === hero.name.toLowerCase()).map((c) => ({ ...c, date: p.date })));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <HeroAvatar hero={hero} size={56} />
          <div>
            <Link href={`/heros/${hero.slug}`} className="h-display text-2xl hover:text-gold">
              {hero.name}
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <TierBadge tier={tier} />
              <span className="text-xs text-muted">{stat ? `${fmtPct(stat.winRate)} WR · ${fmtPct(stat.pickRate)} pick · ${fmtPct(stat.banRate)} ban` : "Statistiques indisponibles"}</span>
            </div>
          </div>
        </div>
        <div>
          <p className="label">Pourquoi il est fort ou faible</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            {why.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Forces</p>
            <ul className="list-disc pl-5 text-sm text-ink-2">{traits.strengths.length ? traits.strengths.map((s) => <li key={s}>{s}</li>) : <li className="text-muted">Profil non renseigné</li>}</ul>
          </div>
          <div>
            <p className="label">Faiblesses</p>
            <ul className="list-disc pl-5 text-sm text-ink-2">{traits.weaknesses.length ? traits.weaknesses.map((s) => <li key={s}>{s}</li>) : <li className="text-muted">—</li>}</ul>
          </div>
        </div>
        <div>
          <p className="label">Changements récents</p>
          {changes.length ? (
            <ul className="space-y-1 text-sm text-ink-2">
              {changes.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <span className="chip mr-2">{c.version}</span>
                  {c.change} — {c.text}
                </li>
              ))}
            </ul>
          ) : (
            <Unavailable compact reason="Aucune note de patch importée pour ce héros." />
          )}
        </div>
      </div>
      <div className="space-y-4">
        <MiniList title="Meilleurs match-ups (règles de mécaniques)" items={best.map((x) => ({ h: x.o, txt: x.m.reasons.find((r) => r.value > 0)?.text ?? "" }))} />
        <MiniList title="Ses counters" items={counters.map((x) => ({ h: x.o, txt: x.m.reasons.find((r) => r.value < 0)?.text ?? "" }))} />
        <MiniList title="Synergies" items={syn.map((x) => ({ h: x.o, txt: x.s.reasons.find((r) => r.value > 0)?.text ?? "" }))} />
        <p className="text-[11px] italic text-muted">Match-ups et synergies estimés à partir des profils éditoriaux ; ils seront remplacés par des données réelles de matchup dès leur import.</p>
      </div>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: { h: Hero; txt: string }[] }) {
  return (
    <div>
      <p className="label">{title}</p>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.h.slug} className="flex items-start gap-2 text-sm">
              <HeroAvatar hero={i.h} size={24} />
              <span className="text-ink-2">
                <Link href={`/heros/${i.h.slug}`} className="font-medium text-ink hover:text-gold">
                  {i.h.name}
                </Link>{" "}
                — {i.txt}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucun identifié.</p>
      )}
    </div>
  );
}
