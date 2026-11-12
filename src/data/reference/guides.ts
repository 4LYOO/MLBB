/**
 * BASE DE CONNAISSANCES — guides rédigés pour MLBB Companion (source « editorial »).
 * Principes stratégiques généraux, sans statistiques ni timers chiffrés
 * (les timers d'objectifs changent avec les patchs : se référer aux patch notes).
 */

export interface Guide {
  slug: string;
  title: string;
  category: "Draft" | "Macro" | "Rôle" | "Méthode" | "Builds";
  roles: string[];
  heroes: string[];
  summary: string;
  body: string[]; // paragraphes / puces
  links: { name: string; url: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "fondamentaux-draft",
    title: "Les fondamentaux d'une bonne draft",
    category: "Draft",
    roles: [],
    heroes: [],
    summary: "Les cinq vérifications à faire avant de verrouiller le dernier pick.",
    body: [
      "Couvre les cinq lanes : EXP, Mid, Gold, Jungle, Roam. Une lane orpheline coûte de l'expérience et de l'or à toute l'équipe.",
      "Équilibre les dégâts : vise au moins deux sources physiques et deux magiques, sinon l'adversaire achète une seule défense et neutralise ta composition.",
      "Vérifie la frontline : il faut au moins un héros capable d'encaisser l'engage adverse et de prendre la vision.",
      "Construis une chaîne de contrôle : plusieurs contrôles qui s'enchaînent valent mieux qu'un seul gros contrôle facilement évitable.",
      "Définis ta condition de victoire avant le dernier pick : début de partie agressif, teamfight autour des objectifs, ou scaling vers la fin de partie.",
    ],
    links: [{ name: "MLBBHub – Guide draft ranked 2026", url: "https://mlbbhub.com/news/mlbb-draft-guide-tips-ranked-2026" }],
  },
  {
    slug: "bans-ranked",
    title: "Prioriser ses bans en ranked",
    category: "Draft",
    roles: [],
    heroes: [],
    summary: "Bannir ce qui punit ta composition, pas seulement ce qui est populaire.",
    body: [
      "En ranked (Epic et plus), les bans sont simultanés et à l'aveugle : plusieurs joueurs peuvent bannir le même héros. Coordonne-toi dans le chat de pré-draft.",
      "Bannis d'abord les héros à la fois très présents (pick + ban) et au win rate élevé dans TON rang : une stat « tous rangs » ne dit rien de Mythical Glory.",
      "Un héros à win rate très élevé mais à pick rate très bas reflète souvent des spécialistes : ce n'est pas forcément un ban prioritaire.",
      "Si ton équipe dépend d'un héros fragile et immobile, bannis en priorité les assassins capables de l'atteindre.",
    ],
    links: [{ name: "MLBBHub – Tier list", url: "https://mlbbhub.com/tier-list" }],
  },
  {
    slug: "pieges-counter-pick",
    title: "Les pièges du counter-pick",
    category: "Draft",
    roles: [],
    heroes: [],
    summary: "Un counter de lane peut casser ta composition d'équipe.",
    body: [
      "Choisis pour l'équipe d'abord : un counter direct qui laisse ta composition sans frontline ou sans dégâts magiques est souvent un mauvais choix.",
      "Un écart de matchup de +2,4 points signifie que le duel penche de 2,4 points vers ce héros ; ce n'est pas un win rate. En dessous de +2,5 points, l'avantage est léger.",
      "Les derniers picks peuvent counter ; les premiers picks doivent rester flexibles (plusieurs lanes) et difficiles à punir.",
    ],
    links: [{ name: "MLBBHub – Counter picker", url: "https://mlbbhub.com/counter" }],
  },
  {
    slug: "objectifs-tortue-seigneur",
    title: "Tortue, Seigneur et tours : quand jouer l'objectif",
    category: "Macro",
    roles: ["Tank", "Support", "Assassin"],
    heroes: [],
    summary: "Jouer l'objectif seulement quand l'information et le nombre sont de ton côté.",
    body: [
      "Avant chaque objectif, vérifie : position du jungler adverse, sorts clés adverses (Châtiment), avantage numérique.",
      "Un kill sur le jungler adverse ou sur deux héros ouvre une fenêtre d'objectif ; sans cette fenêtre, prends plutôt la vision et les camps.",
      "Une tour détruite donne de l'espace de carte durable : souvent plus rentable qu'un objectif contesté à l'aveugle.",
      "Les timers d'apparition évoluent selon les patchs : vérifie-les dans les patch notes en cours.",
    ],
    links: [
      { name: "GuildOrder – priorité Turtle/Lord/tour", url: "https://guildorder.com/hi/games/mlbb/guides/objective-priority-turtle-lord-turret" },
      { name: "ONE Esports – guides MLBB", url: "https://www.oneesports.gg/mobile-legends/exp-laner-mobile-legends/" },
    ],
  },
  {
    slug: "roam-vision",
    title: "Roam : vision, rotations et protection",
    category: "Rôle",
    roles: ["Tank", "Support"],
    heroes: ["tigreal", "khufra", "atlas", "franco", "angela", "estes", "rafaela", "diggie", "floryn"],
    summary: "Le roamer fait gagner la carte avant de faire gagner les combats.",
    body: [
      "Rejoins la lane qui a un objectif ou un kill à prendre ; évite de rester inactif derrière ton tireur.",
      "Prends la vision dans la jungle adverse avant les objectifs, jamais seul sans information.",
      "En teamfight, choisis : soit tu engages sur la cible prioritaire, soit tu protèges ton carry. Faire les deux à moitié est le pire choix.",
    ],
    links: [{ name: "MLBBHub – guides", url: "https://223.mlbbhub.com/guides" }],
  },
  {
    slug: "jungle-tempo",
    title: "Jungle : tempo et premiers objectifs",
    category: "Rôle",
    roles: ["Assassin", "Fighter"],
    heroes: ["fanny", "ling", "hayabusa", "lancelot", "karina", "aamon", "alpha", "balmond"],
    summary: "Ton chemin de jungle dicte le rythme de toute la partie.",
    body: [
      "Planifie ton chemin en fonction de la lane la plus susceptible de gagner un combat à deux.",
      "Ne force pas un gank sur une lane sans contrôle : préfère contre-jungler ou sécuriser la Tortue.",
      "Garde Châtiment pour les objectifs disputés plutôt que pour un camp ordinaire.",
    ],
    links: [{ name: "ONE Esports – guides MLBB", url: "https://www.oneesports.gg/mobile-legends/exp-laner-mobile-legends/" }],
  },
  {
    slug: "gold-lane",
    title: "Gold Lane : survivre puis dominer",
    category: "Rôle",
    roles: ["Marksman"],
    heroes: ["miya", "layla", "claude", "karrie", "bruno", "brody", "beatrix", "moskov", "harith", "ixia"],
    summary: "Ton or est la ressource la plus précieuse de l'équipe.",
    body: [
      "Priorise le farm et la vague : chaque mort en début de partie retarde ton pic de puissance.",
      "En teamfight, frappe la cible la plus proche en sécurité plutôt que de plonger sur la backline.",
      "Adapte tes défenses : un objet défensif tôt contre un assassin qui te cible vaut mieux qu'un objet de dégâts inutilisé.",
    ],
    links: [{ name: "Playnews.gg – tier list tireurs", url: "https://www.playnews.gg/guides/mlbb-tier-list-marksman-du-patch-2-1-90-juillet-2026" }],
  },
  {
    slug: "exp-lane",
    title: "EXP Lane : gérer le duel et le split push",
    category: "Rôle",
    roles: ["Fighter", "Tank"],
    heroes: ["yu-zhong", "thamuz", "esmeralda", "x-borg", "terizla", "khaleed", "masha", "sun", "zilong"],
    summary: "Gagner le duel compte moins que l'impact sur la Tortue et les combats.",
    body: [
      "Identifie ton matchup : si tu es contré, joue la vague et le farm plutôt que les échanges.",
      "Rejoins les combats autour de la Tortue quand ta vague est poussée.",
      "Le split push n'est rentable que si ton équipe peut tenir à quatre sans toi.",
    ],
    links: [{ name: "ONE Esports – EXP laner", url: "https://www.oneesports.gg/mobile-legends/exp-laner-mobile-legends/" }],
  },
  {
    slug: "mid-lane",
    title: "Mid Lane : rotations et contrôle de zone",
    category: "Rôle",
    roles: ["Mage"],
    heroes: ["pharsa", "yve", "valir", "kagura", "lylia", "aurora", "odette", "valentina", "xavier"],
    summary: "Le mid sert de pivot : pousse ta vague, puis aide une autre lane.",
    body: [
      "Pousse rapidement la vague du milieu pour gagner du temps de rotation.",
      "Accompagne ton jungler sur la Tortue et contrôle la rivière.",
      "Positionne-toi derrière ta frontline : un mage mort avant le combat retire la moitié des dégâts magiques de l'équipe.",
    ],
    links: [{ name: "MLBBHub – guides", url: "https://223.mlbbhub.com/guides" }],
  },
  {
    slug: "builds-adaptatifs",
    title: "Adapter son build à la composition adverse",
    category: "Builds",
    roles: [],
    heroes: [],
    summary: "Les builds « méta » sont un point de départ, pas une règle.",
    body: [
      "Contre beaucoup de soins (soigneurs, vampirisme, auto-soins), achète tôt un objet de réduction de soins (Sea Halberd, Dominance Ice, Glowing Wand…).",
      "Contre des dégâts majoritairement physiques, privilégie Antique Cuirass, Blade Armor ou Twilight Armor ; contre des dégâts magiques, Athena's Shield ou Radiant Armor.",
      "Contre des tanks très résistants, ajoute de la pénétration (Malefic Roar, Divine Glaive) ou des dégâts en % des PV.",
      "Contre des boucliers, Dominance Ice limite leur efficacité.",
      "La page Builds propose un assistant adaptatif qui applique ces règles à la composition adverse choisie.",
    ],
    links: [{ name: "mlbb.io – builds par héros", url: "https://mlbb.io/en/hero/alpha/build" }],
  },
  {
    slug: "lire-les-stats",
    title: "Lire correctement les statistiques",
    category: "Méthode",
    roles: [],
    heroes: [],
    summary: "Win rate, pick rate, ban rate : ce qu'ils disent… et ce qu'ils ne disent pas.",
    body: [
      "Une stat « tous rangs » ne dit rien de Mythical Glory : filtre toujours par ton rang.",
      "Un win rate élevé avec un pick rate très bas reflète souvent des spécialistes (ex. relevé dans le dossier de référence : Masha, 61,4 % de WR pour 0,53 % de pick, toutes ranks, 7 jours).",
      "Les stats ranked ne sont pas séparées par lane dans les sources identifiées : un héros flex a les mêmes chiffres partout.",
      "Aucune source identifiée ne sépare solo queue et 5-stack, ni les serveurs/régions.",
      "Les statistiques pro (MPL) et ranked sont deux mondes différents.",
    ],
    links: [{ name: "MLBBHub – Statistics", url: "https://mlbbhub.com/statistics" }],
  },
  {
    slug: "methode-patch",
    title: "Suivre un patch efficacement",
    category: "Méthode",
    roles: [],
    heroes: [],
    summary: "Lire les notes, puis vérifier l'effet réel une semaine après.",
    body: [
      "Lis les patch notes le jour même (r/MobileLegendsGame publie celles du serveur officiel et du serveur avancé).",
      "Le serveur avancé est un serveur de test : ses changements ne sont pas toujours repris tels quels.",
      "Une semaine après le patch, compare la tendance sur 7 jours des héros modifiés : un buff annoncé n'est pas toujours un buff réel.",
    ],
    links: [
      { name: "MLBBHub – patch notes", url: "https://mlbbhub.com/patch-notes" },
      { name: "r/MobileLegendsGame", url: "https://www.reddit.com/r/MobileLegendsGame/" },
    ],
  },
];
