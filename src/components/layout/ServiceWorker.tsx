"use client";
import { useEffect } from "react";
import { BASE_PATH } from "@/lib/client/data";

/** Enregistre le service worker (site utilisable hors ligne). Uniquement sur le site publié. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {
      /* pas de mode hors ligne, l'appli fonctionne quand même */
    });
  }, []);
  return null;
}
