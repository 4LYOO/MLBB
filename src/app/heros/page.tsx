import type { Metadata } from "next";
import Link from "next/link";
import { HeroAvatar, PageHeader, RoleBadge } from "@/components/ui";
import { getFavorites, getHeroes } from "@/lib/server/repo";
import { LANE_FR, ROLES, ROLE_FR } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fiches héros" };

export default async function HeroesPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const favs = new Set(getFavorites().filter((f) => f.kind === "hero").map((f) => f.ref));
  const heroes = getHeroes().filter((h) => !role || h.roles.includes(role as never));
  return (
    <>
      <PageHeader kicker="Encyclopédie" title="Fiches héros" subtitle="Une fiche par héros : compétences, builds, emblèmes, counters, synergies, statistiques, conseils et historique des changements." />
      <div className="mb-4 flex flex-wrap gap-1">
        <Link href="/heros" className={`chip ${!role ? "border-gold text-gold" : ""}`}>
          Tous ({getHeroes().length})
        </Link>
        {ROLES.map((r) => (
          <Link key={r} href={`/heros?role=${r}`} className={`chip ${role === r ? "border-gold text-gold" : ""}`}>
            {ROLE_FR[r]}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {heroes.map((h) => (
          <Link key={h.slug} href={`/heros/${h.slug}`} className="card group flex flex-col items-center gap-2 p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/60">
            <HeroAvatar hero={h} size={64} className="transition group-hover:ring-2 group-hover:ring-gold" />
            <p className="font-semibold">
              {h.name} {favs.has(h.slug) && <span className="text-gold">♥</span>}
            </p>
            <div className="flex flex-wrap justify-center gap-1">{h.roles.map((r) => <RoleBadge key={r} role={r} />)}</div>
            <p className="text-[11px] text-muted">{h.lanes.map((l) => LANE_FR[l]).join(" · ") || "Profil incomplet"}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
