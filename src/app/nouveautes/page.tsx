import type { Metadata } from "next";
import { NouveautesView } from "@/components/views/NouveautesView";

export const metadata: Metadata = { title: "Nouveautés du patch" };

export default function NouveautesPage() {
  return <NouveautesView />;
}
