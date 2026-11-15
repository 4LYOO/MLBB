"use client";
/**
 * Page de coaching d'un rôle : sections repliables (la première est ouverte),
 * checklist sauvegardée sur le téléphone, héros méta du rôle et leurs counters.
 */
import Link from "next/link";
import { useMemo } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import clsx from "clsx";
import { AVerifier, HeroAvatar, TierBadge } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { personal, usePersonal } from "@/lib/client/store";
import { latestSnapshot, type Model } from "@/lib/data/model";
import { computeTiers } from "@/lib/engine/tier";
import { matchup, normScore } from "@/lib/engine/draft";
import { COACHING_META, META_PAR_ROLE, aVerifierDe, texteDe, type CoachingRole, type Point } from "@/data/reference/coaching";
import { HEROES_META } from "@/data/reference/heroes";
import type { Hero } from "@/lib/domain";

/** Bloc repliable (élément natif <details> : fonctionne au doigt, sans survol). */
function Section({ titre, open = false, children, badge }: { titre: string; open?: boolean; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <details className="card group" open={open}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 text-base font-bold">{titre}</span>
        {badge}
        <span className="text-muted transition-transform duration-150 group-open:rotate-90">›</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function Points({ items }: { items: Point[] }) {
  return (
    <ul className="space-y-2">
      {items.map((p, i) => (
        <li key={i} className="flex gap-2 text-[15px] leading-snug text-ink-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
          <span>
            {texteDe(p)} {aVerifierDe(p) && <AVerifier />}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Les 3 héros qui contrent le mieux `hero` : données synchronisées si présentes, sinon règles de mécaniques. */
function countersOf(m: Model, hero: Hero): Hero[] {
  const data = m.matchups
    .filter((x) => x.kind === "counter" && x.other === hero.slug)
    .sort((a, b) => normScore(b.score, b.unit, "counter") - normScore(a.score, a.unit, "counter"))
    .map((x) => m.heroBySlug.get(x.slug))
    .filter((h): h is Hero => !!h);
  if (data.length >= 3) return data.slice(0, 3);
  // Pas assez de données : on complète avec les règles de mécaniques (anti-dash, anti-heal…).
  const byRules = m.heroes
    .filter((o) => o.profile && !o.incomplete && o.slug !== hero.slug && !data.some((d) => d.slug === o.slug))
    .map((o) => ({ o, v: matchup(o, hero).value }))
    .filter((x) => x.v > 0.3)
    .sort((a, b) => b.v - a.v)
    .map((x) => x.o);
  return [...data, ...byRules].slice(0, 3);
}

export function CoachingRoleView({ role }: { role: CoachingRole }) {
  const { model } = useData();
  const me = usePersonal();
  const s = role.sections;
  const check = me.checklists[role.id] ?? { coches: [], reussites: [], parties: 0 };

  // Tiers actuels (stats synchronisées, Mythical Glory+ si disponible)
  const tierMap = useMemo(() => {
    const snap = latestSnapshot(model, "mythical_glory", "7d").stats.length ? latestSnapshot(model, "mythical_glory", "7d") : latestSnapshot(model, "all", "7d");
    return Object.fromEntries(computeTiers(snap.stats).map((t) => [t.slug, t.tier]));
  }, [model]);
  const metaHeroes = (META_PAR_ROLE[role.id] ?? []).map((slug) => model.heroBySlug.get(slug)).filter((h): h is Hero => !!h);

  return (
    <div className="space-y-3">
      {/* En-tête du rôle */}
      <div className="flex items-center gap-3">
        <span className="h-12 w-1.5 rounded-full" style={{ background: role.couleur }} />
        <div className="min-w-0">
          <h1 className="h-display text-[28px] leading-tight">{role.nom}</h1>
          <p className="text-xs text-muted">
            Coaching · patch {COACHING_META.patch} · mis à jour le {COACHING_META.dateMaj.split("-").reverse().slice(0, 2).join("/")}
          </p>
        </div>
      </div>

      {/* 1. Le rôle */}
      <Section titre="Le rôle" open>
        <p className="mb-3 text-[17px] font-semibold leading-snug">{role.resume}</p>
        <ol className="space-y-2">
          {role.responsabilites.map((r, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-black" style={{ background: role.couleur }}>
                {i + 1}
              </span>
              {r}
            </li>
          ))}
        </ol>
      </Section>

      {/* 2-5. Phases de jeu et vision */}
      <Section titre="Early game (0-4 min)">
        <Points items={s.early} />
      </Section>
      <Section titre="Mid game">
        <Points items={s.mid} />
      </Section>
      <Section titre="Late game">
        <Points items={s.late} />
      </Section>
      <Section titre="Vision et lecture de la carte">
        <Points items={s.vision} />
      </Section>

      {/* 6. Erreurs fréquentes */}
      <Section titre="Erreurs fréquentes en Mythique">
        <ul className="space-y-3">
          {s.erreurs.map((e, i) => (
            <li key={i} className="text-[15px] leading-snug">
              <p className="text-bad">✗ {e.erreur}</p>
              <p className="text-good">✓ {e.correction}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 7. Checklist */}
      <Section titre="Checklist d'amélioration" badge={<span className="chip">{check.parties} partie(s)</span>}>
        <p className="mb-2 text-xs text-muted">Coche ce que tu as réussi pendant la partie, puis touche « Partie terminée ».</p>
        <ul className="space-y-1">
          {s.checklist.map((c, i) => {
            const on = check.coches.includes(i);
            return (
              <li key={i}>
                <button onClick={() => personal.toggleCheck(role.id, i)} className={clsx("flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-[15px]", on ? "bg-good/10 text-ink" : "text-ink-2")} aria-pressed={on}>
                  {on ? <CheckCircle2 size={22} className="shrink-0 text-good" /> : <Circle size={22} className="shrink-0 text-muted" />}
                  <span className="flex-1">{c}</span>
                  {check.parties > 0 && (
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {check.reussites[i] ?? 0}/{check.parties}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <button className="btn-primary mt-3 w-full" onClick={() => personal.validerPartie(role.id, s.checklist.length)}>
          Partie terminée ({check.coches.length}/{s.checklist.length})
        </button>
      </Section>

      {/* 8-9. Rush et duo */}
      <Section titre="Spécial rush solo / duo">
        <Points items={s.rush} />
      </Section>
      <Section titre="Synergie duo">
        <Points items={s.duo} />
      </Section>

      {/* 10. Héros méta */}
      <Section titre="Héros méta du rôle" badge={META_PAR_ROLE.aVerifier ? <AVerifier /> : undefined}>
        <p className="mb-3 text-xs text-muted">
          {s.meta} Patch {HEROES_META.patch} · liste : {META_PAR_ROLE.source}.
        </p>
        <ul className="space-y-3">
          {metaHeroes.map((h) => (
            <li key={h.slug} className="flex items-center gap-3">
              <Link href={`/heros/${h.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                <HeroAvatar hero={h} size={40} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {h.name} <TierBadge tier={tierMap[h.slug]} size="sm" />
                  </span>
                  <span className="block truncate text-xs text-muted">Contré par : {countersOf(model, h).map((c) => c.name).join(", ") || "—"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* 11. Builds et emblèmes */}
      <Section titre="Builds et emblèmes" badge={s.builds.aVerifier ? <AVerifier /> : undefined}>
        <p className="label">Emblèmes</p>
        <ul className="mb-3 space-y-2 text-[15px]">
          {s.builds.emblemes.map((e) => (
            <li key={e.nom}>
              <b>{e.nom}</b> <span className="text-ink-2">— {e.talents}</span>
              <span className="block text-xs text-muted">{e.pourquoi}</span>
            </li>
          ))}
        </ul>
        <p className="label">Build de base (ordre d&apos;achat)</p>
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-[15px] text-ink-2">
          {s.builds.base.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ol>
        <p className="label">Items situationnels</p>
        <ul className="space-y-3">
          {s.builds.situationnels.map((x) => (
            <li key={x.contre} className="rounded-xl border border-white/10 p-3 text-sm">
              <p className="font-semibold">Contre : {x.contre}</p>
              <p className="text-gold">{x.items.join(" · ")}</p>
              <p className="text-xs text-muted">Quand : {x.quand}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Builds détaillés et adaptés à la compo adverse : <Link className="text-primary" href="/builds">Équipements & builds</Link>.
        </p>
      </Section>
    </div>
  );
}
