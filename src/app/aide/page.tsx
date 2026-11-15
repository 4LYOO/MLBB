import type { Metadata } from "next";
import { AideView } from "@/components/views/AideView";

export const metadata: Metadata = { title: "Aide-mémoire" };

export default function AidePage() {
  return <AideView />;
}
