import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { PersonalStats } from "@/components/profile/PersonalStats";
import { getHeroes, getMatches, getProfile } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes statistiques" };

export default function ProfilePage() {
  const profile = getProfile();
  return (
    <>
      <PageHeader
        kicker="Progression"
        title={profile.nickname ? `Statistiques de ${profile.nickname}` : "Mes statistiques"}
        subtitle="Profil, historique des parties, progression et coach personnel. Données saisies par toi (source « manuelle »), stockées uniquement dans ta base locale."
      />
      <PersonalStats heroes={getHeroes()} profile={profile} matches={getMatches()} />
    </>
  );
}
