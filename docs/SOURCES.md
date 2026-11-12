# Sources : analyse du dossier de référence et vérification d'accès

## 1. Contenu du ZIP `MLBB-sources-2026.zip`

| Fichier | Contenu |
| --- | --- |
| `LISEZMOI.txt` | Mode d'emploi du dossier ; rappelle que les notes /10 sont une évaluation, pas des données officielles. |
| `Ecosysteme-sources-MLBB-2026.md` | Rapport complet (recherche du 8 nov. 2026, Season 42, patch 2.2.16a) : sources par besoin, notes /10, limites. |
| `Ecosysteme-sources-MLBB-2026.html` | Même rapport en HTML. |
| `liens-sources.csv` | 33 liens (nom ; URL). |

Le dossier ne contient **aucune donnée brute exploitable directement** (pas de tableau de statistiques, pas de liste de héros) : c'est une cartographie évaluée des sources. Seules deux valeurs chiffrées y figurent, à titre d'exemple : Masha 61,4 % WR / 0,53 % pick (toutes ranks, 7 j) et quelques chiffres MPL ID/PH S18.

## 2. Classement des sources (dossier) et vérification (8 nov. 2026)

| Source | Usage | Note dossier | Accès vérifié | Conditions | Intégration |
| --- | --- | --- | --- | --- | --- |
| MLBBHub | Stats ranked, tier list, counters, matchups, builds, draft, MPL | 9 | ✅ HTTP 200 | **CGU §4 : extraction automatisée interdite sans autorisation écrite** ; `robots.txt` : `Disallow: /api/` | ❌ Pas d'extraction automatique (revérifié le 8 nov. 2026). ✅ Import manuel par copier-coller. |
| mlbb.io | Stats par rang × période, builds avec échantillon, compétences, counters | 7–8 | ✅ HTTP 200 | `robots.txt` : `Allow: /` ; aucune CGU trouvée ; « Hero data sourced from the official MLBB website » | ✅ Connecteur actif : synchronisé par GitHub Actions toutes les 12 h (activé à la demande de l'utilisateur, 8 nov. 2026) |
| mobilelegends.com | Source primaire officielle | 7 | ↪ redirige vers www.mobilelegends.com (non testé) | Aucune API publique documentée | 🔧 Connecteur préparé (`MOONTON_API_BASE`) |
| Liquipedia | E-sport : picks, bans, WR, présence | 9 | ✅ (API : User-Agent + gzip requis, sinon 406) | CC BY-SA, règles d'API (débit) | 🔧 Préparé (`LIQUIPEDIA_USER_AGENT`), parsing à faire |
| TitoSenpai | Builds avec taux d'utilisation et WR | 7 | ✅ HTTP 200 | `robots.txt` permissif ; CGU non vérifiées | — |
| Fandom wiki | Historique des patchs | 5 | ❌ Défi Cloudflare | CC BY-SA | Consultation manuelle |
| r/MobileLegendsGame | Patch notes du jour, tier list haut ELO | 8 | Non testé (hôte non autorisé dans l'environnement de développement) | API Reddit authentifiée | — |
| ONE Esports, GuildOrder, Playnews, MLBBDex, YouTube | Guides, analyses | 6–7 | Non testé | — | Liens dans la Base de connaissances |
| Sources « à éviter » (pages.dev, blogs top-up…) | — | 1–3 | — | — | Listées comme à éviter |

## 3. Informations manquantes (aucune source vérifiée)

- Statistiques **Mythical Immortal**.
- Statistiques par **serveur / région** (toutes les sources agrègent tous serveurs).
- Statistiques **par lane** (un héros flex a les mêmes chiffres partout).
- Séparation **solo / duo / trio / 5-stack**.
- Historique patch par patch facilement exportable.
- API officielle documentée pour récupérer **un compte joueur** → profil et parties saisis manuellement (+ OCR expérimental).

## 4. Solutions de remplacement mises en place

- **Référentiel éditorial** (rôles, lanes, profils qualitatifs, objets sans chiffres) pour que le draft, les builds adaptatifs et les fiches fonctionnent sans statistiques — clairement étiqueté et jamais présenté comme statistique.
- **Import universel** (JSON `mlbb-companion/v1`, CSV, ou copier-coller d'un tableau) avec provenance obligatoire ; conservé sur l'appareil, ou publié pour tous via `data/imports/`.
- **Matchups par règles de mécaniques** (anti-dash, réduction de soins, anti-tank…) remplacés automatiquement par des données réelles dès leur import.
- **Tier lists calculées** à partir des données importées uniquement ; jamais d'opinion présentée comme statistique.

## 5. Ce qui est nécessaire pour aller plus loin

| Besoin | Ce qu'il faut |
| --- | --- |
| Stats ranked automatiques | ✅ mlbb.io branché. Pour MLBBHub : autorisation écrite de l'éditeur (contact via mlbbhub.com/contact) |
| Stats e-sport | Implémenter l'extraction Liquipedia (User-Agent avec contact, 1 requête / 2 s, attribution CC BY-SA) |
| Patch notes automatiques | Accès à une source structurée (aucune API officielle trouvée) ; en attendant, saisie ou import |
