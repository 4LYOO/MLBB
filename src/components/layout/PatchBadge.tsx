"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { HEROES_META } from "@/data/reference/heroes";
import config from "@data/config.json";

/** Nombre de jours entre la date de mise à jour des données et aujourd'hui. */
export function dataAgeDays(dateMaj: string, now = Date.now()) {
  return Math.floor((now - new Date(`${dateMaj}T00:00:00`).getTime()) / 86_400_000);
}

/**
 * Badge « Patch X · mis à jour le JJ/MM » (lu dans l'en-tête de data/heroes.json).
 * Orange « données peut-être anciennes » au-delà de config.badge.joursAvantAvertissement jours.
 */
export function PatchBadge({ compact = false }: { compact?: boolean }) {
  // L'âge est calculé sur le téléphone (pas au moment de la construction du site).
  const [age, setAge] = useState<number | null>(null);
  useEffect(() => setAge(dataAgeDays(HEROES_META.dateMaj)), []);
  const old = age != null && age > config.badge.joursAvantAvertissement;
  const [y, m, d] = HEROES_META.dateMaj.split("-");
  return (
    <Link
      href="/nouveautes"
      className={clsx(
        "inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold whitespace-nowrap",
        old ? "border-warn/70 bg-warn/15 text-warn" : "border-white/15 bg-white/5 text-ink-2",
      )}
      title={`Données de jeu : patch ${HEROES_META.patch}, mises à jour le ${d}/${m}/${y}${age != null ? ` (il y a ${age} j)` : ""}`}
    >
      Patch {HEROES_META.patch} · {d}/{m}
      {old && !compact && <span> · données peut-être anciennes</span>}
      {old && compact && <span aria-label="données peut-être anciennes">⚠︎</span>}
    </Link>
  );
}
