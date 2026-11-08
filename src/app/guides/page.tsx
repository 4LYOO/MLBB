import type { Metadata } from "next";
import { GuidesView } from "@/components/views/GuidesView";

export const metadata: Metadata = { title: "Base de connaissances" };

export default function Page() {
  return <GuidesView />;
}
