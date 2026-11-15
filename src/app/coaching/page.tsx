import type { Metadata } from "next";
import Link from "next/link";
import { Card, Notice, PageHeader } from "@/components/ui";
import { GUIDES } from "@/data/reference/guides";
import { LANE_FR, ROLE_COLOR, type Lane, type Role } from "@/lib/domain";

export const metadata: Metadata = { title: "Coaching par rôle" };

/** Les 5 rôles du coaching, avec la couleur et les guides existants associés. */
const ROLES: { lane: Lane; role: Role; guide: string }[] = [
  { lane: "exp", role: "Fighter", guide: "exp-lane" },
  { lane: "jungle", role: "Assassin", guide: "jungle-tempo" },
  { lane: "mid", role: "Mage", guide: "mid-lane" },
  { lane: "roam", role: "Support", guide: "roam-vision" },
  { lane: "gold", role: "Marksman", guide: "gold-lane" },
];

export default function CoachingPage() {
  return (
    <>
      <PageHeader kicker="Progresser" title="Coaching par rôle" subtitle="Une page par rôle : early, mid et late game, vision, erreurs fréquentes en Mythique, checklist, rush solo/duo." />
      <div className="mb-4">
        <Notice>Le coaching complet (11 sections par rôle, checklist sauvegardée) arrive en phase 3. En attendant, chaque rôle mène à son guide actuel.</Notice>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROLES.map((r) => {
          const g = GUIDES.find((x) => x.slug === r.guide);
          return (
            <Link key={r.lane} href={g ? `/guides/${g.slug}` : "/guides"} className="card flex min-h-16 min-w-0 items-center gap-3 p-4 active:opacity-80">
              <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: ROLE_COLOR[r.role] }} />
              <span className="min-w-0">
                <span className="h-display block text-lg">{LANE_FR[r.lane]}</span>
                <span className="block truncate text-xs text-muted">{g?.summary ?? "Guides du rôle"}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <Card title="Méthode" className="mt-4">
        <p className="text-sm text-ink-2">Après chaque partie, choisis UN point à améliorer et concentre-toi dessus pendant toute la session suivante.</p>
      </Card>
    </>
  );
}
