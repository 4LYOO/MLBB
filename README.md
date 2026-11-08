# MLBB Companion

Assistant personnel d'analyse et d'optimisation pour **Mobile Legends: Bang Bang** : méta, statistiques des héros, tier lists, simulateur de draft multicritère, builds adaptatifs, suivi de progression et coach personnel.

> Projet de fan, non affilié à Moonton. **Aucune statistique n'est inventée** : sans import de données réelles, l'application affiche « Donnée indisponible ». Les recommandations sont des estimations stratégiques, pas des certitudes.

---

## Démarrage rapide

Prérequis : **Node.js ≥ 20** (testé avec Node 22) et npm.

```bash
npm install          # dépendances
npm run db:init      # crée data/mlbb-companion.db et charge le référentiel
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

### ⚠️ Décision en attente : quelle source statistique ?

Vérification du 8 novembre 2026 :

- **MLBBHub** (meilleure source selon le dossier) : ses CGU interdisent explicitement l'extraction automatisée sans autorisation écrite, et `robots.txt` bloque `/api/`. → **Aucun connecteur.** Consultation manuelle via les liens, ou demande d'autorisation écrite à l'éditeur.
- **mlbb.io** : pages accessibles, `robots.txt` autorise tout, aucune CGU trouvée ; le site dit tirer ses données du site officiel. Ses données (stats par rang × période, compétences, counters, consensus d'emblèmes avec échantillon) couvriraient presque tous les besoins. **Le connecteur n'est pas activé** : l'API n'est pas documentée publiquement, et l'utiliser est une décision qui t'appartient (idéalement après avoir contacté l'éditeur).
- **Moonton (officiel)** : pas d'API publique documentée ; connecteur préparé (`MOONTON_API_BASE`).
- **Liquipedia** (e-sport, CC BY-SA) : API utilisable avec User-Agent identifiable ; extraction des tableaux de stats de tournoi à implémenter.

En attendant, tu peux importer n'importe quelle source (fichier JSON/CSV) depuis **Sources & données**. La provenance que tu déclares est affichée partout.

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
- Le référentiel éditorial couvre 132 héros (3 récents à profil incomplet : Obsidia, Sora, Marcel) ; le dernier décompte des sources indique 133 héros — le manquant sera ajouté par le premier import qui le contient.
- Talents d'emblèmes : système 2023–2025, à revérifier (refonte possible en 2026).
- **OCR** (expérimental) : `tesseract.js` télécharge ses modèles depuis un CDN au premier usage (connexion Internet requise) ; le formulaire est seulement pré-rempli, à vérifier avant enregistrement.
- Portraits : affichés uniquement si une source importée fournit l'URL (sinon avatar à initiales).
