import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { COACHING_META, COACHING_ROLES } from "@/data/reference/coaching";

export const metadata: Metadata = { title: "Coaching par rôle" };

export default function CoachingPage() {
  return (
    <>
      <PageHeader kicker="Progresser" title="Coaching" subtitle={`Une page par rôle. Contenu du patch ${COACHING_META.patch}.`} />
      <div className="grid gap-2 sm:grid-cols-2">
        {COACHING_ROLES.map((r) => (
          <Link key={r.id} href={`/coaching/${r.id}`} className="card flex min-h-20 min-w-0 items-center gap-3 p-4">
            <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: r.couleur }} />
            <span className="min-w-0">
              <span className="h-display block text-xl">{r.nom}</span>
              <span className="line-clamp-2 block text-sm text-ink-2">{r.resume}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
