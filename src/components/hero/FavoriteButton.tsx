"use client";
import { useEffect } from "react";
import { Heart } from "lucide-react";
import clsx from "clsx";
import { personal, usePersonal } from "@/lib/client/store";

export function FavoriteButton({ kind, refId, label }: { kind: "hero" | "build" | "guide"; refId: string; initial?: boolean; label?: string }) {
  const me = usePersonal();
  const fav = me.favorites.some((f) => f.kind === kind && f.ref === refId);
  return (
    <button onClick={() => personal.toggleFavorite(kind, refId)} className={clsx("btn-ghost", fav && "!border-gold/60 text-gold")} aria-pressed={fav}>
      <Heart size={16} fill={fav ? "currentColor" : "none"} /> {label ?? (fav ? "Favori" : "Ajouter aux favoris")}
    </button>
  );
}

/** Enregistre la consultation dans « Dernières analyses ». */
export function TrackRecent({ kind, refId, label }: { kind: string; refId: string; label: string }) {
  useEffect(() => {
    if (label) personal.addRecent(kind, refId, label);
  }, [kind, refId, label]);
  return null;
}
