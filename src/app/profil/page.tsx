import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ProfileView } from "@/components/views/ProfileView";

export const metadata: Metadata = { title: "Mes statistiques" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader kicker="Progression" title="Mes statistiques" subtitle="Journal de rush, session, win rates. Tes données restent sur cet appareil (sauvegarde exportable depuis Sources & données)." />
      <ProfileView />
    </>
  );
}
