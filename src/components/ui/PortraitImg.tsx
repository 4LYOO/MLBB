"use client";
import { useEffect, useRef, useState } from "react";

/** Portrait distant : se masque proprement s'il ne charge pas (hors ligne, CDN indisponible). */
export function PortraitImg({ src }: { src: string }) {
  const [ok, setOk] = useState(true);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // Une erreur survenue avant l'hydratation n'appelle pas onError : on vérifie l'état au montage.
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setOk(false);
  }, []);
  if (!ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt="" onError={() => setOk(false)} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
}
