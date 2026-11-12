"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import clsx from "clsx";
import { useData } from "@/lib/client/data";
import { catalogOf } from "@/lib/data/model";
import { NAV } from "./nav";
import { GUIDES } from "@/data/reference/guides";
import { EDITORIAL_EMBLEMS, EDITORIAL_SPELLS } from "@/data/reference/items";
import { LANE_FR, ROLE_FR } from "@/lib/domain";

interface Entry {
  kind: string;
  label: string;
  sub: string;
  href: string;
  keywords: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const listeners = new Set<() => void>();
export function openSearch() {
  listeners.forEach((l) => l());
}

export function SearchButton({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <button className="btn-ghost min-h-10 px-3" aria-label="Rechercher" onClick={openSearch}>
      <Search size={18} />
    </button>
  ) : (
    <button onClick={openSearch} className="glass-inset flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted hover:text-ink">
      <Search size={16} /> Rechercher…
      <kbd className="ml-auto rounded border border-line px-1.5 text-[10px]">Ctrl K</kbd>
    </button>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { model } = useData();
  const entries = useMemo<Entry[]>(
    () => [
      ...NAV.map((n) => ({ kind: "Page", label: n.label, sub: "", href: n.href, keywords: n.short })),
      ...model.heroes.map((h) => ({
        kind: "Héros",
        label: h.name,
        sub: [h.roles.map((r) => ROLE_FR[r]).join(" / "), h.lanes.map((l) => LANE_FR[l]).join(", ")].filter(Boolean).join(" · "),
        href: `/heros/${h.slug}`,
        keywords: `${h.slug} ${h.roles.join(" ")} ${h.lanes.join(" ")}`,
      })),
      ...model.heroes.map((h) => ({ kind: "Build", label: `Build ${h.name}`, sub: "Équipements & emblèmes", href: `/builds?hero=${h.slug}`, keywords: h.slug })),
      ...model.items.map((i) => ({ kind: "Objet", label: i.name, sub: i.use ?? (i.price ? `${i.price} or` : ""), href: `/builds?tab=items&item=${i.slug}`, keywords: `${i.slug} ${i.tags.join(" ")}` })),
      ...EDITORIAL_SPELLS.map((s) => ({ kind: "Sort", label: s.name, sub: s.nameFr, href: `/builds?tab=spells`, keywords: `${s.nameFr} ${s.use}` })),
      ...EDITORIAL_EMBLEMS.map((e) => ({ kind: "Emblème", label: `Emblème ${e.nameFr}`, sub: e.name, href: `/builds?tab=emblems`, keywords: e.name })),
      ...catalogOf(model, "talent").map((t) => ({ kind: "Talent", label: String(t.data.name), sub: `Palier ${t.data.tier ?? "?"}`, href: `/builds?tab=emblems`, keywords: String(t.data.benefits ?? "") })),
      ...GUIDES.map((g) => ({ kind: "Guide", label: g.title, sub: g.category, href: `/guides/${g.slug}`, keywords: `${g.summary} ${g.roles.join(" ")}` })),
    ],
    [model],
  );

  const show = useCallback(() => {
    setOpen(true);
    setQ("");
    setSel(0);
  }, []);

  useEffect(() => {
    listeners.add(show);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      listeners.delete(show);
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return entries.filter((e) => e.kind === "Page").slice(0, 12);
    return entries
      .map((e) => {
        const l = norm(e.label);
        const score = l === n ? 100 : l.startsWith(n) ? 80 : l.includes(n) ? 60 : norm(e.keywords).includes(n) ? 30 : 0;
        return { e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.label.localeCompare(b.e.label))
      .slice(0, 14)
      .map((x) => x.e);
  }, [q, entries]);

  const go = (e: Entry) => {
    setOpen(false);
    router.push(e.href);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[calc(env(safe-area-inset-top)+4vh)] sm:pt-[10vh]" role="dialog" aria-modal="true" aria-label="Recherche globale">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="glass-strong relative w-full max-w-xl animate-fade-in overflow-hidden rounded-3xl">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, results.length - 1));
              if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
              if (e.key === "Enter" && results[sel]) go(results[sel]);
            }}
            placeholder="Héros, objet, sort, guide, page…"
            className="w-full bg-transparent py-3.5 text-base outline-none placeholder:text-muted sm:text-sm"
          />
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Aucun résultat.</li>}
          {results.map((r, i) => (
            <li key={r.kind + r.href + r.label}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => go(r)}
                className={clsx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm", i === sel ? "bg-primary/15 text-ink" : "text-ink-2")}
              >
                <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted">{r.kind}</span>
                <span className="font-medium">{r.label}</span>
                <span className="ml-auto truncate text-xs text-muted">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
