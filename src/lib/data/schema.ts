import { z } from "zod";
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

export function validatePackage(input: unknown): { ok: true; data: DataPackage } | { ok: false; errors: string[] } {
  const r = DataPackageSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, errors: r.error.issues.slice(0, 30).map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`) };
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
