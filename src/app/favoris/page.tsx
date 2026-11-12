import type { Metadata } from "next";
import { FavoritesView } from "@/components/views/FavoritesView";

export const metadata: Metadata = { title: "Favoris & historique" };

export default function Page() {
  return <FavoritesView />;
}
