import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, HeroChip, PageHeader, RoleBadge } from "@/components/ui";
import { FavoriteButton, TrackRecent } from "@/components/hero/FavoriteButton";
import { GUIDES } from "@/data/reference/guides";
import { editorialHeroes } from "@/lib/engine/editorial";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: GUIDES.find((g) => g.slug === slug)?.title ?? "Guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();
  const heroes = editorialHeroes().filter((h) => g.heroes.includes(h.slug));
  return (
    <>
      <TrackRecent kind="guide" refId={slug} label={g.title} />
      <PageHeader kicker={g.category} title={g.title} subtitle={g.summary} actions={<FavoriteButton kind="guide" refId={slug} />} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <ul className="space-y-3 text-ink-2">
            {g.body.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="h-display text-gold">{i + 1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Guide rédigé pour MLBB Companion (source éditoriale) · principes généraux, à adapter au patch en cours.</p>
        </Card>
        <div className="space-y-4">
          {g.roles.length > 0 && (
            <Card title="Rôles concernés">
              <div className="flex flex-wrap gap-1">
                {g.roles.map((r) => (
                  <RoleBadge key={r} role={r} />
                ))}
              </div>
            </Card>
          )}
          {heroes.length > 0 && (
            <Card title="Héros associés">
              <div className="grid grid-cols-2 gap-2">
                {heroes.map((h) => (
                  <HeroChip key={h.slug} hero={h} />
                ))}
              </div>
            </Card>
          )}
          <Card title="Pour aller plus loin">
            <ul className="space-y-1 text-sm">
              {g.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {l.name}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
          <Link href="/guides" className="btn-ghost w-full">
            ← Tous les guides
          </Link>
        </div>
      </div>
    </>
  );
}
