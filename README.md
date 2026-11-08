# MLBB Companion

Assistant personnel d'analyse et d'optimisation pour **Mobile Legends: Bang Bang**, pensé d'abord pour l'**iPhone** : méta, statistiques des héros, tier lists, simulateur de draft multicritère, builds adaptatifs, suivi de progression et coach personnel.

> Projet de fan, non affilié à Moonton. **Aucune statistique n'est inventée** : chaque chiffre vient d'une source tracée (mlbb.io, import manuel…) ; sinon l'application affiche « Donnée indisponible ». Les recommandations sont des estimations stratégiques, pas des certitudes.

**Adresse (une fois GitHub Pages activé) : https://4lyoo.github.io/MLBB/**

---

## Fonctionnement

L'application est un **site statique hébergé gratuitement sur GitHub Pages** :

```
GitHub Actions (toutes les 12 h, à chaque push sur main, ou à la demande)
  1. télécharge les données de mlbb.io (+ les fichiers de data/imports/)
  2. ajoute la capture à l'historique déjà publié (tendances, évolution)
  3. construit le site statique et le publie sur GitHub Pages
iPhone (Safari)
  - charge les données publiées et calcule tout localement (tiers, draft, builds…)
  - garde tes données personnelles dans Safari, sur l'appareil
```

- **Aucun serveur, aucune base de données à gérer, aucun coût.**
- **Tes données personnelles** (profil, parties, drafts, favoris, builds, imports, patchs saisis) restent **sur ton iPhone**, dans Safari. Elles ne sont envoyées nulle part. Exporte une sauvegarde de temps en temps (Sources & données → Sauvegarde) : effacer les données de Safari les supprime.
- Si mlbb.io est indisponible lors d'une synchro, les données précédentes sont conservées et l'incident est noté dans le journal (page Sources).

### Activer GitHub Pages (une seule fois)

1. Fusionne la branche de développement dans `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
3. Onglet **Actions → « Synchroniser et publier » → Run workflow** (ou attends le prochain push / créneau de 12 h).
4. Le site est en ligne à l'adresse ci-dessus ≈ 5 minutes plus tard.

> GitHub suspend les tâches planifiées d'un dépôt public sans activité pendant 60 jours : il suffit alors de cliquer « Enable workflow » dans l'onglet Actions.

### Installer sur l'iPhone

Dans Safari, ouvre l'adresse, puis **Partager → Sur l'écran d'accueil**. L'appli s'ouvre en plein écran, avec son icône, comme une application native.

Interface iPhone : thème sombre « Liquid Glass », barre d'onglets flottante (Stats, Méta, Draft, Moi, Plus), zones de sécurité (encoche, barre d'accueil), champs en 16 px (pas de zoom automatique), cibles tactiles de 44 px, cartes à la place des grands tableaux.

---

## Ce que contient l'application

| Page | Contenu |
| --- | --- |
| **Statistiques** | Totaux, répartition par rôle, WR/PR/BR moyens, tops (pick, ban, WR), tableau/cartes filtrables (rang, période, rôle, lane, seuils), tendances, évolution |
| **Méta & Tier list** | Tier lists globale / rôle / lane / solo queue / compétitive (si stats e-sport importées), tendances (hausse, baisse, sous-estimés, surévalués, bans prioritaires, futurs méta), changements de tier, analyse d'un héros |
| **Simulateur de draft** | Modes libre, classé 6 et 10 bans, tournoi ; côté bleu/rouge ; recommandations multicritères expliquées ; bans ; premier pick ; analyse de composition ; entraînement contre l'adversaire automatique ; sauvegarde, historique, comparaison |
| **Équipements & builds** | Builds par archétype, **builds adaptatifs** à la composition adverse, comparaison, builds perso, objets (prix, stats, passifs), emblèmes et talents actuels, sorts |
| **Fiches héros** (133) | Rôles, lanes, compétences, stats de base, profil, forces/faiblesses, counters et synergies (données + règles), emblème/talents/sort les plus joués avec échantillon, stats par rang, évolution, patchs |
| **Mes statistiques** | Profil, saisie de parties, import de capture (OCR expérimental), KDA, WR par rôle/héros, graphiques, coach |
| **Comparateur**, **Patch notes**, **Base de connaissances**, **Favoris & historique**, **Sources & données** | — |

Recherche globale : loupe en haut à droite (Ctrl + K sur ordinateur).

---

## Sources

| Source | Mode | Apport |
| --- | --- | --- |
| **mlbb.io** | Automatique (GitHub Actions, 12 h) | WR/PR/BR sur 6 rangs (Tous → Mythical Glory+) × 5 périodes, compétences, stats de base, counters/synergies (indice relatif), consensus emblème/talents/sort avec échantillon, objets, portraits |
| **MLBBHub** | Copier-coller manuel (Sources → Import manuel par collage) | Ses conditions interdisent l'extraction automatisée sans autorisation écrite (revérifié le 8 nov. 2026) |
| **Liquipedia**, patch notes, autres | Fichier JSON/CSV importé dans l'appli, ou déposé dans `data/imports/` pour être publié à chaque synchro | Format `mlbb-companion/v1` |

Le connecteur mlbb.io lit des pages publiques (robots.txt : `Allow: /`), une requête à la fois, espacées de 1,2 s, avec un User-Agent identifiable, deux fois par jour. mlbb.io n'a pas publié de conditions d'utilisation.

Détails : [`docs/SOURCES.md`](docs/SOURCES.md) · [`docs/DATA-FORMAT.md`](docs/DATA-FORMAT.md) · [`docs/METHODOLOGIE.md`](docs/METHODOLOGIE.md)

---

## Développement

Prérequis : Node.js ≥ 20 (testé avec Node 22).

```bash
npm install
npm run data:publish   # télécharge mlbb.io (~3 min) → public/data/*.json
npm run dev            # http://localhost:3000
```

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run data:publish` | Génère `public/data/published.json` et `history.json` (`--from-file=paquet.json` pour éviter le téléchargement ; `PAGES_URL=…` pour repartir de l'historique publié) |
| `npm run build` | Export statique dans `out/` (`NEXT_PUBLIC_BASE_PATH=/MLBB` pour reproduire GitHub Pages) |
| `npm run preview` | Sert `out/` sur http://localhost:4000 avec le même préfixe |
| `npm test` | Tests unitaires (modèle de données, moteur de draft, tiers, builds, coach, OCR, connecteur, collage, patchs) |
| `npm run lint` | Vérification TypeScript |

Derrière un proxy HTTPS (conteneur cloud) : lancer Node avec `NODE_USE_ENV_PROXY=1`.

### Architecture

```
.github/workflows/publish.yml   Synchro + build + déploiement GitHub Pages
scripts/publish-data.ts         Synchro mlbb.io + data/imports → public/data/
src/
  app/                          Pages (export statique ; fiches héros/guides pré-générées)
  components/views/             Vues client (lisent le modèle de données)
  components/…                  UI : layout, graphiques (Recharts), draft, builds, profil…
  data/reference/               Référentiel éditorial versionné
  lib/
    data/                       Schéma d'import (zod), modèle de données, sélecteurs, format publié
    client/                     Chargement des données publiées, stockage personnel (localStorage)
    engine/                     Moteurs purs et testés : draft, tier, meta, builds, coach, patch, ocr, collage
    sync/mlbbio.ts              Connecteur mlbb.io (exécuté par GitHub Actions)
```

Next.js 16 (export statique) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · zod · Vitest.

---

## Limites connues

- Aucune source ne publie **Mythical Immortal** séparément (inclus dans « Mythical Glory+ » chez mlbb.io), ni de statistiques **par serveur/région**, **par lane** ou **solo / 5-stack**.
- Les données ont au plus ≈ 12 h de retard (fréquence de synchro) ; mlbb.io les met à jour quotidiennement.
- Les counters/synergies de mlbb.io sont un **indice relatif** (pas des points de win rate) ; le moteur les normalise et le précise dans ses explications.
- Héros récents (Hirara, Obsidia, Sora, Marcel) : profil de draft **dérivé des notes de la source** (faible confiance).
- Données personnelles liées à l'appareil et au navigateur : pas de synchronisation entre appareils (utiliser l'export/import de sauvegarde).
- **OCR** (expérimental) : `tesseract.js` télécharge ses modèles depuis un CDN au premier usage ; le formulaire est seulement pré-rempli, à vérifier avant enregistrement.
