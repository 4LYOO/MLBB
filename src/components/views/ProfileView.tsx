"use client";
/**
 * Onglet Stats : journal de rush rapide (2 taps), bilan de session, win rates,
 * puis le suivi détaillé existant (profil, saisie complète, graphiques, coach) replié.
 */
import { PersonalStats } from "@/components/profile/PersonalStats";
import { AntiTiltBanner } from "@/components/rush/AntiTilt";
import { RushJournal } from "@/components/rush/RushJournal";
import { RushStats } from "@/components/rush/RushStats";
import { CaptureImport } from "@/components/rush/CaptureImport";
import { RecentGames } from "@/components/rush/RecentGames";
import { useData } from "@/lib/client/data";
import { usePersonal } from "@/lib/client/store";
import { DataGate } from "./Loading";

export function ProfileView() {
  return (
    <DataGate>
      <Inner />
    </DataGate>
  );
}
function Inner() {
  const { model } = useData();
  const me = usePersonal();
  return (
    <div className="space-y-3">
      <AntiTiltBanner />
      <RushJournal heroes={model.heroes} />
      <CaptureImport heroes={model.heroes} />
      <RecentGames heroes={model.heroes} />
      <RushStats heroes={model.heroes} />
      <details className="card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center px-4 font-bold [&::-webkit-details-marker]:hidden">Suivi détaillé (KDA, graphiques, coach) ›</summary>
        <div className="p-3">
          <PersonalStats heroes={model.heroes} profile={me.profile} matches={me.matches} />
        </div>
      </details>
    </div>
  );
}
