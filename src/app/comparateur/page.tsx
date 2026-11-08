import type { Metadata } from "next";
import { CompareView } from "@/components/views/CompareView";

export const metadata: Metadata = { title: "Comparateur de héros" };

export default function Page() {
  return <CompareView />;
}
