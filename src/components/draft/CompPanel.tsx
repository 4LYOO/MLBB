"use client";
import { AlertTriangle, CheckCircle2, Flag, Lightbulb, Skull } from "lucide-react";
import type { CompAnalysis } from "@/lib/engine/draft";
import { LANE_FR } from "@/lib/domain";
import { Bar } from "@/components/ui";

const tone = (v: number) => (v >= 70 ? "var(--color-good)" : v >= 45 ? "var(--color-primary)" : "var(--color-warn)");

export function CompPanel({ a, enemy, title = "Notre composition" }: { a: CompAnalysis; enemy?: CompAnalysis; title?: string }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="h-display text-base">{title}</h3>
          <span className="text-xs text-muted">
            Qualité estimée : <b className="text-ink">{a.overall ?? "—"}</b>
            {a.overall != null && "/100"}
            {enemy?.overall != null && <> · adversaire {enemy.overall}/100</>}
          </span>
        </div>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {a.indicators.map((i) => {
            const e = enemy?.indicators.find((x) => x.key === i.key);
            return (
              <li key={i.key} title={i.hint}>
                <div className="mb-0.5 flex justify-between text-xs">
                  <span className="text-ink-2">{i.label}</span>
                  <span className="tabular-nums text-muted">
                    {i.value == null ? "n/a" : i.value}
                    {e?.value != null && <span className="ml-1 text-[10px]">(adv. {e.value})</span>}
                  </span>
                </div>
                <Bar value={i.value} color={i.value != null ? tone(i.value) : undefined} />
              </li>
            );
          })}
        </ul>
      </div>
      <List icon={<CheckCircle2 size={14} className="text-good" />} title="Points forts" items={a.strengths} empty="Ajoute des héros pour voir les points forts." />
      <List icon={<AlertTriangle size={14} className="text-warn" />} title="Faiblesses" items={a.weaknesses} empty="Aucune faiblesse majeure détectée." />
      {a.missingLanes.length > 0 && a.missingLanes.length < 5 && <p className="text-xs text-ink-2">Lanes à couvrir : {a.missingLanes.map((l) => LANE_FR[l]).join(", ")}.</p>}
      <List icon={<Skull size={14} className="text-bad" />} title="Menaces adverses principales" items={a.threats} empty="Aucune menace identifiée (ou adversaire inconnu)." />
      <List icon={<Flag size={14} className="text-gold" />} title="Conditions de victoire" items={a.winConditions} empty="—" />
      <List icon={<Lightbulb size={14} className="text-primary" />} title="Conseils stratégiques" items={a.tips} empty="—" />
      <p className="text-[11px] italic text-muted">Estimations stratégiques fondées sur les profils de héros et les données disponibles, pas des certitudes mathématiques.</p>
    </div>
  );
}

function List({ icon, title, items, empty }: { icon: React.ReactNode; title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon} {title}
      </p>
      {items.length ? (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className="pl-5 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}
