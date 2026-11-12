import type { Metadata } from "next";
import { PatchesView } from "@/components/views/PatchesView";

export const metadata: Metadata = { title: "Patch notes" };

export default function Page() {
  return <PatchesView />;
}
