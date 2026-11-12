import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { SourcesView } from "@/components/views/SourcesView";

export const metadata: Metadata = { title: "Sources & données" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Fiabilité" title="Sources & données" subtitle="Provenance, fiabilité et fraîcheur de chaque donnée ; synchronisation, imports manuels et sauvegarde de tes données." />
      <SourcesView />
    </>
  );
}
