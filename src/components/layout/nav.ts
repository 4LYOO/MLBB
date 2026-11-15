import { BarChart3, BookOpen, Crown, Database, GitCompare, GraduationCap, Heart, ScrollText, Shield, Swords, User, Users, Wrench } from "lucide-react";

/** Les 5 onglets du bas (à portée du pouce). Le Draft est aussi l'écran d'accueil « / ». */
export const TABS = [
  { href: "/draft", label: "Simulateur de draft", icon: Swords, short: "Draft" },
  { href: "/heros", label: "Fiches héros", icon: Shield, short: "Héros" },
  { href: "/coaching", label: "Coaching par rôle", icon: GraduationCap, short: "Coaching" },
  { href: "/duo", label: "Duo", icon: Users, short: "Duo" },
  { href: "/profil", label: "Mes statistiques", icon: User, short: "Stats" },
] as const;

/** Les autres pages : menu « Plus » en haut à droite (2 taps maximum). */
export const MORE = [
  { href: "/statistiques", label: "Statistiques globales", icon: BarChart3, short: "Stats globales" },
  { href: "/meta", label: "Méta & Tier list", icon: Crown, short: "Méta" },
  { href: "/builds", label: "Équipements & builds", icon: Wrench, short: "Builds" },
  { href: "/comparateur", label: "Comparateur", icon: GitCompare, short: "Comparer" },
  { href: "/patchs", label: "Patch notes", icon: ScrollText, short: "Patchs" },
  { href: "/guides", label: "Base de connaissances", icon: BookOpen, short: "Guides" },
  { href: "/favoris", label: "Favoris & historique", icon: Heart, short: "Favoris" },
  { href: "/sources", label: "Sources & données", icon: Database, short: "Sources" },
] as const;

export const NAV = [...TABS, ...MORE];

/** Onglet actif : « / » compte comme le Draft. */
export const isActive = (path: string, href: string) => {
  const p = path.replace(/\/$/, "") || "/";
  if (href === "/draft" && p === "/") return true;
  return p === href || p.startsWith(href + "/");
};
