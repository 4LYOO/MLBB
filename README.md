# MLBB Companion

Assistant personnel d'analyse et d'optimisation pour **Mobile Legends: Bang Bang** : méta, statistiques des héros, tier lists, simulateur de draft multicritère, builds adaptatifs, suivi de progression et coach personnel.

> Projet de fan, non affilié à Moonton. **Aucune statistique n'est inventée** : chaque chiffre vient d'une source tracée (mlbb.io, import manuel…) ; sinon l'application affiche « Donnée indisponible ». Les recommandations sont des estimations stratégiques, pas des certitudes.

---

## Démarrage rapide

Prérequis : **Node.js ≥ 20** (testé avec Node 22) et npm.

```bash
npm install          # dépendances
npm run db:init      # crée data/mlbb-companion.db et charge le référentiel
npm run data:sync    # première synchronisation mlbb.io (≈ 3 min) — sinon automatique au premier affichage
npm run dev          # http://localhost:3000
```

Production :

```bash
npm run build && npm start
```

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm test` | Tests unitaires (moteur de draft, tiers, importeur, coach, OCR, patchs) |
| `npm run lint` | Vérification TypeScript |
| `npm run db:init` / `npm run db:reset` | Crée / réinitialise la base SQLite |
| `npm run data:import` | Importe `data/imports/*.json` |
| `npm run data:import -- fichier.json` | Importe un paquet de données |
| `npm run data:import -- stats.csv --source-id=x --captured-at=2026-11-08T10:00:00Z` | Importe un CSV de statistiques |
| `npm run data:sync` | Synchronise mlbb.io au premier plan (≈ 3 min) |
| `npm run start:lan` | Serveur de production accessible depuis l'iPhone (même Wi-Fi) |
| `npm run data:status` | État des connecteurs, des statistiques et des synchronisations |

Configuration : copier `.env.example` en `.env.local` (chemin de la base, seuil d'obsolescence, connecteurs). **Aucune variable n'est exposée au navigateur.**

---

## Ce qui fonctionne immédiatement

| Page | Fonctionnel sans import | S'enrichit avec un import |
| --- | --- | --- |
| **Statistiques globales** | Nombre de héros, répartition par rôle, filtres rôle/lane/recherche, tableau triable | WR/PR/BR moyens, tops, tendances, tiers, filtres WR/PR/BR, graphiques d'évolution |
| **Méta & Tier list** | Analyse d'un héros (forces, faiblesses, counters et synergies par règles) | Tier lists globale / rôle / lane / solo queue / compétitive, tendances, changements de tier par patch |
| **Simulateur de draft** | Complet : 4 modes (libre, classé 6 bans, classé 10 bans, tournoi), côté bleu/rouge, recommandations multicritères expliquées, bans suggérés, premier pick, analyse de composition, entraînement contre l'adversaire automatique, sauvegarde, historique, comparaison | Critères statistiques et méta, matchups réels |
| **Équipements & builds** | Builds éditoriaux par archétype, **builds adaptatifs** à la compo adverse, comparaison de builds, builds personnels, emblèmes, sorts | Builds Méta/Solo/Compétitif avec échantillon, prix et stats des objets |
| **Fiches héros** (132) | Rôles, lanes, difficulté, profil, forces/faiblesses, counters/synergies, conseils, emblème, sorts | Compétences, stats de base, statistiques par rang, évolution, historique de patchs |
| **Mes statistiques** | Profil, saisie de parties, import de capture (OCR expérimental), KDA, WR par rôle/héros, graphiques, coach | — |
| **Comparateur** | Jusqu'à 4 héros : rôles, difficulté, profils, forces/faiblesses, match-up direct | WR/PR/BR, performance par rang |
| **Patch notes** | Saisie manuelle, détection automatique des héros impactés (direct + via objets) | Import de notes |
| **Base de connaissances** | 12 guides + ressources externes notées | — |
| **Favoris & historique** | Héros/guides favoris, drafts, builds, filtres sauvegardés, dernières analyses | — |
| **Sources & données** | Registre des sources, connecteurs, import JSON/CSV, couverture, journal de synchronisation | — |

Recherche globale : **Ctrl + K** (héros, builds, objets, sorts, emblèmes, talents, guides, pages).

---

## Données : d'où viennent-elles ?

L'application sépare strictement :

| Nature | Exemples | Stockage |
| --- | --- | --- |
| Référence éditoriale | Rôles, lanes, profil qualitatif 0–3 des héros, catalogue d'objets **sans prix ni stats**, guides | `src/data/reference/*` → base |
| Données statistiques | WR/PR/BR par rang × période, matchups, builds avec échantillon | Import (`hero_stats`, `matchups`, `builds`) |
| Données officielles | Prévu (connecteur Moonton) | Import |
| Données communautaires | E-sport (Liquipedia), patch notes | Import |
| Analyses calculées | Tier lists, scores de draft, tendances, coach | Calcul à la volée |
| Saisies manuelles | Profil, parties, drafts, builds perso, patchs saisis | Base locale |

Chaque enregistrement importé conserve **source, date de capture, date des données, rang, période et patch**. En cas de conflit, la capture la plus récente l'emporte, puis la source la plus fiable. Une statistique plus vieille que `STALE_AFTER_HOURS` (48 h par défaut) est signalée « potentiellement obsolète ».

Détails : [`docs/SOURCES.md`](docs/SOURCES.md) (analyse du dossier ZIP et vérification d'accès), [`docs/DATA-FORMAT.md`](docs/DATA-FORMAT.md) (format d'import), [`docs/METHODOLOGIE.md`](docs/METHODOLOGIE.md) (calculs).

### Sources branchées (8 nov. 2026)

| Source | Mode | Ce qu'elle apporte |
| --- | --- | --- |
| **mlbb.io** | **Synchronisation automatique** (bouton sur Sources, `npm run data:sync`, ou toutes les `AUTO_SYNC_HOURS` heures — 12 par défaut) | WR/PR/BR sur 6 rangs (Tous → Mythical Glory+) × 5 périodes (1 à 30 j), compétences, stats de base, counters et synergies (indice relatif), consensus emblème/talents/sort avec taille d'échantillon, objets (prix, stats, passifs), portraits |
| **MLBBHub** | **Import manuel par copier-coller** (Sources → « Import manuel par collage ») | Ses conditions d'utilisation interdisent toujours l'extraction automatisée sans autorisation écrite (revérifié le 8 nov. 2026) : tu copies le tableau dans Safari, l'appli reconnaît héros et pourcentages, tu valides l'aperçu |
| Tout autre site / fichier | Import JSON ou CSV | Format `mlbb-companion/v1` |

Le connecteur mlbb.io lit des pages publiques (robots.txt : `Allow: /`), une requête à la fois, espacées de 1,2 s, avec un User-Agent identifiable. mlbb.io n'a pas publié de conditions d'utilisation ; si l'éditeur le demande, désactive l'auto-synchro avec `AUTO_SYNC_HOURS=0`.

Dans un environnement à proxy (ex. conteneur cloud), lance Node avec `NODE_USE_ENV_PROXY=1` pour que `fetch` passe par `HTTPS_PROXY`.

---

## Utilisation sur iPhone

L'interface est pensée d'abord pour l'iPhone : thème sombre « Liquid Glass », barre d'onglets flottante (Stats, Méta, Draft, Moi, Plus), zones de sécurité (encoche, barre d'accueil), champs en 16 px (pas de zoom automatique), cibles tactiles de 44 px, listes en cartes à la place des grands tableaux.

L'application a besoin d'un serveur (Next.js + base SQLite). Deux options :

1. **Sur ton ordinateur, même Wi-Fi que l'iPhone** :
   ```bash
   npm run build && npm run start:lan     # écoute sur toutes les interfaces, port 3000
   ```
   Sur l'iPhone, ouvre `http://<adresse-IP-de-l'ordinateur>:3000` dans Safari.
2. **Hébergée en ligne** (accessible partout) : déploie l'image Docker fournie sur un service avec **disque persistant** monté sur `/data` (VPS, Fly.io, Railway, Render…) :
   ```bash
   docker build -t mlbb-companion . && docker run -p 3000:3000 -v mlbb-data:/data mlbb-companion
   ```
   ⚠️ Pas d'authentification intégrée : si tu l'exposes sur Internet, protège-la (accès par mot de passe du reverse proxy, Cloudflare Access, Tailscale…).

Puis, dans Safari : **Partager → Sur l'écran d'accueil**. L'appli s'ouvre alors en plein écran, comme une application native (icône, barre d'état translucide).

---

## Architecture

```
src/
  app/                    Pages (App Router, rendu serveur) + routes API (/api/*)
  components/             UI : layout, graphiques (Recharts), draft, builds, profil…
  data/reference/         Référentiel éditorial versionné (héros, objets, sorts, emblèmes, guides, sources)
  lib/
    domain.ts             Types et vocabulaire FR
    engine/               Moteurs purs et testés : draft, tier, meta, builds, coach, patch, ocr
    server/               SQLite (better-sqlite3), dépôt, importeur (zod), connecteurs
scripts/                  CLI : db-init, import, status
tests/                    Vitest
docs/                     Sources, format de données, méthodologie
```

- **Next.js 16 + React 19 + TypeScript**, **Tailwind CSS 4**, **Recharts**, **lucide-react**.
- **SQLite** (better-sqlite3) : zéro installation, fichier unique `data/mlbb-companion.db`. Le schéma (`src/lib/server/db.ts`) est volontairement portable vers PostgreSQL si un usage multi-utilisateur apparaît.
- **Validation** des imports et des API avec **zod**.
- **Moteurs déterministes** (`src/lib/engine`) : sans dépendance au serveur, exécutés côté client dans le simulateur pour une réactivité immédiate, et couverts par des tests.
- Pas d'authentification : application personnelle, mono-utilisateur, données locales. Pour un déploiement public, ajouter une authentification (ex. Auth.js) avant d'exposer les routes d'écriture.

### Couche IA (prévue, non activée)

Le moteur de draft est déterministe et explicable. Une couche IA pourra reformuler l'analyse produite par le moteur (entrée : sortie du moteur + données avec provenance) **sans jamais produire de statistiques**. Clé API à placer côté serveur uniquement.

---

## Limites connues

- Aucune source vérifiée ne fournit **Mythical Immortal**, la séparation **par serveur/région**, **par lane** ou **solo / 5-stack** : ces filtres affichent « indisponible ».
- Le référentiel éditorial couvre 132 héros ; la synchronisation mlbb.io ajoute le 133e (Hirara) et complète les rôles/lanes des héros récents (Obsidia, Sora, Marcel, Hirara) avec un profil de draft **dérivé des notes de la source** (faible confiance).
- Talents d'emblèmes : remplacés par les talents actuels dès la première synchronisation mlbb.io (sinon liste 2023–2025 à revérifier).
- « Mythical Glory+ » chez mlbb.io inclut Mythical Immortal : il n'existe toujours pas de statistique Immortal séparée.
- Les counters/synergies de mlbb.io sont un **indice relatif** (pas des points de win rate) ; le moteur les normalise et le précise dans ses explications.
- **OCR** (expérimental) : `tesseract.js` télécharge ses modèles depuis un CDN au premier usage (connexion Internet requise) ; le formulaire est seulement pré-rempli, à vérifier avant enregistrement.
- Portraits : affichés uniquement si une source importée fournit l'URL (sinon avatar à initiales).
