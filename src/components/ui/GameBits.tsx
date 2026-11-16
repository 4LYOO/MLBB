"use client";
/**
 * Petits éléments réutilisables : emblème, talent et sort de combat avec icône + nom français.
 * Les icônes viennent de data/items.json (mlbb.io) ; repli sur l'initiale si l'image ne charge pas.
 */
import { EDITORIAL_SPELLS, emblemOf, talentOf } from "@/data/reference/items";
import { GameIcon } from "./Portrait";

const EMBLEM_COLOR: Record<string, string> = { common: "#9ca3af", tank: "#38bdf8", assassin: "#a855f7", mage: "#6366f1", fighter: "#f97316", support: "#22c55e", marksman: "#eab308" };

export function EmblemChip({ name, size = 28, showEn = false }: { name: string; size?: number; showEn?: boolean }) {
  const e = emblemOf(name);
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <GameIcon src={e?.image} label={e?.nameFr ?? name} size={size} color={EMBLEM_COLOR[e?.slug ?? ""] ?? "#6b8cff"} round />
      <b>{e?.nameFr ?? name}</b>
      {showEn && e && e.name !== e.nameFr && <span className="text-xs text-muted">({e.name})</span>}
    </span>
  );
}

export function TalentChip({ name, size = 22 }: { name: string; size?: number }) {
  const t = talentOf(name);
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <GameIcon src={t?.image} label={t?.nameFr ?? name} size={size} color="#f7c948" round />
      <span>{t?.nameFr ?? name}</span>
    </span>
  );
}

/** Liste de talents (noms anglais) avec icônes. */
export function TalentList({ names, size }: { names: string[]; size?: number }) {
  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
      {names.map((n) => (
        <TalentChip key={n} name={n} size={size} />
      ))}
    </span>
  );
}

export function SpellChip({ slugOrName, size = 28, showEn = false }: { slugOrName: string; size?: number; showEn?: boolean }) {
  const k = slugOrName.toLowerCase();
  const s = EDITORIAL_SPELLS.find((x) => x.slug === k || x.name.toLowerCase() === k);
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <GameIcon src={s?.image} label={s?.nameFr ?? slugOrName} size={size} color="#22d3ee" round />
      <b>{s?.nameFr ?? slugOrName}</b>
      {showEn && s && s.name !== s.nameFr && <span className="text-xs text-muted">({s.name})</span>}
    </span>
  );
}
