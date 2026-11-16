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
