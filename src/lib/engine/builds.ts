/**
 * Builds éditoriaux par archétype + moteur d'adaptation à la composition adverse.
 * Source « editorial » / « computed » : ce ne sont PAS des builds statistiques.
 * Les builds importés d'une source (avec échantillon) sont affichés en priorité.
 */
import type { Hero, Lane } from "@/lib/domain";

export type Archetype =
  | "mm-crit"
  | "mm-onhit"
  | "mm-magic"
  | "mage-burst"
  | "mage-melee"
  | "assassin-phys"
  | "assassin-magic"
  | "fighter-phys"
  | "fighter-magic"
  | "tank"
  | "support";

export const ARCHETYPE_FR: Record<Archetype, string> = {
  "mm-crit": "Tireur critique",
  "mm-onhit": "Tireur attaques de base",
  "mm-magic": "Tireur magique",
  "mage-burst": "Mage burst",
  "mage-melee": "Mage de mêlée / sustain",
  "assassin-phys": "Assassin physique",
  "assassin-magic": "Assassin magique",
  "fighter-phys": "Combattant physique",
  "fighter-magic": "Combattant magique",
  tank: "Tank",
  support: "Support",
};

export const ARCHETYPE_ITEMS: Record<Archetype, string[]> = {
  "mm-crit": ["swift-boots", "berserkers-fury", "haass-claws", "windtalker", "malefic-roar", "blade-of-despair"],
  "mm-onhit": ["swift-boots", "corrosion-scythe", "demon-hunter-sword", "golden-staff", "malefic-gun", "wind-of-nature"],
  "mm-magic": ["arcane-boots", "feather-of-heaven", "genius-wand", "holy-crystal", "divine-glaive", "blood-wings"],
  "mage-burst": ["arcane-boots", "genius-wand", "lightning-truncheon", "holy-crystal", "divine-glaive", "blood-wings"],
  "mage-melee": ["arcane-boots", "concentrated-energy", "clock-of-destiny", "holy-crystal", "divine-glaive", "athenas-shield"],
  "assassin-phys": ["tough-boots", "hunter-strike", "blade-of-the-heptaseas", "endless-battle", "malefic-roar", "blade-of-despair"],
  "assassin-magic": ["tough-boots", "genius-wand", "starlium-scythe", "holy-crystal", "lightning-truncheon", "divine-glaive"],
  "fighter-phys": ["warrior-boots", "war-axe", "hunter-strike", "bloodlust-axe", "queens-wings", "immortality"],
  "fighter-magic": ["tough-boots", "concentrated-energy", "starlium-scythe", "holy-crystal", "radiant-armor", "immortality"],
  tank: ["tough-boots", "dominance-ice", "antique-cuirass", "athenas-shield", "radiant-armor", "immortality"],
  support: ["demon-shoes", "enchanted-talisman", "fleeting-time", "oracle", "athenas-shield", "immortality"],
};

export function archetypeOf(h: Hero): Archetype {
  const r0 = h.roles[0];
  const tags = h.profile?.tags ?? [];
  if (r0 === "Marksman") return h.damage === "M" ? "mm-magic" : tags.includes("burst") ? "mm-crit" : h.slug === "karrie" || tags.includes("antitank") ? "mm-onhit" : "mm-crit";
  if (r0 === "Mage") return h.range === "M" ? "mage-melee" : "mage-burst";
  if (r0 === "Assassin") return h.damage === "M" ? "assassin-magic" : "assassin-phys";
  if (r0 === "Fighter") return h.damage === "M" ? "fighter-magic" : "fighter-phys";
  if (r0 === "Tank") return "tank";
  if (r0 === "Support") return tags.includes("heal") || tags.includes("protect") ? "support" : "tank";
  return "fighter-phys";
}

const SQUISHY: Archetype[] = ["mm-crit", "mm-onhit", "mm-magic", "mage-burst", "assassin-phys", "assassin-magic"];

export interface AdaptiveChange {
  add: string;
  replace: string | null;
  reason: string;
  trigger: string;
}

export interface AdaptiveResult {
  archetype: Archetype;
  base: string[];
  adapted: string[];
  changes: AdaptiveChange[];
  spell: { slug: string; reason: string };
  enemySummary: { physical: number; magic: number; healers: number; shields: number; tanks: number; burst: number; cc: number; mobile: number };
}

export interface EnemyItemsFlags {
  heavyArmor?: boolean; // l'adversaire empile la défense physique
  heavyMagicDef?: boolean;
}

export function adaptBuild(hero: Hero, enemies: Hero[], lane: Lane | null, flags: EnemyItemsFlags = {}, base?: string[]): AdaptiveResult {
  const archetype = archetypeOf(hero);
  const baseItems = base?.length ? [...base] : [...ARCHETYPE_ITEMS[archetype]];
  const adapted = [...baseItems];
  const changes: AdaptiveChange[] = [];
  const prof = enemies.filter((e) => e.profile);
  const s = {
    physical: enemies.reduce((a, e) => a + (e.damage === "P" ? 1 : e.damage === "H" ? 0.5 : 0), 0),
    magic: enemies.reduce((a, e) => a + (e.damage === "M" ? 1 : e.damage === "H" ? 0.5 : 0), 0),
    healers: prof.filter((e) => e.profile!.tags.includes("heal") || e.profile!.tags.includes("selfheal") || e.profile!.sustain >= 3).length,
    shields: prof.filter((e) => e.profile!.tags.includes("shield")).length,
    tanks: prof.filter((e) => e.profile!.durability >= 3).length,
    burst: prof.filter((e) => e.profile!.burst >= 3).length,
    cc: prof.reduce((a, e) => a + e.profile!.cc, 0),
    mobile: prof.filter((e) => e.profile!.mobility >= 3).length,
  };
  const isPhys = hero.damage !== "M";
  const squishy = SQUISHY.includes(archetype);
  const tanky = archetype === "tank" || archetype === "fighter-phys" || archetype === "fighter-magic";

  // Emplacements remplaçables : du dernier vers le 3e (on garde bottes + cœur).
  const flexible = () => {
    for (let i = adapted.length - 1; i >= 2; i--) if (!changes.some((c) => c.add === adapted[i])) return i;
    return -1;
  };
  const apply = (item: string, reason: string, trigger: string) => {
    if (adapted.includes(item)) {
      changes.push({ add: item, replace: null, reason: `${reason} (déjà présent dans le build)`, trigger });
      return;
    }
    const i = flexible();
    if (i < 0) return;
    changes.push({ add: item, replace: adapted[i], reason, trigger });
    adapted[i] = item;
  };

  if (s.healers >= 1) {
    const it = tanky && archetype === "tank" ? "dominance-ice" : isPhys ? "sea-halberd" : "glowing-wand";
    apply(it, "Réduction de soins contre les héros à soins/sustain adverses.", `${s.healers} héros à soins ou sustain`);
  }
  if (s.shields >= 1 && archetype === "tank") apply("dominance-ice", "Limite l'efficacité des boucliers adverses.", `${s.shields} héros à boucliers`);
  if (s.tanks >= 2 || flags.heavyArmor || flags.heavyMagicDef) {
    const it = isPhys ? (archetype === "mm-onhit" ? "demon-hunter-sword" : "malefic-roar") : "divine-glaive";
    if (archetype !== "tank" && archetype !== "support") apply(it, "Pénétration / dégâts en % PV contre une équipe résistante.", flags.heavyArmor || flags.heavyMagicDef ? "défenses adverses élevées" : `${s.tanks} héros très résistants`);
  }
  if (s.physical >= 3) {
    const it = squishy ? (hero.damage === "M" ? "winter-crown" : "wind-of-nature") : s.burst >= 2 ? "twilight-armor" : "antique-cuirass";
    apply(it, "Dégâts adverses majoritairement physiques.", `${s.physical} source(s) physique(s)`);
  }
  if (s.magic >= 3) {
    const it = squishy ? (isPhys ? "rose-gold-meteor" : "athenas-shield") : "athenas-shield";
    apply(it, "Dégâts adverses majoritairement magiques.", `${s.magic} source(s) magique(s)`);
  }
  if (s.burst >= 2 && squishy) apply("immortality", "Survie face à plusieurs menaces de burst.", `${s.burst} héros à fort burst`);
  if (s.cc >= 10 && adapted[0] !== "tough-boots") {
    changes.push({ add: "tough-boots", replace: adapted[0], reason: "Beaucoup de contrôles adverses : bottes de résistance.", trigger: `contrôle adverse cumulé ${s.cc}` });
    adapted[0] = "tough-boots";
  }

  let spell = { slug: "flicker", reason: "Polyvalent : engage ou fuite." };
  if (lane === "jungle") spell = { slug: "retribution", reason: "Indispensable en jungle." };
  else if (s.cc >= 10 && squishy) spell = { slug: "purify", reason: "Composition adverse riche en contrôles." };
  else if (s.burst >= 2 && squishy) spell = { slug: "aegis", reason: "Bouclier contre le burst adverse." };
  else if (archetype === "tank") spell = { slug: hero.profile?.tags.includes("engage") ? "flicker" : "vengeance", reason: "Engage ou encaisse en première ligne." };
  else if (archetype === "fighter-phys" && lane === "exp") spell = { slug: s.mobile >= 2 ? "petrify" : "vengeance", reason: s.mobile >= 2 ? "Contrôle les adversaires mobiles." : "Punit les engages au contact." };
  else if (archetype.startsWith("mm")) spell = { slug: s.mobile >= 2 ? "flicker" : "inspire", reason: s.mobile >= 2 ? "Échappe aux plongeurs mobiles." : "Maximise les dégâts soutenus." };

  return { archetype, base: baseItems, adapted, changes, spell, enemySummary: s };
}

export const EMBLEM_BY_ARCHETYPE: Record<Archetype, { emblem: string; talents: [string, string, string]; why: string }> = {
  "mm-crit": { emblem: "marksman", talents: ["Swift", "Weapons Master", "Weakness Finder"], why: "Vitesse d'attaque et contrôle à l'impact." },
  "mm-onhit": { emblem: "marksman", talents: ["Swift", "Weapons Master", "Quantum Charge"], why: "Sustain et mobilité en combat soutenu." },
  "mm-magic": { emblem: "mage", talents: ["Rupture", "Weapons Master", "Lethal Ignition"], why: "Pénétration et burst magique." },
  "mage-burst": { emblem: "mage", talents: ["Rupture", "Weapons Master", "Lethal Ignition"], why: "Maximise le burst." },
  "mage-melee": { emblem: "mage", talents: ["Inspire", "Festival of Blood", "Impure Rage"], why: "Recharges et sustain au contact." },
  "assassin-phys": { emblem: "assassin", talents: ["Rupture", "Master Assassin", "Killing Spree"], why: "Élimination de cibles isolées et enchaînement." },
  "assassin-magic": { emblem: "assassin", talents: ["Rupture", "Master Assassin", "Lethal Ignition"], why: "Burst magique sur cible isolée." },
  "fighter-phys": { emblem: "fighter", talents: ["Firmness", "Festival of Blood", "Brave Smite"], why: "Durabilité et sustain en échange." },
  "fighter-magic": { emblem: "fighter", talents: ["Firmness", "Festival of Blood", "Brave Smite"], why: "Durabilité et sustain en échange." },
  tank: { emblem: "tank", talents: ["Vitality", "Tenacity", "Concussive Blast"], why: "PV, survie et dégâts de zone." },
  support: { emblem: "support", talents: ["Agility", "Pull Yourself Together", "Focusing Mark"], why: "Rotations et amplification des dégâts alliés." },
};

const dummy = (damage: "P" | "M", extra: Partial<NonNullable<Hero["profile"]>> = {}): Hero => ({
  slug: `dummy-${damage}-${Math.random()}`,
  name: "—",
  roles: [],
  lanes: [],
  damage,
  range: "M",
  difficulty: null,
  confidence: "low",
  incomplete: false,
  portraitUrl: null,
  profile: { cc: 0, mobility: 0, durability: 1, engage: 0, peel: 0, burst: 0, sustain: 0, early: 0, mid: 0, late: 0, tags: [], ...extra },
  sourceId: "computed",
  updatedAt: "",
});

export interface EditorialBuild {
  type: "base" | "anti-physical" | "anti-magic" | "situational";
  title: string;
  items: string[];
  notes: string;
}

/** Variantes éditoriales dérivées de l'archétype du héros (non statistiques). */
export function editorialVariants(hero: Hero, lane: Lane | null = (hero.lanes[0] as Lane) ?? null): EditorialBuild[] {
  const arche = archetypeOf(hero);
  const base = ARCHETYPE_ITEMS[arche];
  const phys = adaptBuild(hero, [dummy("P"), dummy("P"), dummy("P")], lane);
  const mag = adaptBuild(hero, [dummy("M"), dummy("M"), dummy("M")], lane);
  const sit = adaptBuild(hero, [dummy("P", { sustain: 3, tags: ["heal"] }), dummy("M", { durability: 3 }), dummy("P", { durability: 3 })], lane);
  const why = (r: AdaptiveResult) => r.changes.map((c) => c.reason).join(" ") || "Aucun changement nécessaire.";
  return [
    { type: "base", title: `Base – ${ARCHETYPE_FR[arche]}`, items: base, notes: "Modèle éditorial de l'archétype : point de départ à ajuster selon la partie." },
    { type: "anti-physical", title: "Contre une composition physique", items: phys.adapted, notes: why(phys) },
    { type: "anti-magic", title: "Contre une composition magique", items: mag.adapted, notes: why(mag) },
    { type: "situational", title: "Situationnel : soins + tanks adverses", items: sit.adapted, notes: why(sit) },
  ];
}
