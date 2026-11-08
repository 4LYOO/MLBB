"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { buildModel, type Model } from "@/lib/data/model";
import type { PublishedFile, HistoryFile } from "@/lib/data/published";
import { historyToPackages } from "@/lib/data/published";
import { usePersonal } from "./store";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (p: string) => `${BASE_PATH}${p}`;

interface Ctx {
  model: Model;
  status: "loading" | "ready" | "error";
  published: PublishedFile | null;
  error: string | null;
}
const DataCtx = createContext<Ctx | null>(null);

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(asset(path), { cache: "no-cache" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Charge les données publiées (synchro GitHub Actions) une fois, puis les fusionne avec les imports locaux. */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [published, setPublished] = useState<PublishedFile | null>(null);
  const [history, setHistory] = useState<HistoryFile | null>(null);
  const [status, setStatus] = useState<Ctx["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const me = usePersonal();

  useEffect(() => {
    let alive = true;
    Promise.all([getJson<PublishedFile>("/data/published.json"), getJson<HistoryFile>("/data/history.json")]).then(([p, h]) => {
      if (!alive) return;
      setPublished(p);
      setHistory(h);
      if (!p) setError("Données publiées introuvables : seules les références et tes imports locaux sont affichés.");
      setStatus(p ? "ready" : "error");
    });
    return () => {
      alive = false;
    };
  }, []);

  const model = useMemo(
    () =>
      buildModel({
        packages: [...(history ? historyToPackages(history) : []), ...(published?.packages ?? []), ...me.packages.map((p) => p.data)],
        userBuilds: me.builds,
        userPatches: me.patches,
      }),
    [published, history, me.packages, me.builds, me.patches],
  );

  return <DataCtx.Provider value={{ model, status, published, error }}>{children}</DataCtx.Provider>;
}

export function useData(): Ctx {
  const c = useContext(DataCtx);
  if (!c) throw new Error("useData doit être utilisé dans <DataProvider>");
  return c;
}
