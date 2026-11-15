import type { Metadata } from "next";
import { StatsView } from "@/components/views/StatsView";

export const metadata: Metadata = { title: "Statistiques globales" };

export default function Page() {
  return <StatsView />;
}
