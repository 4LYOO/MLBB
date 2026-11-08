"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";

/** Onglets / sélecteurs pilotés par l'URL (conserve les autres paramètres). */
export function LinkTabs({ param, options, defaultValue }: { param: string; options: { value: string; label: string }[]; defaultValue: string }) {
  const sp = useSearchParams();
  const path = usePathname();
  const cur = sp.get(param) ?? defaultValue;
  return (
    <div className="flex flex-wrap gap-1" role="tablist">
      {options.map((o) => {
        const q = new URLSearchParams(sp.toString());
        q.set(param, o.value);
        return (
          <Link key={o.value} role="tab" aria-selected={cur === o.value} href={`${path}?${q.toString()}`} scroll={false} className={clsx("rounded-lg px-3 py-1.5 text-sm", cur === o.value ? "bg-primary/20 text-ink ring-1 ring-primary/40" : "text-ink-2 hover:bg-surface-2")}>
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
