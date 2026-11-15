"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { MORE, NAV, TABS, isActive } from "./nav";
import { SearchButton } from "./CommandPalette";
import { PatchBadge } from "./PatchBadge";

function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="Accueil (Draft)">
      <span className={clsx("grid place-items-center rounded-xl bg-white font-black text-black", small ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-sm")}>ML</span>
      {!small && (
        <span className="leading-tight">
          <span className="h-display block text-lg text-ink">MLBB Companion</span>
          <span className="block text-[10px] uppercase tracking-[0.22em] text-gold">Rush & draft</span>
        </span>
      )}
    </Link>
  );
}

/**
 * Navigation :
 *  - iPhone : en-tête (logo, badge du patch, recherche, menu « Plus ») + 5 onglets en bas, à portée du pouce ;
 *  - ordinateur : barre latérale avec toutes les pages.
 */
export function Sidebar() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]); // referme le menu après une navigation

  return (
    <>
      {/* Ordinateur : barre latérale */}
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-64 flex-col rounded-3xl lg:flex">
        <div className="space-y-3 px-4 py-5">
          <Logo />
          <PatchBadge />
        </div>
        <div className="px-3 pb-3">
          <SearchButton />
        </div>
        <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
          {NAV.map(({ href, label, icon: Icon }, i) => (
            <div key={href}>
              {i === TABS.length && <p className="mb-1 mt-3 px-3 text-[10px] uppercase tracking-wider text-muted">Plus</p>}
              <Link href={href} className={clsx("flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm", isActive(path, href) ? "bg-white/10 text-ink" : "text-ink-2 hover:bg-white/5 hover:text-ink")}>
                <Icon size={18} className={isActive(path, href) ? "text-gold" : "text-muted"} />
                {label}
              </Link>
            </div>
          ))}
        </nav>
        <p className="border-t border-line px-5 py-3 text-[11px] leading-snug text-muted">Projet de fan, non affilié à Moonton. Les estimations ne sont pas des certitudes.</p>
      </aside>

      {/* iPhone : en-tête fixe sous l'encoche / Dynamic Island */}
      <header className="glass-strong pt-safe sticky top-0 z-30 border-x-0 border-t-0 lg:hidden">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <Logo small />
          <PatchBadge compact />
          <div className="ml-auto flex items-center gap-1.5">
            <SearchButton compact />
            <button className="btn-ghost min-h-11 min-w-11 px-0" onClick={() => setMore(true)} aria-haspopup="dialog" aria-label="Plus de pages">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* iPhone : 5 onglets en bas (zone de sécurité de la barre d'accueil respectée) */}
      <nav className="glass-strong pb-safe fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 lg:hidden" aria-label="Onglets">
        <div className="mx-auto grid max-w-md grid-cols-5 px-1 pt-1">
          {TABS.map(({ href, short, icon: Icon }) => {
            const on = isActive(path, href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined} className={clsx("flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold", on ? "text-gold" : "text-muted")}>
                <Icon size={24} strokeWidth={on ? 2.4 : 1.9} />
                {short}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Menu « Plus » : toutes les autres pages */}
      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Plus de pages">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMore(false)} />
          <div className="glass-strong pt-safe absolute inset-x-0 top-0 animate-fade-in rounded-b-[28px] border-t-0 p-3 pb-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="h-display text-lg">Plus</span>
              <button className="btn-ghost min-h-11 min-w-11 px-0" aria-label="Fermer" onClick={() => setMore(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MORE.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={clsx("glass flex min-h-14 min-w-0 items-center gap-2.5 rounded-2xl px-3 text-sm leading-tight", isActive(path, href) ? "text-gold" : "text-ink")}>
                  <Icon size={20} className="shrink-0" />
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
