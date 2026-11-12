"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGrid, X } from "lucide-react";
import clsx from "clsx";
import { MOBILE_NAV, NAV } from "./nav";
import { SearchButton } from "./CommandPalette";

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className={clsx("grid place-items-center rounded-2xl bg-gradient-to-br from-primary via-violet to-gold font-black text-white shadow-lg shadow-primary/30 ring-1 ring-white/30", small ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm")}>ML</span>
      <span className="leading-tight">
        <span className={clsx("h-display block text-ink", small ? "text-base" : "text-lg")}>MLBB Companion</span>
        {!small && <span className="block text-[10px] uppercase tracking-[0.22em] text-gold/80">Analyse & draft</span>}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  const tabs = NAV.filter((n) => MOBILE_NAV.includes(n.href));
  const others = NAV.filter((n) => !MOBILE_NAV.includes(n.href));
  const otherActive = others.some((n) => isActive(path, n.href));

  return (
    <>
      {/* Ordinateur : barre latérale en verre */}
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-64 flex-col rounded-3xl lg:flex">
        <div className="px-4 py-5">
          <Logo />
        </div>
        <div className="px-3 pb-3">
          <SearchButton />
        </div>
        <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition", isActive(path, href) ? "bg-white/10 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" : "text-ink-2 hover:bg-white/5 hover:text-ink")}
            >
              <Icon size={18} className={isActive(path, href) ? "text-gold" : "text-muted"} />
              {label}
            </Link>
          ))}
        </nav>
        <p className="border-t border-line px-5 py-3 text-[11px] leading-snug text-muted">Projet de fan, non affilié à Moonton. Les estimations ne sont pas des certitudes.</p>
      </aside>

      {/* iPhone : en-tête translucide (zone de sécurité haute) */}
      <header className="glass-strong pt-safe sticky top-0 z-30 rounded-b-3xl border-t-0 lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <Logo small />
          <SearchButton compact />
        </div>
      </header>

      {/* iPhone : barre d'onglets flottante */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden" aria-label="Navigation rapide">
        <div className="glass-strong mx-auto mb-2 grid max-w-md grid-cols-5 rounded-[28px] p-1.5">
          {tabs.map(({ href, short, icon: Icon }) => (
            <Link key={href} href={href} className={clsx("flex flex-col items-center gap-0.5 rounded-[22px] py-1.5 text-[10px] font-medium transition", isActive(path, href) ? "bg-white/12 text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" : "text-muted active:bg-white/5")}>
              <Icon size={22} strokeWidth={isActive(path, href) ? 2.4 : 2} />
              {short}
            </Link>
          ))}
          <button onClick={() => setMore(true)} className={clsx("flex flex-col items-center gap-0.5 rounded-[22px] py-1.5 text-[10px] font-medium", otherActive ? "bg-white/12 text-gold" : "text-muted")} aria-haspopup="dialog">
            <LayoutGrid size={22} />
            Plus
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Plus de pages">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMore(false)} />
          <div className="glass-strong pb-safe absolute inset-x-2 bottom-2 animate-sheet rounded-[32px] p-4">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/25" />
            <div className="mb-3 flex items-center justify-between">
              <span className="h-display text-lg">Toutes les pages</span>
              <button className="btn-ghost min-h-9 px-2.5" aria-label="Fermer" onClick={() => setMore(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {others.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={clsx("glass flex flex-col items-center gap-2 rounded-3xl p-3 text-center text-xs active:scale-95", isActive(path, href) ? "text-gold" : "text-ink-2")}>
                  <Icon size={24} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
