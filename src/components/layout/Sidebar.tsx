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
      <span className={clsx("grid place-items-center rounded-[14px] bg-gradient-to-b from-white to-[#cfd6ff] font-black text-black shadow-[inset_0_1px_0_white,0_6px_16px_-6px_rgba(107,140,255,0.8)]", small ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-sm")}>ML</span>
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
      <aside className="glass-strong fixed inset-y-3 left-3 z-30 hidden w-64 flex-col rounded-[32px] lg:flex">
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
              <Link href={href} className={clsx("flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm", isActive(path, href) ? "glass-pill text-ink" : "text-ink-2 hover:bg-white/5 hover:text-ink")}>
                <Icon size={18} className={isActive(path, href) ? "text-gold" : "text-muted"} />
                {label}
              </Link>
            </div>
          ))}
        </nav>
        <p className="border-t border-line px-5 py-3 text-[11px] leading-snug text-muted">Projet de fan, non affilié à Moonton. Les estimations ne sont pas des certitudes.</p>
      </aside>

      {/* iPhone : en-tête fixe sous l'encoche / Dynamic Island */}
      <header className="glass-strong pt-safe sticky top-0 z-30 rounded-b-[26px] border-t-0 lg:hidden">
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

      {/* iPhone : barre d'onglets flottante en verre (au-dessus de la barre d'accueil) */}
      <nav className="glass-strong fixed inset-x-3 bottom-[calc(var(--safe-bottom)+8px)] z-40 mx-auto max-w-md rounded-[30px] p-1.5 lg:hidden" aria-label="Onglets">
        <div className="grid grid-cols-5 gap-1">
          {TABS.map(({ href, short, icon: Icon }) => {
            const on = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={clsx("flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-[24px] text-[11px] font-semibold transition-colors duration-150", on ? "glass-pill text-gold" : "text-muted")}
              >
                <Icon size={23} strokeWidth={on ? 2.4 : 1.9} />
                {short}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Menu « Plus » : toutes les autres pages */}
      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Plus de pages">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMore(false)} />
          <div className="glass-strong pt-safe absolute inset-x-2 top-0 animate-fade-in rounded-b-[32px] border-t-0 p-3 pb-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="h-display text-lg">Plus</span>
              <button className="btn-ghost min-h-11 min-w-11 px-0" aria-label="Fermer" onClick={() => setMore(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MORE.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={clsx("glass flex min-h-14 min-w-0 items-center gap-2.5 rounded-[22px] px-3 text-sm leading-tight", isActive(path, href) ? "text-gold" : "text-ink")}>
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
