"use client";
/**
 * Image distante avec repli : tant que l'image n'est pas chargée (ou hors ligne, ou adresse cassée),
 * on affiche le repli (initiales). Jamais d'icône « image cassée ».
 */
import { useEffect, useRef, useState } from "react";

export function RemoteImage({ src, alt = "", className }: { src: string; alt?: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  // L'image peut finir de charger avant que React soit prêt : on vérifie à l'affichage.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) setState(img.naturalWidth > 0 ? "ok" : "error");
    else setState("loading");
  }, [src]);
  if (state === "error") return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onLoad={() => setState("ok")}
      onError={() => setState("error")}
      className={className}
      style={{ opacity: state === "ok" ? 1 : 0, transition: "opacity 150ms ease-out" }}
    />
  );
}

/**
 * Icône de jeu (sort, emblème, talent) : image si disponible, sinon pastille avec l'initiale.
 */
export function GameIcon({ src, label, size = 32, color = "#6b8cff", round = false }: { src?: string | null; label: string; size?: number; color?: string; round?: boolean }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden font-bold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: round ? 999 : Math.round(size * 0.3),
        fontSize: size * 0.4,
        background: `linear-gradient(150deg, ${color}66, #0b0c12)`,
        boxShadow: `inset 0 0 0 1px ${color}88, inset 0 1px 0 rgba(255,255,255,0.25)`,
      }}
      aria-hidden
    >
      {label.slice(0, 1).toUpperCase()}
      {src && <RemoteImage src={src} className="absolute inset-0 h-full w-full object-cover" />}
    </span>
  );
}
