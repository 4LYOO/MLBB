"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import clsx from "clsx";
import { CRITERIA_FR, type Recommendation, type Weights } from "@/lib/engine/draft";
import { LANE_FR, ROLE_FR } from "@/lib/domain";
import { Bar, HeroAvatar, RoleBadge } from "@/components/ui";

const scoreColor = (s: number) => (s >= 70 ? "var(--color-gold)" : s >= 60 ? "var(--color-primary)" : s >= 50 ? "#8a93b8" : "var(--color-bad)");

export function RecommendationCard({ rec, rank, onPick, canPick }: { rec: Recommendation; rank: number; onPick: () => void; canPick: boolean }) {
  const [open, setOpen] = useState(rank === 1);
  return (
    <article className="rounded-xl border border-line bg-surface-2/60 p-3">
      <div className="flex items-center gap-3">
        <span className="h-display w-5 text-center text-muted">{rank}</span>
        <HeroAvatar hero={rec.hero} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/heros/${rec.hero.slug}`} className="font-semibold text-ink hover:text-gold">
              {rec.hero.name}
            </Link>
            {rec.role && <RoleBadge role={rec.role} />}
            {rec.lane && <span className="chip">{LANE_FR[rec.lane]}</span>}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="w-28">
              <Bar value={rec.score} color={scoreColor(rec.score)} />
            </div>
            <span className="text-xs tabular-nums text-ink-2" title="Score de pertinence (0–100), estimation stratégique">
              Pertinence <b className="text-ink">{rec.score}</b>/100
            </span>
          </div>
        </div>
        <button className="btn-primary px-2.5 py-1.5 text-xs" onClick={onPick} disabled={!canPick} title="Ajouter à mon équipe">
          <Check size={14} /> Choisir
        </button>
        <button className="btn-ghost px-2 py-1.5" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Détails">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <div className="mt-3 grid gap-3 border-t border-line pt-3 text-xs sm:grid-cols-2">
          <div className="space-y-2">
            <Section title="Pourquoi ce choix">
              {rec.explanation.length ? rec.explanation.map((e, i) => <li key={i}>{e}</li>) : <li className="text-muted">Choix neutre pour cette composition.</li>}
            </Section>
            <Section title="Avantages contre l'adversaire">
              {rec.favorable.length ? (
                rec.favorable.slice(0, 4).map((f) => <li key={f.hero.slug}>{f.reasons.find((r) => r.value > 0)?.text ?? f.hero.name}</li>)
              ) : (
                <li className="text-muted">Aucun avantage marqué.</li>
              )}
            </Section>
            <Section title="Synergies avec tes alliés">
              {rec.synergies.length ? (
                rec.synergies.slice(0, 4).map((s) => <li key={s.hero.slug}>{s.reasons.find((r) => r.value > 0)?.text ?? s.hero.name}</li>)
              ) : (
                <li className="text-muted">Pas de synergie particulière.</li>
              )}
            </Section>
          </div>
          <div className="space-y-2">
            <Section title="Matchups défavorables">
              {rec.unfavorable.length ? (
                rec.unfavorable.slice(0, 3).map((u) => <li key={u.hero.slug}>{u.reasons.find((r) => r.value < 0)?.text ?? u.hero.name}</li>)
              ) : (
                <li className="text-muted">Aucun matchup défavorable identifié.</li>
              )}
            </Section>
            <Section title="Faiblesses potentielles">
              {rec.weaknesses.length ? rec.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li className="text-muted">—</li>}
            </Section>
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-muted">Détail du score</p>
              <ul className="space-y-1">
                {(Object.keys(rec.components) as (keyof Weights)[]).map((k) => {
                  const v = rec.components[k];
                  return (
                    <li key={k} className="flex items-center gap-2">
                      <span className="w-40 text-ink-2">{CRITERIA_FR[k]}</span>
                      {v == null ? (
                        <span className="text-muted">non utilisé</span>
                      ) : (
                        <span className={clsx("tabular-nums", v > 0.05 ? "text-good" : v < -0.05 ? "text-bad" : "text-muted")}>
                          {v > 0 ? "+" : ""}
                          {v.toFixed(2)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            {rec.notes.length > 0 && <p className="text-[11px] italic text-muted">{rec.notes.join(" ")}</p>}
          </div>
          <p className="text-[11px] text-muted sm:col-span-2">Rôle conseillé : {rec.role ? ROLE_FR[rec.role] : "—"} · estimation stratégique, pas une certitude.</p>
        </div>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="list-disc space-y-0.5 pl-4 text-ink-2">{children}</ul>
    </div>
  );
}
