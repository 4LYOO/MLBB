import type { Metadata } from "next";
import { COACHING_ROLES } from "@/data/reference/coaching";
import { CoachingRoleView } from "@/components/views/CoachingRoleView";
import { DataGate } from "@/components/views/Loading";

export const dynamicParams = false;

/** Une page statique par rôle : /coaching/exp, /coaching/jungle, … */
export function generateStaticParams() {
  return COACHING_ROLES.map((r) => ({ role: r.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  return { title: `Coaching ${COACHING_ROLES.find((r) => r.id === role)?.nom ?? ""}` };
}

export default async function Page({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const r = COACHING_ROLES.find((x) => x.id === role)!;
  return (
    <DataGate>
      <CoachingRoleView role={r} />
    </DataGate>
  );
}
