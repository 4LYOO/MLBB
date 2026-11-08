import { z } from "zod";
import { getDb, j, now } from "./db";
import { ensureSource } from "./repo";
import { LANES, PERIODS, RANKS, ROLES } from "@/lib/domain";

/**
 * Format d'échange « mlbb-companion/v1 ».
 * Toute donnée entrante doit déclarer sa source, sa date de capture et, pour les
 * statistiques, le rang et la période. Rien n'est inventé : un champ absent reste absent.
 */
const pct = z.number().min(0).max(100);
const slug = z.string().min(1).regex(/^[a-z0-9-]+$/, "slug attendu : minuscules, chiffres, tirets");

export const DataPackageSchema = z.object({
  format: z.literal("mlbb-companion/v1"),
  source: z.object({
    id: slug,
    name: z.string().min(1),
    kind: z.enum(["official", "statistical", "community", "manual"]),
    url: z.string().url().nullish(),
    reliability: z.number().int().min(1).max(5).optional(),
  }),
  capturedAt: z.string().datetime({ offset: true }),
  dataAsOf: z.string().datetime({ offset: true }).nullish(),
  patch: z.string().nullish(),
  heroes: z
    .array(
      z.object({
        slug,
        name: z.string().min(1),
        roles: z.array(z.enum(ROLES)).optional(),
        lanes: z.array(z.enum(LANES)).optional(),
        portraitUrl: z.string().url().nullish(),
        skills: z
          .array(z.object({ key: z.string(), name: z.string(), type: z.string().optional(), description: z.string().optional(), cooldown: z.string().nullish(), cost: z.string().nullish() }))
          .optional(),
        baseStats: z.record(z.string(), z.number()).optional(),
        specialities: z.array(z.string()).optional(),
        damage: z.enum(["P", "M", "H"]).optional(),
        range: z.enum(["M", "R"]).optional(),
        /** Notes 0–10 publiées par la source (durabilité, offense, contrôle, difficulté). */
        ratings: z.object({ durability: z.number(), offense: z.number(), control: z.number(), difficulty: z.number() }).partial().optional(),
        /** Recommandations agrégées par la source (emblème, talents, sort) avec taille d'échantillon. */
        extras: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  catalog: z.array(z.object({ kind: z.string(), slug, data: z.record(z.string(), z.unknown()) })).optional(),
  heroStats: z
    .array(
      z.object({
        hero: slug,
        rank: z.enum(RANKS),
        period: z.enum(PERIODS),
        winRate: pct,
        pickRate: pct,
        banRate: z.number().min(0), // certaines sources officielles affichent > 100 % (erreur) : signalé, pas corrigé
      }),
    )
    .optional(),
  matchups: z
    .array(
      z.object({
        hero: slug,
        other: slug,
        kind: z.enum(["counter", "synergy"]),
        score: z.number(),
        unit: z.string().default("pp"),
        rank: z.enum(RANKS).nullish(),
      }),
    )
    .optional(),
  proStats: z
    .array(z.object({ hero: slug, tournament: z.string(), picks: z.number().int().min(0), bans: z.number().int().min(0), wins: z.number().int().min(0), gamesTotal: z.number().int().positive() }))
    .optional(),
  items: z
    .array(
      z.object({
        slug,
        name: z.string(),
        category: z.enum(["attack", "magic", "defense", "movement", "jungle", "roam"]),
        price: z.number().int().positive().nullish(),
        stats: z.record(z.string(), z.number()).nullish(),
        passive: z.string().nullish(),
        imageUrl: z.string().url().nullish(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  builds: z
    .array(
      z.object({
        hero: slug,
        title: z.string(),
        type: z.enum(["meta", "solo", "competitive", "alternative", "anti-physical", "anti-magic", "situational"]),
        items: z.array(slug).min(1).max(7),
        emblem: z.string().nullish(),
        talents: z.array(z.string()).optional(),
        spell: z.string().nullish(),
        notes: z.string().nullish(),
        sampleSize: z.number().int().positive().nullish(),
      }),
    )
    .optional(),
  patches: z
    .array(
      z.object({
        version: z.string(),
        date: z.string().nullish(),
        server: z.enum(["official", "advanced"]).nullish(),
        title: z.string().nullish(),
        url: z.string().url().nullish(),
        changes: z.array(
          z.object({
            targetType: z.enum(["hero", "item", "emblem", "spell", "system"]),
            target: z.string(),
            change: z.enum(["buff", "nerf", "adjust", "new", "revamp", "other"]),
            text: z.string(),
          }),
        ),
      }),
    )
    .optional(),
});
export type DataPackage = z.infer<typeof DataPackageSchema>;

export interface ImportResult {
  ok: boolean;
  sourceId: string | null;
  counts: Record<string, number>;
  warnings: string[];
  errors: string[];
}

export function validatePackage(input: unknown): { ok: true; data: DataPackage } | { ok: false; errors: string[] } {
  const r = DataPackageSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, errors: r.error.issues.slice(0, 30).map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`) };
}

/** Importe un paquet validé dans une transaction, et journalise la synchronisation. */
export function importPackage(input: unknown, connector = "file-import"): ImportResult {
  const db = getDb();
  const started = now();
  const v = validatePackage(input);
  if (!v.ok) {
    db.prepare("INSERT INTO sync_runs (connector, source_id, started_at, finished_at, status, records, message) VALUES (?, NULL, ?, ?, 'error', 0, ?)").run(
      connector,
      started,
      now(),
      v.errors.join(" | ").slice(0, 2000),
    );
    return { ok: false, sourceId: null, counts: {}, warnings: [], errors: v.errors };
  }
  const p = v.data;
  const src = p.source.id;
  const cap = p.capturedAt;
  const counts: Record<string, number> = {};
  const warnings: string[] = [];
  const known = new Set((db.prepare("SELECT slug FROM heroes").all() as { slug: string }[]).map((r) => r.slug));

  const tx = db.transaction(() => {
    ensureSource({ id: src, name: p.source.name, kind: p.source.kind, url: p.source.url, reliability: p.source.reliability });

    for (const h of p.heroes ?? []) {
      const exists = known.has(h.slug);
      if (!exists) {
        db.prepare(
          `INSERT INTO heroes (slug, name, roles, lanes, damage, range, difficulty, confidence, incomplete, portrait_url, source_id, updated_at)
           VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'medium', ?, ?, ?, ?)`,
        ).run(h.slug, h.name, j(h.roles ?? []), j(h.lanes ?? []), h.roles?.length ? 0 : 1, h.portraitUrl ?? null, src, cap);
        known.add(h.slug);
        warnings.push(`Nouveau héros ajouté : ${h.name} (profil de draft à compléter).`);
      } else {
        if (h.roles?.length || h.lanes?.length) {
          db.prepare(
            `UPDATE heroes SET name = ?, roles = COALESCE(?, roles), lanes = COALESCE(?, lanes), source_id = ?, updated_at = ? WHERE slug = ?`,
          ).run(h.name, h.roles?.length ? j(h.roles) : null, h.lanes?.length ? j(h.lanes) : null, src, cap, h.slug);
        }
        if (h.portraitUrl) db.prepare("UPDATE heroes SET portrait_url = ? WHERE slug = ?").run(h.portraitUrl, h.slug);
      }
      if (h.damage) db.prepare("UPDATE heroes SET damage = ? WHERE slug = ?").run(h.damage, h.slug);
      if (h.range) db.prepare("UPDATE heroes SET range = ? WHERE slug = ?").run(h.range, h.slug);
      if (h.ratings?.difficulty != null) {
        // Difficulté de la source (0–10) → 1–3, seulement si le référentiel n'en fournit pas.
        db.prepare("UPDATE heroes SET difficulty = COALESCE(difficulty, ?) WHERE slug = ?").run(h.ratings.difficulty <= 3 ? 1 : h.ratings.difficulty <= 6 ? 2 : 3, h.slug);
      }
      if (h.skills || h.baseStats || h.specialities || h.extras || h.ratings) {
        const extras = h.extras || h.ratings ? j({ ...(h.extras ?? {}), ...(h.ratings ? { ratings: h.ratings } : {}) }) : null;
        db.prepare(
          `INSERT INTO hero_details (slug, skills, base_stats, specialities, lore, source_id, captured_at, extras) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
           ON CONFLICT(slug) DO UPDATE SET skills=COALESCE(excluded.skills, skills), base_stats=COALESCE(excluded.base_stats, base_stats),
             specialities=COALESCE(excluded.specialities, specialities), extras=COALESCE(excluded.extras, extras),
             source_id=excluded.source_id, captured_at=excluded.captured_at`,
        ).run(h.slug, h.skills ? j(h.skills) : null, h.baseStats ? j(h.baseStats) : null, h.specialities ? j(h.specialities) : null, src, cap, extras);
      }
      // Héros sans profil de draft (ex. sorti après le référentiel) : profil DÉRIVÉ des notes de la source.
      const hasProfile = db.prepare("SELECT 1 FROM hero_profiles WHERE slug = ?").get(h.slug);
      if (!hasProfile && h.ratings && h.roles?.length) {
        const prof = deriveProfile(h.ratings, h.specialities ?? [], h.roles);
        db.prepare(
          `INSERT INTO hero_profiles (slug, cc, mobility, durability, engage, peel, burst, sustain, early, mid, late, tags, source_id, updated_at)
           VALUES (@slug, @cc, @mobility, @durability, @engage, @peel, @burst, @sustain, 2, 2, 2, @tags, @src, @cap)`,
        ).run({ slug: h.slug, ...prof, tags: j(prof.tags), src, cap });
        db.prepare("UPDATE heroes SET incomplete = 0, confidence = 'low' WHERE slug = ?").run(h.slug);
        warnings.push(`Profil de draft dérivé des notes de la source pour ${h.name} (faible confiance).`);
      }
      counts.heroes = (counts.heroes ?? 0) + 1;
    }

    for (const c of p.catalog ?? []) {
      db.prepare(
        `INSERT INTO catalog (kind, slug, data, source_id, captured_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(kind, slug) DO UPDATE SET data=excluded.data, source_id=excluded.source_id, captured_at=excluded.captured_at`,
      ).run(c.kind, c.slug, j(c.data), src, cap);
      counts.catalog = (counts.catalog ?? 0) + 1;
    }

    const insStat = db.prepare(
      `INSERT INTO hero_stats (slug, rank, period, win_rate, pick_rate, ban_rate, source_id, captured_at, data_as_of, patch)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug, rank, period, source_id, captured_at) DO UPDATE SET win_rate=excluded.win_rate, pick_rate=excluded.pick_rate, ban_rate=excluded.ban_rate`,
    );
    for (const s of p.heroStats ?? []) {
      if (!known.has(s.hero)) {
        warnings.push(`Stat ignorée : héros inconnu « ${s.hero} ».`);
        continue;
      }
      if (s.banRate > 100) warnings.push(`Ban rate > 100 % pour ${s.hero} (${s.banRate}) : probable erreur de la source, importé tel quel et signalé.`);
      insStat.run(s.hero, s.rank, s.period, s.winRate, s.pickRate, s.banRate, src, cap, p.dataAsOf ?? null, p.patch ?? null);
      counts.heroStats = (counts.heroStats ?? 0) + 1;
    }

    const insMu = db.prepare(
      `INSERT INTO matchups (slug, other, kind, score, unit, rank, source_id, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug, other, kind, source_id, captured_at) DO UPDATE SET score=excluded.score`,
    );
    for (const m of p.matchups ?? []) {
      if (!known.has(m.hero) || !known.has(m.other)) {
        warnings.push(`Matchup ignoré : ${m.hero} / ${m.other} (héros inconnu).`);
        continue;
      }
      insMu.run(m.hero, m.other, m.kind, m.score, m.unit, m.rank ?? null, src, cap);
      counts.matchups = (counts.matchups ?? 0) + 1;
    }

    const insPro = db.prepare(
      `INSERT INTO pro_stats (slug, tournament, picks, bans, wins, games_total, source_id, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug, tournament, source_id, captured_at) DO UPDATE SET picks=excluded.picks, bans=excluded.bans, wins=excluded.wins, games_total=excluded.games_total`,
    );
    for (const s of p.proStats ?? []) {
      if (s.wins > s.picks) warnings.push(`Pro : ${s.hero} a plus de victoires que de picks dans ${s.tournament}.`);
      insPro.run(s.hero, s.tournament, s.picks, s.bans, s.wins, s.gamesTotal, src, cap);
      counts.proStats = (counts.proStats ?? 0) + 1;
    }

    for (const it of p.items ?? []) {
      db.prepare(
        `INSERT INTO items (slug, name, category, tags, use, price, stats, passive, image_url, source_id, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET name=excluded.name, category=excluded.category,
           tags=CASE WHEN excluded.tags = '[]' THEN items.tags ELSE excluded.tags END,
           price=excluded.price, stats=excluded.stats, passive=excluded.passive,
           image_url=COALESCE(excluded.image_url, items.image_url), source_id=excluded.source_id, updated_at=excluded.updated_at`,
      ).run(it.slug, it.name, it.category, j(it.tags ?? []), it.price ?? null, it.stats ? j(it.stats) : null, it.passive ?? null, it.imageUrl ?? null, src, cap);
      counts.items = (counts.items ?? 0) + 1;
    }

    if (p.builds?.length) db.prepare("DELETE FROM builds WHERE source_id = ? AND is_user = 0").run(src);
    for (const b of p.builds ?? []) {
      db.prepare(
        `INSERT INTO builds (hero, title, type, items, emblem, talents, spell, notes, sample_size, source_id, captured_at, is_user)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      ).run(b.hero, b.title, b.type, j(b.items), b.emblem ?? null, j(b.talents ?? []), b.spell ?? null, b.notes ?? null, b.sampleSize ?? null, src, cap);
      if (b.sampleSize != null && b.sampleSize < 20) warnings.push(`Build « ${b.title} » (${b.hero}) : petit échantillon (${b.sampleSize}).`);
      counts.builds = (counts.builds ?? 0) + 1;
    }

    for (const pa of p.patches ?? []) {
      db.prepare(
        `INSERT INTO patches (version, date, server, title, url, source_id, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(version) DO UPDATE SET date=excluded.date, server=excluded.server, title=excluded.title, url=excluded.url, source_id=excluded.source_id, captured_at=excluded.captured_at`,
      ).run(pa.version, pa.date ?? null, pa.server ?? null, pa.title ?? null, pa.url ?? null, src, cap);
      db.prepare("DELETE FROM patch_changes WHERE version = ?").run(pa.version);
      const ins = db.prepare("INSERT INTO patch_changes (version, target_type, target, change, text) VALUES (?, ?, ?, ?, ?)");
      for (const c of pa.changes) ins.run(pa.version, c.targetType, c.target, c.change, c.text);
      counts.patches = (counts.patches ?? 0) + 1;
    }

    db.prepare("UPDATE sources SET last_sync_at = ? WHERE id = ?").run(cap, src);
  });

  try {
    tx();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    db.prepare("INSERT INTO sync_runs (connector, source_id, started_at, finished_at, status, records, message) VALUES (?, ?, ?, ?, 'error', 0, ?)").run(connector, src, started, now(), msg);
    return { ok: false, sourceId: src, counts: {}, warnings, errors: [msg] };
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  db.prepare("INSERT INTO sync_runs (connector, source_id, started_at, finished_at, status, records, message) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    connector,
    src,
    started,
    now(),
    warnings.length ? "warning" : "ok",
    total,
    warnings.slice(0, 20).join(" | ") || null,
  );
  return { ok: true, sourceId: src, counts, warnings, errors: [] };
}

const SPECIALITY_TAGS: Record<string, string> = {
  "crowd control": "aoecc",
  control: "aoecc",
  burst: "burst",
  chase: "dash",
  charge: "dash",
  regen: "selfheal",
  guard: "protect",
  support: "protect",
  initiator: "engage",
  poke: "poke",
  push: "splitpush",
  finisher: "execute",
  reap: "execute",
};

/** Profil 0–3 dérivé des notes 0–10 d'une source + spécialités (pour héros sans profil éditorial). */
export function deriveProfile(r: { durability?: number; offense?: number; control?: number; difficulty?: number }, specialities: string[], roles: string[]) {
  const s3 = (v: number | undefined) => (v == null ? 1 : Math.max(0, Math.min(3, Math.round((v / 10) * 3))));
  const tags = [...new Set(specialities.map((x) => SPECIALITY_TAGS[x.toLowerCase()]).filter(Boolean))];
  const durability = s3(r.durability);
  const cc = s3(r.control);
  const burst = s3(r.offense);
  return {
    cc,
    mobility: tags.includes("dash") ? 3 : roles.includes("Tank") ? 1 : 2,
    durability,
    engage: tags.includes("engage") || (roles.includes("Tank") && cc >= 2) ? 3 : cc >= 2 ? 2 : 1,
    peel: tags.includes("protect") || roles.includes("Support") ? 2 : 0,
    burst,
    sustain: tags.includes("selfheal") ? 3 : 1,
    tags,
  };
}

/** Import CSV simple de statistiques : hero,rank,period,winRate,pickRate,banRate */
export function csvToPackage(csv: string, meta: { sourceId: string; sourceName: string; url?: string | null; capturedAt: string; patch?: string | null }): unknown {
  const lines = csv.replace(/^﻿/, "").trim().split(/\r?\n/);
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = (k: string) => head.indexOf(k.toLowerCase());
  const num = (v: string) => Number(String(v).replace("%", "").replace(",", ".").trim());
  const heroStats = lines.slice(1).filter(Boolean).map((l) => {
    const c = l.split(sep);
    return {
      hero: c[idx("hero")]?.trim().toLowerCase(),
      rank: c[idx("rank")]?.trim().toLowerCase(),
      period: c[idx("period")]?.trim().toLowerCase(),
      winRate: num(c[idx("winRate")]),
      pickRate: num(c[idx("pickRate")]),
      banRate: num(c[idx("banRate")]),
    };
  });
  return {
    format: "mlbb-companion/v1",
    source: { id: meta.sourceId, name: meta.sourceName, kind: "statistical", url: meta.url ?? null },
    capturedAt: meta.capturedAt,
    patch: meta.patch ?? null,
    heroStats,
  };
}
