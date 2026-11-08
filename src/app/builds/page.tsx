import type { Metadata } from "next";
import { BuildsView } from "@/components/views/BuildsView";

export const metadata: Metadata = { title: "Équipements & builds" };

export default function Page() {
  return <BuildsView />;
}
