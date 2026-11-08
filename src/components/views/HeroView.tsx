"use client";
import Link from "next/link";
import { Bar, Card, HeroAvatar, Notice, PageHeader, Provenance, RoleBadge, TierBadge, Unavailable, fmtDate, fmtPct } from "@/components/ui";
import { FavoriteButton, TrackRecent } from "@/components/hero/FavoriteButton";
import { ItemRow } from "@/components/hero/ItemRow";
import { LineSeriesChart } from "@/components/charts/Charts";
import { heroStatMatrix, matchupsOf, statHistory } from "@/lib/data/model";
import { statsContext } from "@/lib/data/views";
import { useData } from "@/lib/client/data";
import { DataGate } from "./Loading";
import { profileTraits, explainHero } from "@/lib/engine/meta";
import { matchup, synergy } from "@/lib/engine/draft";
import { comboMap } from "@/lib/engine/editorial";
import { EMBLEM_BY_ARCHETYPE, archetypeOf, ARCHETYPE_FR, editorialVariants } from "@/lib/engine/builds";
import { EDITORIAL_COMBOS } from "@/data/reference/heroes";
import { EDITORIAL_EMBLEMS, EDITORIAL_SPELLS } from "@/data/reference/items";
import { DAMAGE_FR, LANE_FR, PERIODS, PERIOD_FR, RANKS, RANK_FR, RANGE_FR, type Hero, type Lane } from "@/lib/domain";

const PROFILE_LABELS: [keyof NonNullable<Hero["profile"]>, string][] = [
  ["cc", "Contrôle"],
  ["mobility", "Mobilité"],
  ["durability", "Résistance"],
  ["engage", "Engage"],
  ["peel", "Protection"],
  ["burst", "Burst"],
  ["sustain", "Sustain"],
  ["early", "Early game"],
  ["mid", "Mid game"],
  ["late", "Late game"],
];

function gameplayTips(h: Hero): string[] {
  const p = h.profile;
  if (!p) return [];
  const t: string[] = [];
  const r = h.roles[0];
  if (r === "Tank") t.push("Prends la vision devant ton équipe et initie seulement quand tes alliés sont à portée.");
  if (r === "Support") t.push("Reste à portée de ton carry et garde tes compétences de protection pour les plongées adverses.");
  if (r === "Marksman") t.push("Farm en priorité, frappe la cible la plus proche en teamfight, reste derrière la frontline.");
  if (r === "Mage") t.push("Pousse ta vague vite pour pivoter vers la Tortue et les escarmouches.");
  if (r === "Assassin") t.push("Cherche les cibles isolées et fragiles ; évite d'ouvrir un combat de face.");
  if (r === "Fighter") t.push("Gagne ta lane en échanges courts, puis rejoins les objectifs.");
  if (p.tags.includes("dash")) t.push("Garde au moins une mobilité pour te désengager : les anti-dash te punissent fortement.");
  if (p.tags.includes("splitpush")) t.push("Split push quand ton équipe peut tenir à quatre ; rejoins dès qu'un objectif est contesté.");
  if (p.late >= 3 && p.early <= 1) t.push("Joue sûr en début de partie : ton pic de puissance arrive plus tard.");
  if (p.early >= 3 && p.late <= 1) t.push("Accélère : ton avantage se réduit si la partie s'étire.");
  if (p.durability <= 1) t.push("Positionne-toi au bord des combats ; un objet défensif tôt peut sauver ta partie.");
  if (p.tags.includes("aoecc") || p.tags.includes("teamfightult")) t.push("Garde ton ultime pour les regroupements autour des objectifs.");
  return t;
}

export function HeroView({ slug }: { slug: string }) {
  return (
    <DataGate>
      <Inner slug={slug} />
    </DataGate>
  );
}

function Inner({ slug }: { slug: string }) {
  const { model } = useData();
  const hero = model.heroBySlug.get(slug);
  if (!hero) return <p className="text-muted">Héros introuvable.</p>;
  const sources = Object.fromEntries(model.sourceById);
  const details = model.details.get(slug) ?? null;
  const matrix = heroStatMatrix(model, slug);
  const ctx = statsContext(model, "all", "7d");
  const stat = ctx.statMap[slug] ?? null;
  const tier = ctx.tierMap[slug] ?? null;
  const history = statHistory(model, slug, "all", "7d");
  const items = new Map(model.items.map((i) => [i.slug, i]));
  const builds = model.builds.filter((b) => b.hero === slug);
  const traits = profileTraits(hero);
  const all = model.heroes;
  const pool = all.filter((h) => h.profile && !h.incomplete && h.slug !== slug);
  const combos = comboMap();
  const data = matchupsOf(model, slug);
  const dataCounters = data.filter((m) => m.kind === "counter");
  const mu = hero.profile ? pool.map((o) => ({ o, m: matchup(hero, o) })) : [];
  const syn = hero.profile ? pool.map((o) => ({ o, s: synergy(hero, o, combos) })).filter((x) => x.s.value > 0.3).sort((a, b) => b.s.value - a.s.value).slice(0, 6) : [];
  const arche = hero.profile ? archetypeOf(hero) : null;
  const emblem = arche ? EMBLEM_BY_ARCHETYPE[arche] : null;
  const changes = model.patches.flatMap((p) => p.changes.filter((c) => c.target.toLowerCase() === slug || c.target.toLowerCase() === hero.name.toLowerCase()).map((c) => ({ ...c, date: p.date })));
  const teamCombos = EDITORIAL_COMBOS.filter((c) => c.a === slug || c.b === slug);
  const lane = (hero.lanes[0] as Lane) ?? null;
  const spells = EDITORIAL_SPELLS.filter((s) => (lane === "jungle" ? s.slug === "retribution" : s.roles.some((r) => hero.roles.includes(r as never)))).slice(0, 3);
  const name = (s: string) => all.find((h) => h.slug === s)?.name ?? s;

  return (
    <>
      <TrackRecent kind="hero" refId={slug} label={hero.name} />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <HeroAvatar hero={hero} size={96} className="rounded-2xl" />
        <div className="flex-1">
          <PageHeader
            kicker="Fiche héros"
            title={hero.name}
            subtitle={
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {hero.roles.map((r) => (
                  <RoleBadge key={r} role={r} />
                ))}
                <span className="chip">{hero.lanes.map((l) => LANE_FR[l]).join(" / ") || "Lane inconnue"}</span>
                {hero.damage && <span className="chip">Dégâts {DAMAGE_FR[hero.damage].toLowerCase()}s</span>}
                {hero.range && <span className="chip">{RANGE_FR[hero.range]}</span>}
                <span className="chip">Difficulté {hero.difficulty ? ["", "facile", "moyenne", "élevée"][hero.difficulty] : "—"}</span>
                <TierBadge tier={tier} size="sm" />
              </div>
            }
            actions={
              <>
                <FavoriteButton kind="hero" refId={slug} />
                <Link className="btn-ghost" href={`/builds?hero=${slug}`}>
                  Builds
                </Link>
                <Link className="btn-ghost" href={`/comparateur?heroes=${slug}`}>
                  Comparer
                </Link>
              </>
            }
          />
        </div>
      </div>
      {hero.incomplete && (
        <div className="mb-4">
          <Notice tone="warn">Profil incomplet : rôles, lanes et caractéristiques de ce héros ne sont pas encore renseignés. Il n&apos;est pas recommandé par le moteur de draft tant qu&apos;une source ne les fournit pas.</Notice>
        </div>
      )}
      {hero.confidence === "low" && !hero.incomplete && (
        <div className="mb-4">
          <Notice tone="warn">Profil de draft de faible confiance (héros récent : profil dérivé des notes publiées par la source ou estimation éditoriale) : à vérifier.</Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Statistiques" subtitle="Tous rangs · 7 jours" className="lg:col-span-1">
          {stat ? (
            <div className="space-y-3">
              {(
                [
                  ["Win rate", stat.winRate],
                  ["Pick rate", stat.pickRate],
                  ["Ban rate", stat.banRate],
                ] as const
              ).map(([l, v]) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">{l}</span>
                  <span className="h-display text-xl">{fmtPct(v)}</span>
                </div>
              ))}
              <Provenance source={sources[stat.sourceId]} capturedAt={stat.capturedAt} patch={stat.patch} />
            </div>
          ) : (
            <Unavailable reason="Aucune statistique importée pour ce héros (tous rangs, 7 jours)." />
          )}
        </Card>
        <Card title="Profil de jeu" subtitle={`Référentiel éditorial (0–3) · confiance ${hero.confidence === "high" ? "élevée" : hero.confidence === "medium" ? "moyenne" : "faible"}`} className="lg:col-span-2">
          {hero.profile ? (
            <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {PROFILE_LABELS.map(([k, l]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-ink-2">{l}</span>
                  <Bar value={hero.profile![k] as number} max={3} color="var(--color-violet)" />
                  <span className="w-6 text-right text-xs tabular-nums text-muted">{hero.profile![k] as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <Unavailable reason="Profil non renseigné." action={false} />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Forces et faiblesses">
          <div className="grid gap-4 sm:grid-cols-2">
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">{traits.strengths.length ? traits.strengths.map((s) => <li key={s}>{s}</li>) : <li className="text-muted">—</li>}</ul>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">{traits.weaknesses.length ? traits.weaknesses.map((s) => <li key={s}>{s}</li>) : <li className="text-muted">—</li>}</ul>
          </div>
          <div className="mt-4">
            <p className="label">Lecture méta</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
              {explainHero(hero, stat, ctx.snap.stats, tier).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </Card>
        <Card title="Compétences et passif" subtitle={details ? undefined : "Nécessite un import (source officielle ou statistique)"}>
          {details?.skills?.length ? (
            <>
              <ul className="space-y-3">
                {details.skills.map((s) => (
                  <li key={s.key}>
                    <p className="font-medium">
                      <span className="chip mr-2">{s.key === "passive" ? "Passif" : s.key.replace("skill_", "Compétence ").replace("ultimate", "Ultime")}</span>
                      {s.name} {s.type && <span className="text-xs text-muted">· {s.type}</span>}
                    </p>
                    {s.description && <p className="mt-1 text-sm text-ink-2">{s.description}</p>}
                    {(s.cooldown || s.cost) && <p className="text-xs text-muted">Recharge : {s.cooldown ?? "—"} · Coût : {s.cost ?? "—"}</p>}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Provenance source={sources[details.sourceId]} capturedAt={details.capturedAt} />
              </div>
            </>
          ) : (
            <Unavailable reason="Les descriptions de compétences changent à chaque patch ; elles ne sont pas rédigées de mémoire. Importe-les depuis une source." />
          )}
          {details?.baseStats && (
            <div className="mt-4">
              <p className="label">Statistiques de base</p>
              <ul className="grid grid-cols-2 gap-x-6 text-sm">
                {Object.entries(details.baseStats).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-line py-1">
                    <span className="text-ink-2">{k}</span>
                    <span className="tabular-nums">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Counters et match-ups" className="lg:col-span-2" subtitle={dataCounters.length ? "Données importées prioritaires, complétées par les règles de mécaniques" : "Estimés par règles de mécaniques (aucune donnée de matchup importée)"}>
          {dataCounters.length > 0 && (
            <div className="mb-4">
              <p className="label">Données de matchup importées</p>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {dataCounters.slice(0, 10).map((m) => {
                  const other = m.slug === slug ? m.other : m.slug;
                  const v = m.slug === slug ? m.score : -m.score;
                  return (
                    <li key={`${m.slug}-${m.other}`} className="flex justify-between">
                      <Link href={`/heros/${other}`} className="hover:text-gold">
                        {name(other)}
                      </Link>
                      <span className={v > 0 ? "text-good" : "text-bad"}>
                        {v > 0 ? "+" : ""}
                        {v.toFixed(1)} {m.unit}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Provenance source={sources[dataCounters[0].sourceId]} capturedAt={dataCounters[0].capturedAt} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <HeroReasonList title="Bons match-ups" items={mu.filter((x) => x.m.value > 0.25).sort((a, b) => b.m.value - a.m.value).slice(0, 6).map((x) => ({ h: x.o, txt: x.m.reasons.find((r) => r.value > 0)?.text ?? "" }))} />
            <HeroReasonList title="Le contrent" items={mu.filter((x) => x.m.value < -0.25).sort((a, b) => a.m.value - b.m.value).slice(0, 6).map((x) => ({ h: x.o, txt: x.m.reasons.find((r) => r.value < 0)?.text ?? "" }))} />
          </div>
        </Card>
        <Card title="Synergies">
          <HeroReasonList title="Alliés recommandés" items={syn.map((x) => ({ h: x.o, txt: x.s.reasons.find((r) => r.value > 0)?.text ?? "" }))} />
          <div className="mt-4">
            <p className="label">Combos d&apos;équipe connus</p>
            {teamCombos.length ? (
              <ul className="list-disc pl-5 text-sm text-ink-2">
                {teamCombos.map((c) => (
                  <li key={c.a + c.b}>
                    <b>{name(c.a === slug ? c.b : c.a)}</b> : {c.why}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Aucun combo référencé.</p>
            )}
            <p className="mt-2 text-xs text-muted">Combos de compétences : nécessitent les données de compétences importées.</p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Builds" className="lg:col-span-2" actions={<Link href={`/builds?hero=${slug}`} className="text-sm text-primary hover:underline">Builds adaptatifs →</Link>}>
          {builds.length > 0 && (
            <div className="mb-4 space-y-3">
              {builds.slice(0, 3).map((b) => (
                <div key={b.id}>
                  <p className="font-medium">
                    {b.title} <span className="text-xs text-muted">· {b.type}{b.sampleSize ? ` · échantillon ${b.sampleSize}` : ""}</span>
                  </p>
                  <ol className="mt-1 grid gap-1.5 sm:grid-cols-2">
                    {b.items.map((it, i) => (
                      <ItemRow key={i} item={items.get(it)} order={i + 1} />
                    ))}
                  </ol>
                  <Provenance source={sources[b.sourceId]} capturedAt={b.capturedAt} />
                </div>
              ))}
            </div>
          )}
          {hero.profile ? (
            <>
              {!builds.length && <p className="mb-2 text-xs text-muted">Aucun build statistique importé : modèle éditorial selon l&apos;archétype « {ARCHETYPE_FR[arche!]} » (non statistique).</p>}
              <ol className="grid gap-1.5 sm:grid-cols-2">
                {editorialVariants(hero)[0].items.map((it, i) => (
                  <ItemRow key={it} item={items.get(it)} order={i + 1} />
                ))}
              </ol>
            </>
          ) : (
            <Unavailable reason="Profil incomplet : aucun modèle de build." action={false} />
          )}
        </Card>
        <Card title="Emblème & sorts" subtitle={details?.extras?.emblemConsensus?.main ? "Consensus des builds de la source, avec échantillon" : "Recommandation éditoriale (talents à revérifier selon le patch)"}>
          {details?.extras?.emblemConsensus?.main ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="label">Emblème le plus utilisé</span>
                <p>
                  <b>{details.extras.emblemConsensus.main.name}</b>{" "}
                  <span className="text-muted">
                    ({details.extras.emblemConsensus.main.count}/{details.extras.emblemConsensus.main.sampleSize} builds)
                  </span>
                </p>
              </div>
              {details.extras.emblemConsensus.talents?.length ? (
                <div>
                  <span className="label">Talents</span>
                  <ul className="space-y-0.5">
                    {details.extras.emblemConsensus.talents.map((t) => (
                      <li key={t.section}>
                        Palier {t.section} : <b>{t.name}</b> <span className="text-muted">({t.count}/{t.sampleSize})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {details.extras.battleSpellConsensus?.primary && (
                <div>
                  <span className="label">Sort de combat</span>
                  <p>
                    <b>{details.extras.battleSpellConsensus.primary.name}</b> <span className="text-muted">({Math.round(details.extras.battleSpellConsensus.primary.share * 100)} %)</span>
                    {details.extras.battleSpellConsensus.alternative && (
                      <>
                        {" "}
                        · alternative <b>{details.extras.battleSpellConsensus.alternative.name}</b>{" "}
                        <span className="text-muted">({Math.round(details.extras.battleSpellConsensus.alternative.share * 100)} %)</span>
                      </>
                    )}
                  </p>
                </div>
              )}
              {(details.extras.emblemConsensus.smallSample || (details.extras.emblemConsensus.sampleSize ?? 0) < 20) && (
                <p className="text-xs text-warn">Petit échantillon ({details.extras.emblemConsensus.sampleSize} builds) : simple indication.</p>
              )}
              <Provenance source={sources[details.sourceId]} capturedAt={details.capturedAt} />
            </div>
          ) : emblem ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="label">Emblème</span>
                {EDITORIAL_EMBLEMS.find((e) => e.slug === emblem.emblem)?.nameFr}
              </p>
              <p>
                <span className="label">Talents</span>
                {emblem.talents.join(" · ")}
              </p>
              <p className="text-ink-2">{emblem.why}</p>
              <div>
                <span className="label">Sorts de combat</span>
                <ul className="space-y-1">
                  {spells.map((s) => (
                    <li key={s.slug}>
                      <b>{s.name}</b> <span className="text-muted">({s.nameFr})</span> — <span className="text-ink-2">{s.use}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <Unavailable compact />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Conseils de gameplay" subtitle="Dérivés du rôle et du profil">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            {gameplayTips(hero).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
        <Card title="Historique des changements">
          {changes.length ? (
            <ul className="space-y-2 text-sm">
              {changes.map((c) => (
                <li key={c.id}>
                  <span className="chip mr-2">{c.version}</span>
                  <span className={c.change === "buff" ? "text-good" : c.change === "nerf" ? "text-bad" : "text-ink-2"}>{c.change}</span> — {c.text}
                  {c.date && <span className="ml-1 text-xs text-muted">({fmtDate(c.date)})</span>}
                </li>
              ))}
            </ul>
          ) : (
            <Unavailable reason="Aucune note de patch mentionnant ce héros n'a été importée ou saisie." />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Statistiques selon le rang" subtitle="Dernière capture par rang et par période (win rate)">
          {matrix.length ? (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Rang</th>
                    {PERIODS.map((p) => (
                      <th key={p}>{PERIOD_FR[p]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RANKS.filter((r) => matrix.some((m) => m.rank === r)).map((r) => (
                    <tr key={r}>
                      <td>{RANK_FR[r]}</td>
                      {PERIODS.map((p) => {
                        const m = matrix.find((x) => x.rank === r && x.period === p);
                        return (
                          <td key={p} className="tabular-nums" title={m ? `pick ${m.pickRate} % · ban ${m.banRate} %` : undefined}>
                            {m ? fmtPct(m.winRate) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Unavailable />
          )}
        </Card>
        <Card title="Évolution (tous rangs, 7 jours)" subtitle="Une valeur par capture importée">
          {history.length >= 2 ? (
            <LineSeriesChart data={history.map((h) => ({ x: new Date(h.capturedAt).toLocaleDateString("fr-FR"), wr: h.winRate }))} series={[{ key: "wr", label: "Win rate" }]} unit=" %" reference={50} />
          ) : (
            <Unavailable reason={history.length === 1 ? "Une seule capture : l'évolution apparaîtra avec la suivante." : "Aucune capture."} action={!history.length} />
          )}
        </Card>
      </div>
      <p className="mt-6 text-xs text-muted">
        Rôles et lanes : {sources[hero.sourceId]?.name ?? hero.sourceId}, mis à jour le {fmtDate(hero.updatedAt)}.
      </p>
    </>
  );
}

function HeroReasonList({ title, items }: { title: string; items: { h: Hero; txt: string }[] }) {
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
