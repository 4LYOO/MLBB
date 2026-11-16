# Mettre à jour les données à chaque patch

Ce guide explique, pas à pas, comment mettre l'application à jour **à la main** quand un nouveau patch de Mobile Legends sort.
Aucun script ne va chercher ces informations sur des sites tiers : tu lis les sources, tu recopies ce qui change.

> Les **stats chiffrées** (win rate, pick rate, ban rate, matchups) restent automatiques : le workflow GitHub Actions
> les récupère sur mlbb.io toutes les 12 h. Ce guide concerne tout le reste (héros, coaching, objets, nouveautés).

## Sources à consulter

| Source | Pour quoi |
| --- | --- |
| Patch notes officielles (jeu → Annonces, site et réseaux officiels de Mobile Legends) | Buffs / nerfs, nouveaux héros, objets modifiés, timings d'objectifs |
| Liquipedia (page « Patch » de MLBB) | Résumé des patchs, historique |
| MLBBHub | Builds, emblèmes, méta par rôle |

Ne recopie **que ce que tu as lu**. Si tu hésites, garde `"aVerifier": true` : une pastille « à vérifier » s'affichera dans l'appli.

## Les fichiers (dossier `data/`)

| Fichier | Contenu | Écran |
| --- | --- | --- |
| `heroes.json` | Héros, profils, combos, méta par rôle, **changements du patch** | Draft, Héros, Coaching, Nouveautés |
| `coaching.json` | Conseils par rôle, builds de base, **aide-mémoire** (timings d'objectifs) | Coaching, Aide-mémoire |
| `items.json` | Objets, sorts, emblèmes, talents | Builds, fiche d'avant-partie |
| `guides.json` | Liens de la base de connaissances | Guides |
| `config.json` | Réglages (poids du draft, anti-tilt, étoiles, badge) | Partout |

Chaque fichier commence par un en-tête `meta` :

```json
"meta": { "patch": "2.2.16a", "dateMaj": "2026-11-15", "sources": ["Patch notes officielles 2.2.16a"] }
```

## Étapes

1. **Sur GitHub**, ouvre le dépôt → dossier `data/` → le fichier à modifier → icône crayon ✏️ (ou édite-le sur ton ordinateur).
2. **Mets à jour l'en-tête** `meta` : nouveau `patch`, `dateMaj` du jour (format `AAAA-MM-JJ`), et la ou les `sources` utilisées.
   C'est `heroes.json → meta` qui alimente le badge « Patch X · JJ/MM » en haut de l'appli
   (il devient orange après `config.json → badge.joursAvantAvertissement` jours).
3. **Nouveautés du patch** : dans `heroes.json → changements`, mets le numéro de `patch`, la `date`, la `source`,
   puis remplace la `liste` par les changements, un par ligne :
   ```json
   "liste": [
     { "type": "buff", "hero": "layla", "texte": "Dégâts de la compétence 2 augmentés" },
     { "type": "nerf", "hero": "ling", "texte": "Temps de recharge de l'ultime augmenté" },
     { "type": "objet", "texte": "Sea Halberd : coût réduit" }
   ]
   ```
   `type` = `buff`, `nerf`, `ajustement`, `nouveau` ou `objet`. `hero` est le *slug* du héros (nom en minuscules
   avec des tirets, comme dans la liste `heroes`). Mets `"aVerifier": false` une fois la liste relue.
4. **Méta par rôle** : `heroes.json → metaParRole` (5 héros par lane). Mets à jour la `source` et la date.
5. **Nouveau héros** : copie un bloc existant dans `heroes.json → heroes` et adapte-le
   (profil de 0 à 3 : estimation, garde `"aVerifier": true`).
6. **Objets / emblèmes modifiés** : `items.json`, et les builds de base de `coaching.json → roles[…] → sections.builds`.
7. **Timings d'objectifs** (Tortue, Seigneur…) : `coaching.json → aideMemoire.objectifs`.
   Vérifie-les dans les patch notes, puis passe `"aVerifier"` à `false`.
8. **(Facultatif) Remise en forme** : sur ordinateur, `node scripts/format-json.mjs` garde les fichiers lisibles.
9. **Enregistre** (« Commit changes » sur GitHub). Le site se reconstruit tout seul en quelques minutes ;
   sur l'iPhone, ferme et rouvre l'appli pour charger la nouvelle version.

## Images et noms français des objets

- **Portrait d'un héros** : champ `"image"` du héros dans `data/heroes.json` (adresse d'une image en ligne).
  Pour un nouveau héros, copie l'adresse de son portrait depuis une page publique (par exemple mlbb.io).
- **Icône et nom français d'un objet** : champs `"image"` et `"nomFr"` dans `data/items.json`
  (`objets` pour les objets utilisés par les builds, `autresObjets` pour les autres).
  Les noms français sont des traductions : corrige-les si le jeu utilise un autre nom.
- **Sorts, emblèmes, talents** : champs `"image"` (et `"nomFr"` pour les talents) dans `data/items.json`
  → sections `sorts`, `emblemes`, `talents`.
- Si une image ne s'affiche pas (adresse changée, hors ligne), l'appli montre les initiales à la place : rien ne casse.

## Vérifier que tout va bien

- Onglet *Actions* du dépôt : le dernier passage doit être vert. S'il est rouge, c'est souvent une virgule ou un guillemet
  manquant dans un JSON : ouvre le détail, l'erreur indique le fichier.
- Sur ordinateur : `npm test` vérifie aussi que les JSON sont valides.
- Dans l'appli : le badge affiche le nouveau patch, et « Nouveautés du patch » (menu ⋯) affiche ta liste.

## La pastille « à vérifier »

Ajoute `"aVerifier": true` à toute donnée dont tu n'es pas sûr (timing, chiffre, méta). Ne mets jamais un chiffre au hasard :
mieux vaut laisser « à vérifier » que d'afficher une information fausse.
