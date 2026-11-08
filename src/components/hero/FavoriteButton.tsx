"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import clsx from "clsx";

export function FavoriteButton({ kind, refId, initial, label }: { kind: "hero" | "build" | "guide"; refId: string; initial: boolean; label?: string }) {
  const [fav, setFav] = useState(initial);
  const toggle = async () => {
    const r = await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, ref: refId }) });
    if (r.ok) setFav((await r.json()).favorite);
  };
  return (
    <button onClick={toggle} className={clsx("btn-ghost", fav && "border-gold/60 text-gold")} aria-pressed={fav}>
      <Heart size={16} fill={fav ? "currentColor" : "none"} /> {label ?? (fav ? "Favori" : "Ajouter aux favoris")}
    </button>
  );
}

/** Enregistre la consultation dans « Dernières analyses ». */
export function TrackRecent({ kind, refId, label }: { kind: string; refId: string; label: string }) {
  useEffect(() => {
    fetch("/api/recent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, ref: refId, label }) }).catch(() => {});
  }, [kind, refId, label]);
  return null;
}
