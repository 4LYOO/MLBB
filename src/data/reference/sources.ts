import type { Source } from "@/lib/domain";

/**
 * Registre des sources. Base : dossier de référence « MLBB-sources-2026.zip »
 * (rapport du 8 novembre 2026, notes /10 converties en fiabilité /5),
 * complété par la vérification d'accès effectuée le 2026-11-08.
 */
export const VERIFIED_ON = "2026-11-08";
export const REFERENCE_PATCH = "2.2.16a";
export const REFERENCE_SEASON = "Season 42";

type S = Omit<Source, "lastSyncAt">;

export const SOURCES: S[] = [
  {
    id: "editorial",
    name: "Référentiel éditorial MLBB Companion",
    kind: "editorial",
    url: null,
    reliability: 3,
    access: "Intégré à l'application.",
    terms: "—",
    notes:
      "Rôles, lanes, profils qualitatifs (0–3) et catalogue d'objets sans prix ni statistiques. Estimations d'expert à valider ; aucune statistique.",
  },
  {
    id: "computed",
    name: "Analyses calculées par l'application",
    kind: "computed",
    url: null,
    reliability: 3,
    access: "Calcul local.",
    terms: "—",
    notes: "Tier lists, scores de draft, tendances, coach. Recalculées à partir des données disponibles ; ce sont des estimations.",
  },
  {
    id: "manual",
    name: "Saisie manuelle (toi)",
    kind: "manual",
    url: null,
    reliability: 4,
    access: "Formulaires de l'application.",
    terms: "—",
    notes: "Profil, parties, notes personnelles, drafts sauvegardées.",
  },
  {
    id: "file-import",
    name: "Import de fichier (paquet mlbb-companion/v1)",
    kind: "statistical",
    url: null,
    reliability: 3,
    access: "Page Sources & données (fichier, collage) ou dossier data/imports/ du dépôt.",
    terms: "Tu es responsable du respect des conditions de la source d'origine indiquée dans le fichier.",
    notes: "Chaque enregistrement importé conserve la source d'origine, la date de capture et la période déclarées dans le fichier.",
  },
  {
    id: "mlbbhub",
    name: "MLBBHub",
    kind: "statistical",
    url: "https://mlbbhub.com/statistics",
    reliability: 5,
    access: "Accessible (HTTP 200) une fois l'hôte autorisé dans l'environnement.",
    terms:
      "CGU §4 : « Automated scraping, data mining, or extraction of content from the site without written permission is strictly prohibited ». robots.txt : Disallow /api/. → Aucun connecteur automatique (revérifié le 8 nov. 2026 à la demande de l'utilisateur : conditions inchangées). Import manuel par copier-coller depuis la page Sources, ou autorisation écrite à obtenir.",
    notes:
      "Meilleure source ranked selon le rapport (9/10) : WR/PR/BR, tendance 7 j, filtres Epic → Mythical Glory, counters, matchups. Données annoncées issues des API officielles Moonton (GMS/MAPI). Pas de Mythical Immortal, pas de séparation par lane ni par serveur.",
  },
  {
    id: "mlbbio",
    name: "mlbb.io",
    kind: "statistical",
    url: "https://mlbb.io/en/hero-statistics",
    reliability: 4,
    access: "Accessible (HTTP 200). robots.txt : Allow /.",
    terms:
      "Aucune page de CGU trouvée (seule une politique de confidentialité). Le site indique « Hero data sourced from the official Mobile Legends Bang Bang website ». Connecteur activé à la demande de l'utilisateur (8 nov. 2026) : synchronisé par GitHub Actions toutes les 12 h (pages publiques, requêtes espacées, User-Agent identifiable).",
    notes:
      "Stats par rang × période (1/3/7/15/30 j), compétences, statistiques de base, counters/synergies, consensus emblème/sort avec taille d'échantillon. Builds communautaires datées.",
  },
  {
    id: "moonton",
    name: "Moonton – mobilelegends.com (officiel)",
    kind: "official",
    url: "https://www.mobilelegends.com",
    reliability: 4,
    access: "mobilelegends.com redirige vers www.mobilelegends.com (hôte non autorisé dans l'environnement de développement, non testé).",
    terms: "Aucune API publique documentée. Le rapport signale des erreurs d'affichage (ban rate > 100 %).",
    notes: "Source primaire des statistiques (page « Rank »). Connecteur préparé, à configurer si un accès officiel existe (MOONTON_API_BASE).",
  },
  {
    id: "liquipedia",
    name: "Liquipedia MLBB",
    kind: "community",
    url: "https://liquipedia.net/mobilelegends/",
    reliability: 5,
    access: "Accessible ; l'API MediaWiki exige un User-Agent identifiable et la compression gzip (réponse 406 sinon).",
    terms: "Contenu sous licence CC BY-SA ; règles d'utilisation de l'API (débit limité, attribution).",
    notes: "Référence e-sport : picks, bans, WR, présence par tournoi. Connecteur préparé (LIQUIPEDIA_USER_AGENT).",
  },
  {
    id: "titosenpai",
    name: "TitoSenpai",
    kind: "community",
    url: "https://titosenpai.com/builds",
    reliability: 3,
    access: "Accessible (HTTP 200). robots.txt : Allow / (sauf comptes/recherche).",
    terms: "CGU non vérifiées.",
    notes: "Items cœur, emblème, sort par héros et lane avec taux d'utilisation et WR. Date non vérifiée.",
  },
  {
    id: "fandom",
    name: "Mobile Legends Wiki (Fandom)",
    kind: "community",
    url: "https://mobile-legends.fandom.com",
    reliability: 2,
    access: "Bloqué par une vérification Cloudflare pour les clients automatisés.",
    terms: "Contenu CC BY-SA.",
    notes: "Historique des patch notes. Consultation manuelle.",
  },
  {
    id: "reddit",
    name: "r/MobileLegendsGame",
    kind: "community",
    url: "https://www.reddit.com/r/MobileLegendsGame/",
    reliability: 4,
    access: "Non testé (hôte non autorisé).",
    terms: "API Reddit soumise à authentification et conditions.",
    notes: "Patch notes le jour même (serveur officiel et avancé), tier list épinglée haut niveau.",
  },
];

/** Liens externes du dossier de référence, classés par usage (affichés dans Sources & Guides). */
export const REFERENCE_LINKS: { category: string; name: string; url: string; rating: number | null; note: string }[] = [
  { category: "Statistiques ranked", name: "MLBBHub – Statistics", url: "https://mlbbhub.com/statistics", rating: 9, note: "WR/PR/BR, 7 jours glissants, filtre par rang" },
  { category: "Statistiques ranked", name: "mlbb.io – Hero statistics", url: "https://mlbb.io/en/hero-statistics", rating: 7, note: "Recoupement" },
  { category: "Statistiques ranked", name: "MLBB.GG", url: "https://mlbb.gg/about-us", rating: 6, note: "Tier list auto-générée (non vérifiée)" },
  { category: "Builds", name: "mlbb.io – builds par héros", url: "https://mlbb.io/en/hero/alpha/build", rating: 8, note: "Builds agrégées avec échantillon" },
  { category: "Builds", name: "MLBBHub – galerie de builds", url: "https://mlbbhub.com/builds", rating: 8, note: "Variantes par rôle" },
  { category: "Builds", name: "TitoSenpai – builds", url: "https://titosenpai.com/builds", rating: 7, note: "Items cœur avec WR" },
  { category: "Emblèmes", name: "MLBBHub – guide emblèmes 2026", url: "https://mlbbhub.com/news/mlbb-emblem-guide-2026-best-sets-every-role", rating: 6, note: "À revérifier" },
  { category: "Tier lists", name: "MLBBHub – Tier list", url: "https://mlbbhub.com/tier-list", rating: 9, note: "Filtrer par ton rang" },
  { category: "Tier lists", name: "Playnews.gg (FR)", url: "https://www.playnews.gg/guides/mlbb-tier-list-marksman-du-patch-2-1-90-juillet-2026", rating: 6, note: "Média francophone" },
  { category: "Counters", name: "MLBBHub – Counter picker", url: "https://mlbbhub.com/counter", rating: 9, note: "Gain de WR par matchup (pp)" },
  { category: "Counters", name: "MLBBHub – Matchup matrix", url: "https://mlbbhub.com/matchups", rating: 8, note: "Grille héros contre héros" },
  { category: "Draft", name: "MLBBHub – Draft simulator", url: "https://mlbbhub.com/draft-simulator", rating: 8, note: "Mode ranked et MPL" },
  { category: "Draft", name: "MLBBHub – Lineup Maker", url: "https://mlbbhub.com/lineup-maker", rating: 7, note: "Synergies, chaîne de CC" },
  { category: "Draft", name: "MLBBHub – Guide draft ranked 2026", url: "https://mlbbhub.com/news/mlbb-draft-guide-tips-ranked-2026", rating: 6, note: "Priorités de ban" },
  { category: "E-sport", name: "Liquipedia MLBB", url: "https://liquipedia.net/mobilelegends/MPL/Philippines/Season_18", rating: 9, note: "Picks/bans/WR pro" },
  { category: "E-sport", name: "MLBBHub – MPL stats", url: "https://mlbbhub.com/mpl/id/stats", rating: 8, note: "Source Liquipedia" },
  { category: "E-sport", name: "MLBBDex", url: "https://mlbbdex.com/en/esports/mpl-id-season-18", rating: 7, note: "Classements, drafts" },
  { category: "Mises à jour", name: "MLBBHub – patch notes", url: "https://mlbbhub.com/patch-notes", rating: 7, note: "Archives et serveur avancé" },
  { category: "Mises à jour", name: "mobilelegends.com", url: "https://mobilelegends.com", rating: 7, note: "Officiel" },
  { category: "Mises à jour", name: "Mobile Legends Wiki (Fandom)", url: "https://mobile-legends.fandom.com", rating: 5, note: "Historique" },
  { category: "Guides", name: "ONE Esports – guides MLBB", url: "https://www.oneesports.gg/mobile-legends/exp-laner-mobile-legends/", rating: 7, note: "Guides par rôle" },
  { category: "Guides", name: "MLBBHub – guides", url: "https://223.mlbbhub.com/guides", rating: 7, note: "Macro, laning" },
  { category: "Guides", name: "GuildOrder – priorité des objectifs", url: "https://guildorder.com/hi/games/mlbb/guides/objective-priority-turtle-lord-turret", rating: 6, note: "Tortue / Seigneur / tours" },
  { category: "Créateurs", name: "Elgin", url: "https://www.youtube.com/watch?v=_4zPvY3cxUk", rating: null, note: "Activité 2026 non vérifiée" },
  { category: "Créateurs", name: "Shinmen Takezo", url: "https://www.youtube.com/@ShinmenTakezo", rating: null, note: "Activité 2026 non vérifiée" },
  { category: "Créateurs", name: "ML Guide", url: "https://www.youtube.com/@MLGuideYT", rating: null, note: "Activité 2026 non vérifiée" },
  { category: "Créateurs", name: "Zane", url: "https://www.youtube.com/@MobaZane1", rating: null, note: "Activité 2026 non vérifiée" },
];

export const AVOID_SOURCES = [
  { name: "mobile-legends-bang-bang-wiki.pages.dev", reason: "Chiffres contradictoires, sources vagues" },
  { name: "findingdulcinea.com", reason: "Affirmations chiffrées sans source" },
  { name: "gamehub-al9.pages.dev", reason: "Guides génériques, auteur non identifiable" },
  { name: "Blogs top-up/VPN (exitlag, carry1st, u7buy, joytify, sportsdunia)", reason: "Contenu marketing, dates trompeuses" },
  { name: "Blogs sur domaines universitaires détournés", reason: "Spam SEO" },
];
