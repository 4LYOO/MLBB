import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { parseEditorialHeroes } from "@/data/reference/heroes";
import { HeroView } from "@/components/views/HeroView";

export const dynamicParams = false;

/** Héros connus au moment du build : référentiel + héros ajoutés par la synchronisation publiée. */
function heroList(): { slug: string; name: string }[] {
  const map = new Map(parseEditorialHeroes().map((h) => [h.slug, h.name]));
  try {
    const pub = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "published.json"), "utf8"));
    for (const p of pub.packages ?? []) for (const h of p.heroes ?? []) if (!map.has(h.slug)) map.set(h.slug, h.name);
  } catch {
    /* pas de données publiées : référentiel seul */
  }
  return [...map.entries()].map(([slug, name]) => ({ slug, name }));
}

export function generateStaticParams() {
  return heroList().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: heroList().find((h) => h.slug === slug)?.name ?? "Héros" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <HeroView slug={slug} />;
}
