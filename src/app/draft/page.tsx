import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { DraftView } from "@/components/views/DraftView";

export const metadata: Metadata = { title: "Simulateur de draft" };

export default function DraftPage() {
  return (
    <>
      <PageHeader
        kicker="Préparation"
        title="Simulateur de draft"
        subtitle="Sélectionne alliés, adversaires et bans : le moteur analyse la situation et classe les meilleurs choix avec une explication détaillée. Moteur déterministe et explicable — estimations stratégiques, pas des certitudes."
      />
      <DraftView />
    </>
  );
}
