import type { Metadata } from "next";
import { DraftView } from "@/components/views/DraftView";

export const metadata: Metadata = { title: "Simulateur de draft" };

export default function DraftPage() {
  return (
    <>
      <h1 className="h-display mb-3 text-[26px] leading-tight">Draft</h1>
      <DraftView />
    </>
  );
}
