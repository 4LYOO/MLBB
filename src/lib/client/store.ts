"use client";
/**
 * Données personnelles stockées dans le navigateur (localStorage) : rien n'est envoyé à un serveur.
 * Profil, parties, drafts, favoris, filtres, consultations récentes, builds perso,
 * patchs saisis et paquets de données importés manuellement.
 * Sauvegarde/restauration via un fichier JSON (page Sources & données).
 */
import { useSyncExternalStore } from "react";
import { validatePackage } from "@/lib/data/schema";
import type { Build, Patch } from "@/lib/data/model";

export interface Profile {
  nickname: string | null;
  playerId: string | null;
  server: string | null;
  rank: string | null;
  stars: number | null;
  mainRole: string | null;
  secondRole: string | null;
  favoriteHeroes: string[];
  updatedAt: string | null;
}
export interface Match {
  id: number;
  playedAt: string;
  hero: string;
  role: string | null;
  result: "win" | "loss";
  kills: number;
  deaths: number;
  assists: number;
  durationMin: number | null;
  mvp: boolean;
  rank: string | null;
  notes: string | null;
  entry: string;
}
export interface SavedDraft {
  id: number;
  name: string;
  mode: string;
  state: unknown;
  summary: unknown;
  createdAt: string;
  updatedAt: string;
}
export interface SavedFilter {
  id: number;
  page: string;
  name: string;
  params: Record<string, string>;
  createdAt: string;
}
export interface LocalPackage {
  id: number;
  addedAt: string;
  label: string;
  data: unknown;
}
export interface PersonalData {
  version: 1;
  profile: Profile;
  matches: Match[];
  drafts: SavedDraft[];
  favorites: { kind: string; ref: string; createdAt: string }[];
  filters: SavedFilter[];
  recent: { kind: string; ref: string; label: string; at: string }[];
  builds: Build[];
  patches: Patch[];
  packages: LocalPackage[];
}

const KEY = "mlbb-companion:v1";
const now = () => new Date().toISOString();
const newId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

export const EMPTY: PersonalData = {
  version: 1,
  profile: { nickname: null, playerId: null, server: null, rank: null, stars: null, mainRole: null, secondRole: null, favoriteHeroes: [], updatedAt: null },
  matches: [],
  drafts: [],
  favorites: [],
  filters: [],
  recent: [],
  builds: [],
  patches: [],
  packages: [],
};

let state: PersonalData = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    state = EMPTY;
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      state = { ...EMPTY, ...JSON.parse(e.newValue) };
      listeners.forEach((l) => l());
    }
  });
}

export class StorageFullError extends Error {}

function set(next: PersonalData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new StorageFullError("Stockage du navigateur plein : supprime d'anciens imports ou exporte une sauvegarde.");
  }
  state = next;
  listeners.forEach((l) => l());
}
const update = (fn: (s: PersonalData) => PersonalData) => {
  load();
  set(fn(state));
};

export function usePersonal(): PersonalData {
  return useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      load();
      return state;
    },
    () => EMPTY,
  );
}

// ------------------------------------------------------------------ actions
export const personal = {
  saveProfile(p: Omit<Profile, "updatedAt">) {
    update((s) => ({ ...s, profile: { ...p, updatedAt: now() } }));
  },
  addMatch(m: Omit<Match, "id">) {
    update((s) => ({ ...s, matches: [{ ...m, id: newId() }, ...s.matches].sort((a, b) => b.playedAt.localeCompare(a.playedAt) || b.id - a.id) }));
  },
  deleteMatch(id: number) {
    update((s) => ({ ...s, matches: s.matches.filter((m) => m.id !== id) }));
  },
  saveDraft(d: { id?: number; name: string; mode: string; state: unknown; summary: unknown }): number {
    const id = d.id ?? newId();
    update((s) => {
      const existing = s.drafts.find((x) => x.id === id);
      const rec: SavedDraft = { id, name: d.name, mode: d.mode, state: d.state, summary: d.summary, createdAt: existing?.createdAt ?? now(), updatedAt: now() };
      return { ...s, drafts: [rec, ...s.drafts.filter((x) => x.id !== id)] };
    });
    return id;
  },
  deleteDraft(id: number) {
    update((s) => ({ ...s, drafts: s.drafts.filter((d) => d.id !== id) }));
  },
  toggleFavorite(kind: string, ref: string): boolean {
    load();
    const on = state.favorites.some((f) => f.kind === kind && f.ref === ref);
    update((s) => ({ ...s, favorites: on ? s.favorites.filter((f) => !(f.kind === kind && f.ref === ref)) : [{ kind, ref, createdAt: now() }, ...s.favorites] }));
    return !on;
  },
  saveFilter(page: string, name: string, params: Record<string, string>) {
    update((s) => ({ ...s, filters: [{ id: newId(), page, name, params, createdAt: now() }, ...s.filters] }));
  },
  deleteFilter(id: number) {
    update((s) => ({ ...s, filters: s.filters.filter((f) => f.id !== id) }));
  },
  addRecent(kind: string, ref: string, label: string) {
    update((s) => ({ ...s, recent: [{ kind, ref, label, at: now() }, ...s.recent.filter((r) => !(r.kind === kind && r.ref === ref))].slice(0, 30) }));
  },
  saveBuild(b: { hero: string; title: string; type: string; items: string[] }) {
    update((s) => ({
      ...s,
      builds: [{ id: `u${newId()}`, hero: b.hero, title: b.title, type: b.type, items: b.items, emblem: null, talents: [], spell: null, notes: null, sampleSize: null, sourceId: "manual", capturedAt: now(), isUser: true }, ...s.builds],
    }));
  },
  deleteBuild(id: string) {
    update((s) => ({ ...s, builds: s.builds.filter((b) => b.id !== id) }));
  },
  savePatch(p: { version: string; date: string | null; server: string | null; title: string | null; url: string | null; changes: { targetType: string; target: string; change: string; text: string }[] }) {
    const patch: Patch = { ...p, sourceId: "manual", capturedAt: now(), isUser: true, changes: p.changes.map((c, i) => ({ id: `${p.version}-u${i}`, version: p.version, ...c })) };
    update((s) => ({ ...s, patches: [patch, ...s.patches.filter((x) => x.version !== p.version)] }));
  },
  deletePatch(version: string) {
    update((s) => ({ ...s, patches: s.patches.filter((x) => x.version !== version) }));
  },
  /** Valide puis conserve un paquet de données importé manuellement. */
  addPackage(data: unknown, label: string): { ok: boolean; errors: string[]; counts: Record<string, number> } {
    const v = validatePackage(data);
    if (!v.ok) return { ok: false, errors: v.errors, counts: {} };
    const d = v.data;
    const counts: Record<string, number> = {};
    for (const k of ["heroes", "heroStats", "matchups", "proStats", "items", "builds", "patches"] as const) if (d[k]?.length) counts[k] = d[k]!.length;
    try {
      update((s) => ({ ...s, packages: [...s.packages, { id: newId(), addedAt: now(), label, data: d }] }));
    } catch (e) {
      return { ok: false, errors: [e instanceof Error ? e.message : String(e)], counts: {} };
    }
    return { ok: true, errors: [], counts };
  },
  removePackage(id: number) {
    update((s) => ({ ...s, packages: s.packages.filter((p) => p.id !== id) }));
  },
  exportBackup() {
    load();
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mlbb-companion-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  importBackup(json: string): { ok: boolean; error?: string } {
    try {
      const d = JSON.parse(json);
      if (d?.version !== 1 || !Array.isArray(d.matches)) return { ok: false, error: "Ce fichier n'est pas une sauvegarde MLBB Companion." };
      set({ ...EMPTY, ...d });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
  reset() {
    set(EMPTY);
  },
};
