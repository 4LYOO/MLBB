"use client";
import { useData } from "@/lib/client/data";
import { Notice } from "@/components/ui";

/** Squelette pendant le chargement des données publiées + avertissement en cas d'échec. */
export function DataGate({ children }: { children: React.ReactNode }) {
  const { status, error } = useData();
  if (status === "loading")
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Chargement">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-28 animate-pulse" />
        ))}
      </div>
    );
  return (
    <>
      {error && (
        <div className="mb-4">
          <Notice tone="warn">{error}</Notice>
        </div>
      )}
      {children}
    </>
  );
}
