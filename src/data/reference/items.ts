/**
 * CATALOGUE ÉDITORIAL DES ÉQUIPEMENTS — source « editorial ».
 *
 * Ne contient que des informations stables : nom, catégorie et rôle tactique de
 * l'objet (étiquettes). Les PRIX, STATISTIQUES et PASSIFS changent à chaque patch :
 * ils sont volontairement absents (« Donnée indisponible ») tant qu'une source
 * n'a pas été importée.
 */

export type ItemCategory = "attack" | "magic" | "defense" | "movement" | "jungle" | "roam";
export const ITEM_CATEGORY_FR: Record<ItemCategory, string> = {
  attack: "Attaque",
  magic: "Magie",
  defense: "Défense",
  movement: "Mouvement",
  jungle: "Jungle",
  roam: "Roam",
};

export const ITEM_TAGS = {
  physatk: "Attaque physique",
  magpow: "Pouvoir magique",
  crit: "Critique",
  atkspd: "Vitesse d'attaque",
  lifesteal: "Vol de vie",
  spellvamp: "Vampirisme de sort",
  physpen: "Pénétration physique",
  magpen: "Pénétration magique",
  antiheal: "Réduction de soins",
  physdef: "Défense physique",
  magdef: "Défense magique",
  hp: "PV",
  cdr: "Réduction des temps de recharge",
  antiburst: "Anti-burst / survie",
  antiatkspd: "Réduit la vitesse d'attaque adverse",
  antishield: "Contre les boucliers",
  slow: "Ralentissement",
  mana: "Mana / régénération",
  ms: "Vitesse de déplacement",
  antitank: "Anti-tank (% PV)",
} as const;
export type ItemTag = keyof typeof ITEM_TAGS;

export interface EditorialItem {
  slug: string;
  name: string;
  category: ItemCategory;
  tags: ItemTag[];
  use: string; // raison d'utilisation (qualitative)
}

const I = (slug: string, name: string, category: ItemCategory, tags: ItemTag[], use: string): EditorialItem => ({
  slug,
  name,
  category,
  tags,
  use,
});

export const EDITORIAL_ITEMS: EditorialItem[] = [
  // Attaque
  I("blade-of-despair", "Blade of Despair", "attack", ["physatk"], "Gros pic d'attaque physique pour finir les cibles affaiblies."),
  I("berserkers-fury", "Berserker's Fury", "attack", ["physatk", "crit"], "Cœur des builds critiques de tireurs."),
  I("windtalker", "Windtalker", "attack", ["atkspd", "ms"], "Vitesse d'attaque et dégâts de zone sur attaques de base."),
  I("corrosion-scythe", "Corrosion Scythe", "attack", ["atkspd", "slow"], "Vitesse d'attaque et ralentissement sur attaques de base."),
  I("haass-claws", "Haas's Claws", "attack", ["lifesteal", "crit"], "Vol de vie pour tireurs et combattants à attaques de base."),
  I("malefic-roar", "Malefic Roar", "attack", ["physatk", "physpen"], "Pénétration physique contre les cibles très résistantes."),
  I("demon-hunter-sword", "Demon Hunter Sword", "attack", ["atkspd", "antitank"], "Dégâts en % des PV contre les tanks."),
  I("golden-staff", "Golden Staff", "attack", ["atkspd"], "Synergie avec les effets à l'impact."),
  I("bloodlust-axe", "Bloodlust Axe", "attack", ["spellvamp", "cdr"], "Sustain via vampirisme de sort pour combattants."),
  I("hunter-strike", "Hunter Strike", "attack", ["physatk", "cdr", "physpen", "ms"], "Pénétration et poursuite en début de partie."),
  I("blade-of-the-heptaseas", "Blade of the Heptaseas", "attack", ["physatk", "physpen"], "Burst en embuscade pour assassins physiques."),
  I("great-dragon-spear", "Great Dragon Spear", "attack", ["physatk", "crit", "cdr", "ms"], "Critique et mobilité après l'ultime."),
  I("endless-battle", "Endless Battle", "attack", ["physatk", "cdr", "ms"], "Polyvalence pour combattants à compétences."),
  I("rose-gold-meteor", "Rose Gold Meteor", "attack", ["physatk", "magdef", "antiburst"], "Bouclier anti-burst magique."),
  I("sea-halberd", "Sea Halberd", "attack", ["physatk", "antiheal"], "Réduction de soins côté physique."),
  I("war-axe", "War Axe", "attack", ["physatk", "hp", "spellvamp"], "Montée en puissance en combat prolongé."),
  I("wind-of-nature", "Wind of Nature", "attack", ["physatk", "atkspd", "lifesteal", "antiburst"], "Immunité temporaire aux dégâts physiques."),
  I("malefic-gun", "Malefic Gun", "attack", ["physpen", "atkspd"], "Pénétration pour tireurs à attaques de base."),
  // Magie
  I("holy-crystal", "Holy Crystal", "magic", ["magpow"], "Gros pic de pouvoir magique pour mages burst."),
  I("blood-wings", "Blood Wings", "magic", ["magpow", "hp"], "Pouvoir magique et bouclier."),
  I("lightning-truncheon", "Lightning Truncheon", "magic", ["magpow", "mana", "cdr"], "Dégâts rebondissants pour mages burst."),
  I("concentrated-energy", "Concentrated Energy", "magic", ["magpow", "hp", "spellvamp"], "Sustain pour mages de mêlée."),
  I("genius-wand", "Genius Wand", "magic", ["magpow", "magpen", "ms"], "Pénétration magique précoce."),
  I("divine-glaive", "Divine Glaive", "magic", ["magpow", "magpen"], "Pénétration magique contre les cibles résistantes."),
  I("ice-queen-wand", "Ice Queen Wand", "magic", ["magpow", "slow", "spellvamp"], "Ralentissement et sustain sur compétences."),
  I("clock-of-destiny", "Clock of Destiny", "magic", ["magpow", "hp", "mana"], "Montée en puissance avec le temps."),
  I("glowing-wand", "Glowing Wand", "magic", ["magpow", "antiheal", "antitank"], "Brûlure en % des PV et réduction de soins."),
  I("fleeting-time", "Fleeting Time", "magic", ["magpow", "cdr"], "Réduit le temps de recharge de l'ultime."),
  I("starlium-scythe", "Starlium Scythe", "magic", ["magpow", "spellvamp"], "Dégâts vrais bonus après compétence."),
  I("enchanted-talisman", "Enchanted Talisman", "magic", ["magpow", "cdr", "mana"], "Réduction de recharge et mana."),
  I("winter-crown", "Winter Crown", "magic", ["magpow", "physdef", "antiburst"], "Gel temporaire pour éviter un burst."),
  I("feather-of-heaven", "Feather of Heaven", "magic", ["magpow", "atkspd"], "Pour héros magiques à attaques de base."),
  // Défense
  I("antique-cuirass", "Antique Cuirass", "defense", ["physdef", "hp"], "Réduit l'attaque physique des ennemis touchés."),
  I("athenas-shield", "Athena's Shield", "defense", ["magdef", "hp", "antiburst"], "Bouclier contre le burst magique."),
  I("blade-armor", "Blade Armor", "defense", ["physdef"], "Renvoie les dégâts des attaques de base."),
  I("brute-force-breastplate", "Brute Force Breastplate", "defense", ["physdef", "magdef", "ms"], "Cumul de défenses en combat."),
  I("cursed-helmet", "Cursed Helmet", "defense", ["hp", "magdef"], "Dégâts de zone passifs pour tanks (vague, teamfight)."),
  I("dominance-ice", "Dominance Ice", "defense", ["physdef", "antiheal", "antiatkspd", "antishield"], "Anti-soins, anti-bouclier et anti-vitesse d'attaque."),
  I("guardian-helmet", "Guardian Helmet", "defense", ["hp"], "Régénération massive hors combat."),
  I("immortality", "Immortality", "defense", ["hp", "physdef"], "Résurrection : contre le burst et les picks."),
  I("oracle", "Oracle", "defense", ["magdef", "hp", "cdr"], "Augmente les soins et boucliers reçus."),
  I("queens-wings", "Queen's Wings", "defense", ["hp", "spellvamp", "antiburst"], "Réduction de dégâts à faible PV."),
  I("radiant-armor", "Radiant Armor", "defense", ["magdef", "hp"], "Résistance cumulative aux dégâts magiques continus."),
  I("thunder-belt", "Thunder Belt", "defense", ["hp", "physdef", "mana"], "Dégâts vrais et ralentissement après compétence."),
  I("twilight-armor", "Twilight Armor", "defense", ["hp", "physdef", "antiburst"], "Plafonne les gros coups physiques (critiques)."),
  // Mouvement
  I("arcane-boots", "Arcane Boots", "movement", ["magpen", "ms"], "Pénétration magique (mages)."),
  I("demon-shoes", "Demon Shoes", "movement", ["mana", "ms"], "Régénération de mana."),
  I("magic-shoes", "Magic Shoes", "movement", ["cdr", "ms"], "Réduction des temps de recharge."),
  I("rapid-boots", "Rapid Boots", "movement", ["ms"], "Vitesse hors combat pour rotations."),
  I("swift-boots", "Swift Boots", "movement", ["atkspd", "ms"], "Vitesse d'attaque (tireurs)."),
  I("tough-boots", "Tough Boots", "movement", ["magdef", "ms"], "Défense magique et résistance aux contrôles."),
  I("warrior-boots", "Warrior Boots", "movement", ["physdef", "ms"], "Défense physique."),
];

// --- Sorts de combat (Battle Spells) ---
export interface EditorialSpell {
  slug: string;
  name: string;
  nameFr: string;
  use: string;
  roles: string[];
}

export const EDITORIAL_SPELLS: EditorialSpell[] = [
  { slug: "retribution", name: "Retribution", nameFr: "Châtiment", use: "Obligatoire en jungle : sécurise monstres, Tortue et Seigneur.", roles: ["jungle"] },
  { slug: "flicker", name: "Flicker", nameFr: "Éclair", use: "Mobilité instantanée : engage, fuite, repositionnement.", roles: ["Tank", "Support", "Mage", "Marksman", "Fighter"] },
  { slug: "execute", name: "Execute", nameFr: "Exécution", use: "Achève une cible à faibles PV.", roles: ["Fighter", "Assassin"] },
  { slug: "inspire", name: "Inspire", nameFr: "Inspiration", use: "Pic de vitesse d'attaque pour attaques de base.", roles: ["Marksman", "Fighter"] },
  { slug: "sprint", name: "Sprint", nameFr: "Sprint", use: "Vitesse de déplacement : poursuite ou fuite.", roles: ["Fighter", "Marksman"] },
  { slug: "revitalize", name: "Revitalize", nameFr: "Revitalisation", use: "Zone de soin : sustain d'équipe.", roles: ["Support"] },
  { slug: "aegis", name: "Aegis", nameFr: "Égide", use: "Bouclier contre le burst.", roles: ["Marksman", "Mage", "Tank"] },
  { slug: "petrify", name: "Petrify", nameFr: "Pétrification", use: "Contrôle de zone supplémentaire au contact.", roles: ["Tank", "Fighter"] },
  { slug: "purify", name: "Purify", nameFr: "Purification", use: "Supprime les contrôles : contre les compositions à CC.", roles: ["Marksman", "Mage", "Fighter"] },
  { slug: "flameshot", name: "Flameshot", nameFr: "Tir enflammé", use: "Achève ou repousse un plongeur à distance.", roles: ["Mage", "Marksman"] },
  { slug: "vengeance", name: "Vengeance", nameFr: "Vengeance", use: "Renvoie les dégâts en plongée.", roles: ["Tank", "Fighter"] },
  { slug: "arrival", name: "Arrival", nameFr: "Arrivée", use: "Téléportation vers une structure/sbire allié : split push.", roles: ["Fighter", "Tank"] },
];

// --- Emblèmes ---
// Les 7 emblèmes principaux sont stables. Les talents ont été remaniés plusieurs fois :
// la liste ci-dessous correspond au système connu (2023–2025) et doit être revérifiée
// contre le patch courant (cf. guide emblèmes 2026 listé dans les sources).
export const EDITORIAL_EMBLEMS = [
  { slug: "common", name: "Common", nameFr: "Commun", roles: ["Tous"] },
  { slug: "tank", name: "Tank", nameFr: "Tank", roles: ["Tank", "Support"] },
  { slug: "assassin", name: "Assassin", nameFr: "Assassin", roles: ["Assassin", "Fighter"] },
  { slug: "mage", name: "Mage", nameFr: "Mage", roles: ["Mage"] },
  { slug: "fighter", name: "Fighter", nameFr: "Combattant", roles: ["Fighter"] },
  { slug: "support", name: "Support", nameFr: "Support", roles: ["Support"] },
  { slug: "marksman", name: "Marksman", nameFr: "Tireur", roles: ["Marksman"] },
] as const;

export const EDITORIAL_TALENTS: { tier: 1 | 2 | 3; name: string; use: string }[] = [
  { tier: 1, name: "Agility", use: "Vitesse de déplacement." },
  { tier: 1, name: "Firmness", use: "Défenses hybrides." },
  { tier: 1, name: "Rupture", use: "Pénétration adaptative." },
  { tier: 1, name: "Inspire", use: "Réduction des temps de recharge." },
  { tier: 1, name: "Swift", use: "Vitesse d'attaque." },
  { tier: 1, name: "Vitality", use: "PV." },
  { tier: 2, name: "Weapons Master", use: "Bonus de statistiques des équipements." },
  { tier: 2, name: "Festival of Blood", use: "Vampirisme de sort cumulatif." },
  { tier: 2, name: "Wilderness Blessing", use: "Vitesse dans la rivière / jungle." },
  { tier: 2, name: "Seasoned Hunter", use: "Dégâts sur Tortue et Seigneur." },
  { tier: 2, name: "Tenacity", use: "Défenses bonus à faibles PV." },
  { tier: 2, name: "Pull Yourself Together", use: "Réduction de recharge des sorts et objets actifs." },
  { tier: 2, name: "Master Assassin", use: "Bonus contre une cible isolée." },
  { tier: 3, name: "Lethal Ignition", use: "Brûlure burst après plusieurs coups (mages, assassins)." },
  { tier: 3, name: "Impure Rage", use: "Dégâts et mana sur compétences (mages)." },
  { tier: 3, name: "Killing Spree", use: "Soin et vitesse après un kill." },
  { tier: 3, name: "Brave Smite", use: "Soin en infligeant des dégâts de compétence (combattants, tanks)." },
  { tier: 3, name: "Concussive Blast", use: "Dégâts de zone sur attaques (tanks)." },
  { tier: 3, name: "Quantum Charge", use: "Vitesse et soin sur attaques de base." },
  { tier: 3, name: "War Cry", use: "Bonus de dégâts en combat prolongé." },
  { tier: 3, name: "Temporal Reign", use: "Réduction de recharge après l'ultime." },
  { tier: 3, name: "Focusing Mark", use: "Les alliés infligent plus de dégâts à la cible (supports)." },
  { tier: 3, name: "Weakness Finder", use: "Ralentit sur attaques de base (tireurs)." },
];
