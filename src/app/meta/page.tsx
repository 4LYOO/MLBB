import type { Metadata } from "next";
import { MetaView } from "@/components/views/MetaView";

export const metadata: Metadata = { title: "Méta & Tier list" };

export default function Page() {
  return <MetaView />;
}
