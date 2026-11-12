import { BarChart3, BookOpen, Crown, Database, GitCompare, Heart, ScrollText, Shield, Swords, User, Wrench } from "lucide-react";

export const NAV = [
  { href: "/", label: "Statistiques", icon: BarChart3, short: "Stats" },
  { href: "/meta", label: "Méta & Tier list", icon: Crown, short: "Méta" },
  { href: "/draft", label: "Simulateur de draft", icon: Swords, short: "Draft" },
  { href: "/builds", label: "Équipements & builds", icon: Wrench, short: "Builds" },
  { href: "/heros", label: "Fiches héros", icon: Shield, short: "Héros" },
  { href: "/profil", label: "Mes statistiques", icon: User, short: "Moi" },
  { href: "/comparateur", label: "Comparateur", icon: GitCompare, short: "Comparer" },
  { href: "/patchs", label: "Patch notes", icon: ScrollText, short: "Patchs" },
  { href: "/guides", label: "Base de connaissances", icon: BookOpen, short: "Guides" },
  { href: "/favoris", label: "Favoris & historique", icon: Heart, short: "Favoris" },
  { href: "/sources", label: "Sources & données", icon: Database, short: "Sources" },
] as const;

export const MOBILE_NAV = ["/", "/meta", "/draft", "/profil"];
