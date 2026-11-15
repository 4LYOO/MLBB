import type { Metadata } from "next";
import Link from "next/link";
import { Card, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Duo" };

export default function DuoPage() {
  return (
    <>
      <PageHeader kicker="À deux" title="Duo" subtitle="Vos pools de héros, le meilleur pick pour ta conjointe selon ton pick, et vos meilleures paires d'après VOS résultats." />
      <div className="mb-4">
        <Notice>Les pools perso et le mode duo du draft arrivent en phase 2 ; vos meilleures paires (calculées depuis votre journal de rush) en phase 4.</Notice>
      </div>
      <Card title="En attendant">
        <p className="mb-3 text-sm text-ink-2">Le journal de parties existe déjà : ajoute vos parties dans Stats pour que les paires soient calculées dès la phase 4.</p>
        <Link href="/profil" className="btn-primary w-full sm:w-auto">
          Ouvrir mes stats
        </Link>
      </Card>
    </>
  );
}
