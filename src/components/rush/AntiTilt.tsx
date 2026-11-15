"use client";
/**
 * Bannière anti-tilt : « pause conseillée » après N défaites d'affilée (réglage dans data/config.json).
 * Désactivable dans l'onglet Stats ; « Masquer » la cache jusqu'à la prochaine partie.
 */
import { Coffee, X } from "lucide-react";
import { personal, usePersonal } from "@/lib/client/store";
import { currentStreak, shouldPause, uniqueGames } from "@/lib/engine/rush";

export function AntiTiltBanner() {
  const me = usePersonal();
  if (!me.prefs.antiTilt || !shouldPause(me.matches)) return null;
  const games = uniqueGames(me.matches);
  const last = games[games.length - 1];
  const lastKey = String(last?.id ?? "");
  // Masquée pour cette série : réapparaît si une nouvelle défaite arrive.
  if (me.prefs.antiTiltMasqueA === lastKey) return null;
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-bad/50 bg-bad/15 p-3" role="alert">
      <Coffee size={26} className="shrink-0 text-bad" />
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-bold">Pause conseillée</p>
        <p className="text-sm text-ink-2">{-currentStreak(me.matches)} défaites d&apos;affilée : 10 minutes de pause évitent de perdre des étoiles.</p>
      </div>
      <button className="btn-ghost min-h-11 min-w-11 px-0" aria-label="Masquer" onClick={() => personal.setPref("antiTiltMasqueA", lastKey)}>
        <X size={18} />
      </button>
    </div>
  );
}
