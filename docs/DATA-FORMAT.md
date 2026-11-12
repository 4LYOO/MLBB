# Format d'import `mlbb-companion/v1`

Un paquet JSON regroupe des données d'**une seule source**, capturées à **une date**. Il s'importe dans l'application (Sources & données → Importer un fichier, conservé sur l'appareil) ou se dépose dans `data/imports/` du dépôt pour être publié à chaque synchronisation. Tous les blocs sont optionnels sauf `format`, `source` et `capturedAt`. Le schéma de validation fait foi : `src/lib/server/importer.ts` (zod).

```jsonc
{
  "format": "mlbb-companion/v1",
  "source": { "id": "ma-source", "name": "Nom lisible", "kind": "statistical", "url": "https://…", "reliability": 3 },
  "capturedAt": "2026-11-08T10:00:00Z",   // quand TU as récupéré les données
  "dataAsOf": "2026-11-08T08:00:00Z",     // date affichée par la source (optionnel)
  "patch": "2.2.16a",

  "heroes":    [{ "slug": "alpha", "name": "Alpha", "roles": ["Fighter"], "lanes": ["jungle","exp"], "portraitUrl": "https://…",
                  "skills": [{ "key": "passive", "name": "…", "description": "…", "cooldown": "…", "cost": "…" }],
                  "baseStats": { "HP": 0 }, "specialities": ["Charge"] }],
  "heroStats": [{ "hero": "alpha", "rank": "all", "period": "7d", "winRate": 0, "pickRate": 0, "banRate": 0 }],
  "matchups":  [{ "hero": "khufra", "other": "fanny", "kind": "counter", "score": 0, "unit": "pp", "rank": "all" }],
  "proStats":  [{ "hero": "alpha", "tournament": "MPL ID S18", "picks": 0, "bans": 0, "wins": 0, "gamesTotal": 0 }],
  "items":     [{ "slug": "war-axe", "name": "War Axe", "category": "attack", "price": 0, "stats": { "Physical Attack": 0 }, "passive": "…" }],
  "builds":    [{ "hero": "alpha", "title": "…", "type": "meta", "items": ["war-axe"], "emblem": "fighter", "talents": ["…"], "spell": "retribution", "sampleSize": 20 }],
  "patches":   [{ "version": "2.2.16a", "date": "2026-11-01", "server": "official", "url": "https://…",
                  "changes": [{ "targetType": "hero", "target": "alpha", "change": "buff", "text": "…" }] }]
}
```

Valeurs à 0 ci-dessus : **structure seulement**, ne pas importer telle quelle.

## Vocabulaire

- `rank` : `all`, `epic`, `legend`, `mythic`, `mythical_honor`, `mythical_glory`, `mythical_immortal`
- `period` : `1d`, `3d`, `7d`, `15d`, `30d`
- `roles` : `Tank`, `Fighter`, `Assassin`, `Mage`, `Marksman`, `Support`
- `lanes` : `exp`, `mid`, `gold`, `jungle`, `roam`
- `matchups.score` (unité `pp`) : écart en points de pourcentage en faveur de `hero` contre `other` (ce n'est pas un win rate)
- `builds.type` : `meta`, `solo`, `competitive`, `alternative`, `anti-physical`, `anti-magic`, `situational`
- `source.kind` : `official`, `statistical`, `community`, `manual`

## Règles appliquées à l'import

- Héros inconnu dans `heroStats`/`matchups` : ligne ignorée + avertissement. Nouveau héros dans `heroes` : ajouté (profil de draft incomplet tant qu'il n'est pas renseigné).
- Ban rate > 100 % : importé tel quel et **signalé** (erreur connue de certaines pages officielles).
- Build avec échantillon < 20 : signalé comme petit échantillon.
- Une donnée importée n'est jamais écrasée par le référentiel éditorial.
- Réimporter le même paquet est sans effet (idempotent). Une nouvelle `capturedAt` crée une nouvelle capture → historique et tendances.
- Les règles de fusion sont implémentées dans `src/lib/data/model.ts` (testées dans `tests/model.test.ts`).

## CSV de statistiques

```
hero;rank;period;winRate;pickRate;banRate
alpha;all;7d;…;…;…
```

Séparateur `;` ou `,`, décimales `.` ou `,`, symbole `%` toléré. Source et date de capture obligatoires (champs dédiés de l'interface).
