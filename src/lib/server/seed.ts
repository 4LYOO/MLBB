import type Database from "better-sqlite3";
import { parseEditorialHeroes } from "@/data/reference/heroes";
import { EDITORIAL_ITEMS } from "@/data/reference/items";
import { SOURCES, VERIFIED_ON } from "@/data/reference/sources";

/**
 * Amorce/actualise les données de référence. Idempotent.
 * Règle : une donnée importée depuis une source externe n'est jamais écrasée
 * par le référentiel éditorial (on ne met à jour que les lignes source_id='editorial').
 */
export function seedReference(db: Database.Database) {
  const ts = `${VERIFIED_ON}T00:00:00.000Z`;
  const tx = db.transaction(() => {
    const upSource = db.prepare(`
      INSERT INTO sources (id, name, kind, url, reliability, access, terms, notes)
      VALUES (@id, @name, @kind, @url, @reliability, @access, @terms, @notes)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, kind=excluded.kind, url=excluded.url,
        reliability=excluded.reliability, access=excluded.access, terms=excluded.terms, notes=excluded.notes`);
    for (const s of SOURCES) upSource.run(s);

    const upHero = db.prepare(`
      INSERT INTO heroes (slug, name, roles, lanes, damage, range, difficulty, confidence, incomplete, portrait_url, source_id, updated_at)
      VALUES (@slug, @name, @roles, @lanes, @damage, @range, @difficulty, @confidence, @incomplete, NULL, 'editorial', @ts)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, roles=excluded.roles, lanes=excluded.lanes,
        damage=excluded.damage, range=excluded.range, difficulty=excluded.difficulty,
        confidence=excluded.confidence, incomplete=excluded.incomplete
      WHERE heroes.source_id = 'editorial'`);
    const upProfile = db.prepare(`
      INSERT INTO hero_profiles (slug, cc, mobility, durability, engage, peel, burst, sustain, early, mid, late, tags, source_id, updated_at)
      VALUES (@slug, @cc, @mobility, @durability, @engage, @peel, @burst, @sustain, @early, @mid, @late, @tags, 'editorial', @ts)
      ON CONFLICT(slug) DO UPDATE SET cc=excluded.cc, mobility=excluded.mobility, durability=excluded.durability,
        engage=excluded.engage, peel=excluded.peel, burst=excluded.burst, sustain=excluded.sustain,
        early=excluded.early, mid=excluded.mid, late=excluded.late, tags=excluded.tags
      WHERE hero_profiles.source_id = 'editorial'`);
    for (const h of parseEditorialHeroes()) {
      upHero.run({
        slug: h.slug,
        name: h.name,
        roles: JSON.stringify(h.roles),
        lanes: JSON.stringify(h.lanes),
        damage: h.damage,
        range: h.range,
        difficulty: h.difficulty,
        confidence: h.confidence,
        incomplete: h.incomplete ? 1 : 0,
        ts,
      });
      if (h.profile) {
        const [cc, mobility, durability, engage, peel, burst, sustain, early, mid, late] = h.profile;
        upProfile.run({ slug: h.slug, cc, mobility, durability, engage, peel, burst, sustain, early, mid, late, tags: JSON.stringify(h.tags), ts });
      }
    }

    const upItem = db.prepare(`
      INSERT INTO items (slug, name, category, tags, use, source_id, updated_at)
      VALUES (@slug, @name, @category, @tags, @use, 'editorial', @ts)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, category=excluded.category, tags=excluded.tags, use=excluded.use
      WHERE items.source_id = 'editorial'`);
    for (const it of EDITORIAL_ITEMS) upItem.run({ ...it, tags: JSON.stringify(it.tags), ts });
  });
  tx();
}
