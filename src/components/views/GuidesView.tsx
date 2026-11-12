"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, PageHeader, RoleBadge } from "@/components/ui";
import { GUIDES } from "@/data/reference/guides";
import { REFERENCE_LINKS } from "@/data/reference/sources";
import { ROLES, ROLE_FR } from "@/lib/domain";


export function GuidesView() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const sp = useSearchParams();
  const cat = sp.get("cat") ?? undefined;
  const role = sp.get("role") ?? undefined;
  const cats = [...new Set(GUIDES.map((g) => g.category))];
  const list = GUIDES.filter((g) => (!cat || g.category === cat) && (!role || g.roles.includes(role)));
  const linkCats = [...new Set(REFERENCE_LINKS.map((l) => l.category))];
  return (
    <>
      <PageHeader kicker="Apprendre" title="Base de connaissances" subtitle="Guides de draft, de macro et par rôle, rédigés pour l'application, et bibliothèque des ressources externes évaluées dans le dossier de sources." />
      <div className="mb-4 flex flex-wrap gap-1">
        <Link href="/guides" className={`chip ${!cat && !role ? "border-gold text-gold" : ""}`}>
          Tout
        </Link>
        {cats.map((c) => (
          <Link key={c} href={`/guides?cat=${c}`} className={`chip ${cat === c ? "border-gold text-gold" : ""}`}>
            {c}
          </Link>
        ))}
        <span className="mx-2 text-muted">|</span>
        {ROLES.map((r) => (
          <Link key={r} href={`/guides?role=${r}`} className={`chip ${role === r ? "border-gold text-gold" : ""}`}>
            {ROLE_FR[r]}
          </Link>
        ))}
      </div>
      <div className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="card card-pad transition hover:-translate-y-0.5 hover:border-primary/60">
            <p className="text-[11px] uppercase tracking-wider text-gold">{g.category}</p>
            <h2 className="h-display mt-1 text-lg">{g.title}</h2>
            <p className="mt-1 text-sm text-ink-2">{g.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {g.roles.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
            </div>
          </Link>
        ))}
        {!list.length && <p className="text-sm text-muted">Aucun guide pour ce filtre.</p>}
      </div>
      <h2 className="h-display mb-3 text-2xl">Ressources externes</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {linkCats.map((c) => (
          <Card key={c} title={c}>
            <ul className="space-y-1.5 text-sm">
              {REFERENCE_LINKS.filter((l) => l.category === c).map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {l.name}
                  </a>
                  {l.rating != null && <span className="ml-1 text-xs text-gold">{l.rating}/10</span>}
                  <span className="block text-xs text-muted">{l.note}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Notes /10 : évaluation du dossier de sources (8 nov. 2026), pas des données officielles.</p>
    </>
  );
}
