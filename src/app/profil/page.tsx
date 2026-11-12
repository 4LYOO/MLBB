import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ProfileView } from "@/components/views/ProfileView";

export const metadata: Metadata = { title: "Mes statistiques" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader kicker="Progression" title="Mes statistiques" subtitle="Profil, historique des parties, progression et coach personnel. Tes données restent sur cet appareil (sauvegarde exportable depuis Sources & données)." />
      <ProfileView />
    </>
  );
}
