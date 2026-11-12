"use client";
import { PersonalStats } from "@/components/profile/PersonalStats";
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
  return <PersonalStats heroes={model.heroes} profile={me.profile} matches={me.matches} />;
}
