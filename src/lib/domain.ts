// Types et vocabulaire métier partagés (client + serveur).

export const ROLES = ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_FR: Record<Role, string> = {
  Tank: "Tank",
  Fighter: "Combattant",
  Assassin: "Assassin",
  Mage: "Mage",
  Marksman: "Tireur",
  Support: "Support",
};

export const ROLE_COLOR: Record<Role, string> = {
  Tank: "#38bdf8",
  Fighter: "#f97316",
  Assassin: "#a855f7",
  Mage: "#6366f1",
  Marksman: "#eab308",
  Support: "#22c55e",
};

export const LANES = ["exp", "mid", "gold", "jungle", "roam"] as const;
export type Lane = (typeof LANES)[number];

export const LANE_FR: Record<Lane, string> = {
  exp: "EXP Lane",
  mid: "Mid Lane",
  gold: "Gold Lane",
  jungle: "Jungle",
  roam: "Roam",
};

// Rangs disponibles dans les sources statistiques identifiées.
// « mythical_immortal » est listé car demandé, mais aucune source vérifiée ne le fournit.
export const RANKS = [
  "all",
  "epic",
  "legend",
  "mythic",
  "mythical_honor",
  "mythical_glory",
  "mythical_immortal",
] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_FR: Record<Rank, string> = {
  all: "Tous rangs",
  epic: "Epic",
  legend: "Legend",
  mythic: "Mythic",
  mythical_honor: "Mythical Honor",
  mythical_glory: "Mythical Glory+",
  mythical_immortal: "Mythical Immortal",
};

export const PERIODS = ["1d", "3d", "7d", "15d", "30d"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_FR: Record<Period, string> = {
  "1d": "1 jour",
  "3d": "3 jours",
  "7d": "7 jours",
  "15d": "15 jours",
  "30d": "30 jours",
};

export type DamageType = "P" | "M" | "H"; // physique / magique / hybride
export const DAMAGE_FR: Record<DamageType, string> = { P: "Physique", M: "Magique", H: "Hybride" };

export type Range = "M" | "R";
export const RANGE_FR: Record<Range, string> = { M: "Mêlée", R: "Distance" };

/** Étiquettes de mécaniques utilisées par le moteur de draft (profil éditorial). */
export const TAGS = {
  aoecc: "Contrôle de zone en teamfight",
  lockdown: "Contrôle ciblé difficile à éviter",
  antidash: "Anti-dash / anti-mobilité",
  engage: "Initiation de combat",
  dash: "Dépend des dashs/blinks",
  immune: "Fenêtres d'invulnérabilité ou d'immunité",
  heal: "Soins alliés",
  selfheal: "Auto-soins / sustain",
  shield: "Boucliers",
  poke: "Harcèlement à distance",
  antiheal: "Réduction de soins intégrée",
  antitank: "Dégâts anti-tank (% PV, vrais dégâts)",
  splitpush: "Split push",
  global: "Présence globale / rotations",
  protect: "Protection des carries",
  burst: "Burst",
  pick: "Pick-off",
  latecarry: "Carry de fin de partie",
  earlygame: "Puissant en début de partie",
  invis: "Camouflage",
  teamfightult: "Ultime de teamfight",
  antidive: "Anti-plongée",
  taunt: "Provocation",
  execute: "Exécution",
  silence: "Silence",
} as const;
export type Tag = keyof typeof TAGS;

export type Confidence = "high" | "medium" | "low";

/** Échelle 0–3 du profil éditorial. */
export interface HeroProfile {
  cc: number;
  mobility: number;
  durability: number;
  engage: number;
  peel: number;
  burst: number;
  sustain: number;
  early: number;
  mid: number;
  late: number;
  tags: Tag[];
}

export interface Hero {
  slug: string;
  name: string;
  roles: Role[];
  lanes: Lane[];
  damage: DamageType | null;
  range: Range | null;
  difficulty: number | null; // 1 facile – 3 difficile
  confidence: Confidence;
  incomplete: boolean;
  portraitUrl: string | null;
  profile: HeroProfile | null;
  sourceId: string;
  updatedAt: string;
}

export type SourceKind = "official" | "statistical" | "community" | "computed" | "manual" | "editorial";
export const SOURCE_KIND_FR: Record<SourceKind, string> = {
  official: "Donnée officielle",
  statistical: "Donnée statistique",
  community: "Donnée communautaire",
  computed: "Analyse calculée",
  manual: "Saisie manuelle",
  editorial: "Référence éditoriale",
};

export interface Source {
  id: string;
  name: string;
  kind: SourceKind;
  url: string | null;
  reliability: number; // 1–5
  access: string; // résultat de la vérification d'accès
  terms: string; // conditions d'utilisation constatées
  notes: string;
  lastSyncAt: string | null;
}

export interface HeroStat {
  slug: string;
  rank: Rank;
  period: Period;
  winRate: number;
  pickRate: number;
  banRate: number;
  sourceId: string;
  capturedAt: string;
  dataAsOf: string | null;
  patch: string | null;
}

export const TIERS = ["S+", "S", "A", "B", "C"] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_COLOR: Record<Tier, string> = {
  "S+": "#f5c542",
  S: "#f97316",
  A: "#a855f7",
  B: "#3b82f6",
  C: "#64748b",
};

export const UNAVAILABLE = "Donnée indisponible";
