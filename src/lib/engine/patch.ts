import type { Hero } from "@/lib/domain";
import { ARCHETYPE_ITEMS, archetypeOf } from "./builds";

export interface ImpactInput {
  targetType: string;
  target: string;
  change: string;
  text: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Héros potentiellement impactés par un patch :
 *  - directement (cible du changement ou nom cité dans le texte),
 *  - indirectement (objet modifié présent dans le build de base de leur archétype).
 */
export function impactedHeroes(changes: ImpactInput[], heroes: Hero[], items: { slug: string; name: string }[]) {
  const direct = new Map<string, string[]>();
  const indirect = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, k: string, v: string) => m.set(k, [...new Set([...(m.get(k) ?? []), v])]);
  for (const c of changes) {
    const t = norm(c.target);
    const txt = norm(c.text);
    for (const h of heroes) {
      const n = norm(h.name);
      if (t === h.slug || t === n) push(direct, h.slug, `${c.change} : ${c.text}`);
      else if (n.length > 3 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(txt)) push(direct, h.slug, `cité : ${c.text}`);
    }
    if (c.targetType === "item") {
      const it = items.find((i) => i.slug === t || norm(i.name) === t);
      if (it) for (const h of heroes) if (h.profile && ARCHETYPE_ITEMS[archetypeOf(h)].includes(it.slug) && !direct.has(h.slug)) push(indirect, h.slug, `${it.name} (${c.change})`);
    }
  }
  return { direct, indirect };
}

/** Lignes « type | cible | changement | texte » → changements structurés. */
export function parseChangeLines(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [targetType = "system", target = "", change = "other", ...rest] = l.split("|").map((x) => x.trim());
      return { targetType, target, change, text: rest.join(" | ") || target };
    })
    .filter((c) => c.target);
}
