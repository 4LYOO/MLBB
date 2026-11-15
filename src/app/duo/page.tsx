import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { DuoView } from "@/components/views/DuoView";

export const metadata: Metadata = { title: "Duo" };

export default function DuoPage() {
  return (
    <>
      <PageHeader kicker="À deux" title="Duo" subtitle="Vos pools de héros par lane. Ils servent au draft (bonus « pool » et mode duo)." />
      <DuoView />
    </>
  );
}
