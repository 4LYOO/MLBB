"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import { MOBILE_NAV, NAV } from "./nav";
import { SearchButton } from "./CommandPalette";

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary via-violet to-gold text-sm font-black text-white shadow-lg shadow-primary/30">ML</span>
      <span className="leading-tight">
        <span className="h-display block text-lg text-ink">MLBB COMPANION</span>
        <span className="block text-[10px] uppercase tracking-[0.2em] text-gold/80">Analyse & draft</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Bureau */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/80 backdrop-blur lg:flex">
        <div className="py-5">
          <Logo />
        </div>
        <div className="px-3 pb-3">
          <SearchButton />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                isActive(path, href) ? "bg-primary/15 text-ink ring-1 ring-primary/40" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon size={18} className={isActive(path, href) ? "text-gold" : "text-muted"} />
              {label}
            </Link>
          ))}
        </nav>
        <p className="border-t border-line px-5 py-3 text-[11px] leading-snug text-muted">
          Projet de fan, non affilié à Moonton. Les estimations ne sont pas des certitudes.
        </p>
      </aside>

      {/* Mobile : barre supérieure */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface/90 px-3 py-2.5 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <SearchButton compact />
          <button className="btn-ghost px-2.5" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 animate-fade-in border-l border-line bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="h-display text-lg">Menu</span>
              <button className="btn-ghost px-2.5" aria-label="Fermer" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", isActive(path, href) ? "bg-primary/15 text-ink" : "text-ink-2")}>
                  <Icon size={18} className="text-muted" /> {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile : barre inférieure */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur lg:hidden" aria-label="Navigation rapide">
        {NAV.filter((n) => MOBILE_NAV.includes(n.href)).map(({ href, short, icon: Icon }) => (
          <Link key={href} href={href} className={clsx("flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive(path, href) ? "text-gold" : "text-muted")}>
            <Icon size={20} />
            {short}
          </Link>
        ))}
      </nav>
    </>
  );
}
