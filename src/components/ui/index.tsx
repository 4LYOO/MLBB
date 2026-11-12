import Link from "next/link";
import { PortraitImg } from "./PortraitImg";
import clsx from "clsx";
import { AlertTriangle, Clock, Database, Info } from "lucide-react";
import { RANK_FR, PERIOD_FR, ROLE_COLOR, ROLE_FR, SOURCE_KIND_FR, TIER_COLOR, UNAVAILABLE, type Hero, type Period, type Rank, type Role, type Source, type Tier } from "@/lib/domain";

export const fmtDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
};
export const fmtPct = (v: number | null | undefined, digits = 2) => (v == null || Number.isNaN(v) ? UNAVAILABLE : `${v.toFixed(digits).replace(".", ",")} %`);

export function PageHeader({ title, subtitle, actions, kicker }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; kicker?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-gold">{kicker}</p>}
        <h1 className="h-display text-[28px] leading-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <div className="mt-1 line-clamp-2 max-w-3xl text-sm text-ink-2 sm:line-clamp-none">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions, subtitle }: { title?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={clsx("card card-pad animate-fade-in", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            {title && <h2 className="h-display text-lg text-ink">{title}</h2>}
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint, accent = "primary" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: "primary" | "gold" | "violet" }) {
  const ring = { primary: "from-primary/25", gold: "from-gold/25", violet: "from-violet/25" }[accent];
  return (
    <div className={clsx("card relative overflow-hidden p-4")}>
      <div className={clsx("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-xl", ring)} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="h-display mt-1 text-2xl text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Unavailable({ reason, compact = false, action = true }: { reason?: React.ReactNode; compact?: boolean; action?: boolean }) {
  if (compact) return <span className="text-xs italic text-muted" title={typeof reason === "string" ? reason : undefined}>{UNAVAILABLE}</span>;
  return (
    <div className="glass-inset flex items-start gap-3 rounded-2xl p-4 text-sm">
      <Database size={18} className="mt-0.5 shrink-0 text-muted" />
      <div>
        <p className="font-semibold text-ink-2">{UNAVAILABLE}</p>
        {reason && <p className="mt-0.5 text-muted">{reason}</p>}
        {action && (
          <Link href="/sources" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
            Importer ou synchroniser des données →
          </Link>
        )}
      </div>
    </div>
  );
}

export function ReliabilityDots({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Fiabilité ${value} sur 5`} title={`Fiabilité ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={clsx("h-1.5 w-1.5 rounded-full", i <= value ? "bg-gold" : "bg-line")} />
      ))}
    </span>
  );
}

/** Provenance obligatoire de toute donnée importante. */
export function Provenance({ source, capturedAt, rank, period, patch, stale, note }: { source?: Source | null; capturedAt?: string | null; rank?: Rank | null; period?: Period | null; patch?: string | null; stale?: boolean; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1">
        <Info size={12} /> Source : <span className="text-ink-2">{source?.name ?? "—"}</span>
        {source && <span className="chip py-0 text-[10px]">{SOURCE_KIND_FR[source.kind]}</span>}
        {source && <ReliabilityDots value={source.reliability} />}
      </span>
      {capturedAt !== undefined && (
        <span className="inline-flex items-center gap-1">
          <Clock size={12} /> {fmtDate(capturedAt, true)}
        </span>
      )}
      {rank && <span>Rang : {RANK_FR[rank]}</span>}
      {period && <span>Période : {PERIOD_FR[period]}</span>}
      {patch && <span>Patch {patch}</span>}
      {stale && (
        <span className="inline-flex items-center gap-1 text-warn">
          <AlertTriangle size={12} /> Données potentiellement obsolètes
        </span>
      )}
      {note && <span>{note}</span>}
    </div>
  );
}

export function RoleBadge({ role }: { role: Role | string }) {
  const c = ROLE_COLOR[role as Role] ?? "#64748b";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${c}22`, color: c, boxShadow: `inset 0 0 0 1px ${c}55` }}>
      {ROLE_FR[role as Role] ?? role}
    </span>
  );
}

export function TierBadge({ tier, size = "md" }: { tier: Tier | null | undefined; size?: "sm" | "md" | "lg" }) {
  if (!tier) return <span className="text-xs text-muted">—</span>;
  const c = TIER_COLOR[tier];
  const s = { sm: "h-6 min-w-6 text-xs", md: "h-8 min-w-8 text-sm", lg: "h-14 min-w-14 text-2xl" }[size];
  return (
    <span className={clsx("h-display inline-grid place-items-center rounded-lg px-1.5", s)} style={{ background: `${c}26`, color: c, boxShadow: `inset 0 0 0 1px ${c}66` }}>
      {tier}
    </span>
  );
}

export function HeroAvatar({ hero, size = 40, className }: { hero: Pick<Hero, "name" | "roles" | "portraitUrl">; size?: number; className?: string }) {
  const c = ROLE_COLOR[hero.roles[0] as Role] ?? "#64748b";
  const initials = hero.name
    .replace(/[^A-Za-z0-9 .'-]/g, "")
    .split(/[\s.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={clsx("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-2xl font-bold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, ${c}, #1f2545)`, boxShadow: `inset 0 0 0 1px ${c}88` }}
      aria-hidden
    >
      {initials}
      {hero.portraitUrl && <PortraitImg src={hero.portraitUrl} />}
    </span>
  );
}

export function HeroChip({ hero, href = true, sub }: { hero: Hero; href?: boolean; sub?: React.ReactNode }) {
  const inner = (
    <span className="inline-flex items-center gap-2">
      <HeroAvatar hero={hero} size={28} />
      <span className="leading-tight">
        <span className="block text-sm font-medium text-ink">{hero.name}</span>
        {sub && <span className="block text-[11px] text-muted">{sub}</span>}
      </span>
    </span>
  );
  return href ? (
    <Link href={`/heros/${hero.slug}`} className="hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function Bar({ value, max = 100, color = "var(--color-primary)" }: { value: number | null; max?: number; color?: string }) {
  if (value == null) return <span className="text-xs text-muted">—</span>;
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </span>
  );
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={clsx("flex gap-2 rounded-xl border p-3 text-xs leading-relaxed", tone === "warn" ? "border-warn/30 bg-warn/10 text-amber-100" : "border-primary/25 bg-primary/10 text-ink-2", "rounded-2xl backdrop-blur-xl")}>
      {tone === "warn" ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}
