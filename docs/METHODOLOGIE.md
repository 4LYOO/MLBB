# Méthodologie des calculs

Tous les calculs sont **déterministes**, recalculés à chaque affichage à partir des données disponibles, et couverts par des tests (`tests/`). Ce sont des estimations.

## Tier list (`src/lib/engine/tier.ts`)

1. **Confiance** selon le pick rate : `c = PR / (PR + 0,3)` (PR en %). Un héros joué à 0,3 % a une confiance de 50 %.
2. **Win rate ajusté** : `WRa = 50 + (WR − 50) × c` — un WR élevé sur très peu de parties (spécialistes) est ramené vers 50 %.
3. **Bonus de présence** : `min(BR, 60) / 60` (jusqu'à +1 point) — un héros très banni est craint.
4. **Score** = `WRa + bonus`. Le tier dépend de l'écart au score moyen du groupe : S+ ≥ +3 · S ≥ +1,75 · A ≥ +0,5 · B ≥ −1 · C sinon.
5. Tier list **compétitive** : présence (picks + bans) / parties et win rate en pick ajusté (`c = picks / (picks + 10)`).

## Tendances (`src/lib/engine/meta.ts`)

- Tendance = WR de la période choisie − WR sur 30 jours de la **même capture** ; à défaut, − WR de la capture précédente.
- Sous-estimé : écart au score moyen ≥ +1,2 et pick rate sous la médiane.
- Surévalué : pick rate dans le quart supérieur et WR < 49 %.
- À bannir : ban rate × 0,04 + (WRa − 50).
- Pourrait devenir méta : tendance ≥ +0,4 pt, WR ≥ 51 %, tier A ou B.

## Moteur de draft (`src/lib/engine/draft.ts`)

Pour chaque héros disponible (non pris, non banni, profil complet), sept critères dans [−1, 1] :

| Critère | Poids | Calcul |
| --- | --- | --- |
| Counter adverse | 0,24 | Moyenne des matchups contre chaque adversaire. Données importées prioritaires (`pp / 4`, ou indice mlbb.io / 8 pour les counters et / 5 pour les synergies, calibré sur le 95e centile) ; sinon règles de mécaniques symétriques : anti-dash vs mobilité, contrôle ciblé vs cible fragile mobile, réduction de soins vs sustain, anti-tank vs résistance, burst vs cible fragile immobile, poke vs mêlée immobile, anti-plongée vs assassins, immunités vs contrôles |
| Synergie alliée | 0,16 | Moyenne des synergies : combos connus, engage + dégâts de zone, protection d'un carry fragile, soins + plongeurs, contrôle + burst ; pénalités : duo fragile et immobile, même lane unique |
| Besoins de composition | 0,28 | Lane manquante (affectation optimale exhaustive), dégâts magiques/physiques manquants, frontline, engage, chaîne de contrôle, protection du carry ; pénalités : lane déjà prise, déséquilibre de dégâts |
| Performance statistique | 0,14 | `(WRa − 50) / 4` dans le rang choisi |
| Méta | 0,06 | Tier calculé (S+ = 1 … C = −0,4) |
| Maîtrise personnelle | 0,06 | ≥ 3 parties : `0,2 + (WR perso − 0,5) × 2` |
| Prise en main | 0,06 | −0,6 si la difficulté dépasse le maximum choisi |

**Score = 50 + 50 × Σ(poids × critère) / Σ(poids des critères disponibles)**, borné à [0, 100]. Un critère sans donnée est retiré (et signalé), il ne compte jamais comme 0.

Autres sorties : bans suggérés (menace directe sur tes alliés + WR/BR), premier pick (sécurité = peu de counters dans le pool, flexibilité des lanes, stats), analyse de composition (9 indicateurs 0–100, forces, faiblesses, menaces, conditions de victoire, conseils), détection de composition fragile.

Le profil éditorial (0–3 : contrôle, mobilité, résistance, engage, protection, burst, sustain, early/mid/late, étiquettes de mécaniques) est une estimation d'expert, de confiance indiquée par héros.

## Builds adaptatifs (`src/lib/engine/builds.ts`)

Base = build importé choisi ou modèle d'archétype. Les emplacements 3 à 6 sont remplaçables : réduction de soins si soins/sustain adverses ; Dominance Ice contre les boucliers (tanks) ; pénétration ou % PV contre ≥ 2 héros très résistants ; défense physique/magique si ≥ 3 sources du même type ; Immortality contre ≥ 2 menaces de burst ; Tough Boots si contrôle adverse cumulé ≥ 10. Sort : Châtiment en jungle, Purify/Aegis selon contrôle/burst adverse, sinon selon l'archétype.

## Coach (`src/lib/engine/coach.ts`)

Règles explicites à partir de tes parties (≥ 5) : morts moyennes, héros fiables (≥ 3 parties, ≥ 55 %), héros à retravailler (< 45 %), dispersion du pool, écart entre rôles (≥ 10 pt), progression/baisse sur 10 parties, série de défaites, parties longues/courtes, taux de MVP.
