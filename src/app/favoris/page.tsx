import type { Metadata } from "next";
import Link from "next/link";
import { Card, HeroChip, PageHeader, fmtDate } from "@/components/ui";
import { getBuilds, getDrafts, getFavorites, getHeroes, getRecent, getSavedFilters } from "@/lib/server/repo";
import { GUIDES } from "@/data/reference/guides";
import { DRAFT_MODES } from "@/lib/engine/draft";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favoris & historique" };

export default function FavoritesPage() {
  const favs = getFavorites();
  const heroes = getHeroes();
  const byHero = new Map(heroes.map((h) => [h.slug, h]));
  const favHeroes = favs.filter((f) => f.kind === "hero").map((f) => byHero.get(f.ref)).filter(Boolean);
  const favGuides = favs.filter((f) => f.kind === "guide").map((f) => GUIDES.find((g) => g.slug === f.ref)).filter(Boolean);
  const userBuilds = getBuilds().filter((b) => b.isUser);
  const drafts = getDrafts();
  const filters = getSavedFilters();
  const recent = getRecent(15);
  const pageOf: Record<string, string> = { stats: "/", meta: "/meta" };
  return (
    <>
      <PageHeader kicker="Personnalisation" title="Favoris & historique" subtitle="Tes héros favoris, builds et drafts sauvegardés, filtres personnalisés et dernières analyses consultées." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Héros favoris (${favHeroes.length})`}>
          {favHeroes.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {favHeroes.map((h) => (
                <HeroChip key={h!.slug} hero={h!} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Ajoute des héros depuis leur fiche (bouton ♥). Ils sont filtrables dans le simulateur de draft.</p>
          )}
        </Card>
        <Card title="Dernières analyses">
          {recent.length ? (
            <ul className="space-y-1 text-sm">
              {recent.map((r) => (
                <li key={r.kind + r.ref} className="flex justify-between">
                  <Link href={r.kind === "hero" ? `/heros/${r.ref}` : `/guides/${r.ref}`} className="hover:text-gold">
                    {r.label}
                  </Link>
                  <span className="text-xs text-muted">{fmtDate(r.at, true)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Rien de consulté récemment.</p>
          )}
        </Card>
        <Card title={`Drafts sauvegardées (${drafts.length})`} actions={<Link href="/draft" className="text-sm text-primary hover:underline">Simulateur →</Link>}>
          {drafts.length ? (
            <ul className="space-y-1 text-sm">
              {drafts.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span>{d.name}</span>
                  <span className="text-xs text-muted">
                    {DRAFT_MODES.find((m) => m.id === d.mode)?.label} · qualité {(d.summary as { overall?: number } | null)?.overall ?? "—"} · {fmtDate(d.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aucune draft sauvegardée. Rouvre-les depuis l&apos;onglet Historique du simulateur.</p>
          )}
        </Card>
        <Card title={`Mes builds (${userBuilds.length})`}>
          {userBuilds.length ? (
            <ul className="space-y-1 text-sm">
              {userBuilds.map((b) => (
                <li key={b.id}>
                  <Link href={`/builds?hero=${b.hero}`} className="hover:text-gold">
                    {byHero.get(b.hero)?.name} — {b.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sauvegarde des builds depuis la page Équipements & builds.</p>
          )}
        </Card>
        <Card title={`Filtres personnalisés (${filters.length})`}>
          {filters.length ? (
            <ul className="space-y-1 text-sm">
              {filters.map((f) => (
                <li key={f.id}>
                  <Link href={`${pageOf[f.page] ?? "/"}?${new URLSearchParams(f.params).toString()}`} className="hover:text-gold">
                    {f.name}
                  </Link>{" "}
                  <span className="text-xs text-muted">({f.page})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Utilise « Sauver » à côté des filtres de rang/période.</p>
          )}
        </Card>
        <Card title={`Guides favoris (${favGuides.length})`}>
          {favGuides.length ? (
            <ul className="space-y-1 text-sm">
              {favGuides.map((g) => (
                <li key={g!.slug}>
                  <Link href={`/guides/${g!.slug}`} className="hover:text-gold">
                    {g!.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aucun guide favori.</p>
          )}
        </Card>
      </div>
    </>
  );
}
