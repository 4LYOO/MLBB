import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, HeroAvatar, Notice, PageHeader, Provenance, RoleBadge } from "@/components/ui";
import { LinkTabs } from "@/components/filters/LinkTabs";
import { ItemRow } from "@/components/hero/ItemRow";
import { BuildLab } from "@/components/builds/BuildLab";
import { getBuilds, getCatalog, getHero, getHeroes, getItems, getSourceMap } from "@/lib/server/repo";
import { ARCHETYPE_FR, EMBLEM_BY_ARCHETYPE, archetypeOf, editorialVariants, type Archetype } from "@/lib/engine/builds";
import { EDITORIAL_EMBLEMS, EDITORIAL_SPELLS, EDITORIAL_TALENTS, ITEM_CATEGORY_FR, ITEM_TAGS, type ItemCategory, type ItemTag } from "@/data/reference/items";
import { DAMAGE_FR, LANE_FR } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Équipements & builds" };

const TABS = [
  { value: "hero", label: "Par héros" },
  { value: "items", label: "Objets" },
  { value: "emblems", label: "Emblèmes" },
  { value: "spells", label: "Sorts de combat" },
];

export default async function BuildsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.value === sp.tab) ? sp.tab! : "hero";
  const heroes = getHeroes();
  const items = getItems();
  const sources = getSourceMap();
  const hero = getHero(sp.hero ?? "") ?? heroes.find((h) => h.slug === "tigreal") ?? heroes[0];
  const cat = sp.cat as ItemCategory | undefined;
  const tag = sp.tagf as ItemTag | undefined;
  const editorialItems = items.every((i) => i.sourceId === "editorial");
  const talents = getCatalog("talent");
  const emblemCat = getCatalog("emblem");

  return (
    <>
      <PageHeader
        kicker="Équipements"
        title="Équipements & builds"
        subtitle="Builds par héros, builds adaptatifs à la composition adverse, comparaison de builds, objets, emblèmes et sorts de combat."
      />
      <div className="mb-4">
        <Suspense>
          <LinkTabs param="tab" options={TABS} defaultValue="hero" />
        </Suspense>
      </div>

      {tab === "hero" && hero && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card title="Choisir un héros" className="lg:sticky lg:top-6 lg:self-start">
            <form action="/builds" className="mb-3 flex gap-2">
              <input type="hidden" name="tab" value="hero" />
              <select name="hero" defaultValue={hero.slug} className="input">
                {heroes
                  .filter((h) => h.profile)
                  .map((h) => (
                    <option key={h.slug} value={h.slug}>
                      {h.name}
                    </option>
                  ))}
              </select>
              <button className="btn-primary">OK</button>
            </form>
            <div className="flex items-center gap-3">
              <HeroAvatar hero={hero} size={56} />
              <div>
                <Link href={`/heros/${hero.slug}`} className="h-display text-xl hover:text-gold">
                  {hero.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-1">
                  {hero.roles.map((r) => (
                    <RoleBadge key={r} role={r} />
                  ))}
                </div>
              </div>
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Lane</dt>
                <dd>{hero.lanes.map((l) => LANE_FR[l]).join(", ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Dégâts</dt>
                <dd>{hero.damage ? DAMAGE_FR[hero.damage] : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Difficulté</dt>
                <dd>{hero.difficulty ?? "—"}/3</dd>
              </div>
              {hero.profile && (
                <div className="flex justify-between">
                  <dt className="text-muted">Archétype</dt>
                  <dd>{ARCHETYPE_FR[archetypeOf(hero)]}</dd>
                </div>
              )}
            </dl>
            {hero.profile && (
              <div className="mt-4 border-t border-line pt-3 text-sm">
                <p className="label">Emblème conseillé (éditorial)</p>
                <p>
                  {EDITORIAL_EMBLEMS.find((e) => e.slug === EMBLEM_BY_ARCHETYPE[archetypeOf(hero)].emblem)?.nameFr} — {EMBLEM_BY_ARCHETYPE[archetypeOf(hero)].talents.join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted">{EMBLEM_BY_ARCHETYPE[archetypeOf(hero)].why}</p>
              </div>
            )}
          </Card>
          <Card>
            {hero.profile ? (
              <BuildLab key={hero.slug} hero={hero} heroes={heroes} items={items} imported={getBuilds(hero.slug)} editorial={editorialVariants(hero)} />
            ) : (
              <Notice tone="warn">Profil incomplet pour {hero.name} : aucun modèle de build ne peut être proposé.</Notice>
            )}
          </Card>
        </div>
      )}

      {tab === "items" && (
        <Card>
          {editorialItems && (
            <div className="mb-4">
              <Notice tone="warn">Catalogue éditorial : noms, catégories et usages tactiques uniquement. Prix, statistiques et passifs changent à chaque patch et restent « Donnée indisponible » jusqu&apos;à un import.</Notice>
            </div>
          )}
          <div className="mb-4 flex flex-wrap gap-1">
            <Link href="/builds?tab=items" className={`chip ${!cat && !tag ? "border-gold text-gold" : ""}`}>
              Tous ({items.length})
            </Link>
            {(Object.keys(ITEM_CATEGORY_FR) as ItemCategory[])
              .filter((c) => items.some((i) => i.category === c))
              .map((c) => (
                <Link key={c} href={`/builds?tab=items&cat=${c}`} className={`chip ${cat === c ? "border-gold text-gold" : ""}`}>
                  {ITEM_CATEGORY_FR[c]}
                </Link>
              ))}
            <span className="mx-2 text-muted">|</span>
            {(["antiheal", "physpen", "magpen", "physdef", "magdef", "antiburst", "antitank"] as ItemTag[]).map((t) => (
              <Link key={t} href={`/builds?tab=items&tagf=${t}`} className={`chip ${tag === t ? "border-gold text-gold" : ""}`}>
                {ITEM_TAGS[t]}
              </Link>
            ))}
          </div>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {items
              .filter((i) => (!cat || i.category === cat) && (!tag || i.tags.includes(tag)))
              .map((i) => (
                <ItemRow key={i.slug} item={i} highlight={sp.item === i.slug} />
              ))}
          </ul>
          <div className="mt-3">
            <Provenance source={sources[items[0]?.sourceId ?? "editorial"]} capturedAt={items[0]?.updatedAt} />
          </div>
        </Card>
      )}

      {tab === "emblems" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Emblèmes principaux" subtitle={emblemCat.length ? "Attributs importés de la source" : "Les 7 emblèmes du système actuel"}>
            {emblemCat.length > 0 && (
              <ul className="mb-3 space-y-2 text-sm">
                {emblemCat.map((e) => (
                  <li key={e.slug} className="glass-inset rounded-2xl p-2.5">
                    <b>{e.data.name}</b>
                    <span className="block text-xs text-ink-2">{(e.data.attributes ?? []).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            )}
            <ul className={emblemCat.length ? "hidden" : "space-y-2 text-sm"}>
              {EDITORIAL_EMBLEMS.map((e) => (
                <li key={e.slug} className="flex justify-between rounded-lg border border-line p-2">
                  <span className="font-medium">
                    {e.nameFr} <span className="text-muted">({e.name})</span>
                  </span>
                  <span className="text-xs text-muted">{e.roles.join(", ")}</span>
                </li>
              ))}
            </ul>
          </Card>
          {talents.length ? (
            <Card title="Talents" subtitle="Talents actuels importés de la source">
              {[1, 2, 3].map((tier) => (
                <div key={tier} className="mb-3">
                  <p className="label">Palier {tier}</p>
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {talents
                      .filter((t) => t.data.tier === tier)
                      .map((t) => (
                        <li key={t.slug}>
                          <b>{t.data.name}</b> {t.data.benefits && <span className="text-ink-2">— {t.data.benefits}</span>}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
              <Provenance source={sources[talents[0].sourceId]} capturedAt={talents[0].capturedAt} />
            </Card>
          ) : (
            <Card title="Talents" subtitle="Système connu 2023–2025 : à revérifier contre le patch actuel (refonte possible en 2026)">
              {[1, 2, 3].map((tier) => (
                <div key={tier} className="mb-3">
                  <p className="label">Palier {tier}</p>
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {EDITORIAL_TALENTS.filter((t) => t.tier === tier).map((t) => (
                      <li key={t.name}>
                        <b>{t.name}</b> <span className="text-ink-2">— {t.use}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Card>
          )}
          <Card title="Configurations par archétype" className="lg:col-span-2" subtitle="Recommandations éditoriales + adaptations selon l'adversaire">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Archétype</th>
                    <th>Emblème</th>
                    <th>Talents</th>
                    <th>Pourquoi</th>
                    <th>Adaptation</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(EMBLEM_BY_ARCHETYPE) as Archetype[]).map((a) => (
                    <tr key={a}>
                      <td>{ARCHETYPE_FR[a]}</td>
                      <td>{EDITORIAL_EMBLEMS.find((e) => e.slug === EMBLEM_BY_ARCHETYPE[a].emblem)?.nameFr}</td>
                      <td className="text-xs">{EMBLEM_BY_ARCHETYPE[a].talents.join(" · ")}</td>
                      <td className="text-xs text-ink-2">{EMBLEM_BY_ARCHETYPE[a].why}</td>
                      <td className="text-xs text-muted">
                        {a.startsWith("mm") || a.startsWith("mage") || a.startsWith("assassin")
                          ? "Contre beaucoup de burst : Firmness/Vitality au palier 1."
                          : a === "tank" || a === "support"
                            ? "Contre une équipe très mobile : Agility pour suivre les rotations."
                            : "Contre beaucoup de contrôles : Tenacity au palier 2."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "spells" && (
        <Card title="Sorts de combat" subtitle="Recommandations par rôle et par situation (éditorial)">
          <ul className="grid gap-3 md:grid-cols-2">
            {EDITORIAL_SPELLS.map((s) => (
              <li key={s.slug} className="rounded-xl border border-line bg-surface-2/50 p-3">
                <p className="font-medium">
                  {s.name} <span className="text-muted">· {s.nameFr}</span>
                </p>
                <p className="text-sm text-ink-2">{s.use}</p>
                <p className="mt-1 text-xs text-muted">Pour : {s.roles.map((r) => (r === "jungle" ? "Jungle" : r)).join(", ")}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Le sort conseillé pour une composition adverse précise est calculé dans le build adaptatif (onglet « Par héros »).</p>
        </Card>
      )}
    </>
  );
}
