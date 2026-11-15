import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { DuoView } from "@/components/views/DuoView";

export const metadata: Metadata = { title: "Duo" };

export default function DuoPage() {
  return (
    <>
      <PageHeader kicker="À deux" title="Duo" subtitle="Vos meilleures paires et vos pools de héros par lane (bonus « pool » et mode duo du draft)." />
      <DuoView />
    </>
  );
}
