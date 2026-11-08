import type { Metadata } from "next";
import { HeroesView } from "@/components/views/HeroesView";

export const metadata: Metadata = { title: "Fiches héros" };

export default function Page() {
  return <HeroesView />;
}
