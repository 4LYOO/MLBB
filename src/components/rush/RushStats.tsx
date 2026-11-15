"use client";
/**
 * Bilan du rush : session en cours (V/D, étoiles), série, win rate par héros / rôle / duo.
 * Une seule info principale par carte, chiffres en gros.
 */
import { useMemo, useState } from "react";
import clsx from "clsx";
import { AVerifier, HeroAvatar } from "@/components/ui";
import { personal, usePersonal, type Player } from "@/lib/client/store";
import { aggregate } from "@/lib/engine/coach";
import { currentStreak, duoPairs, sessionSummary } from "@/lib/engine/rush";
import { ROLE_COLOR, ROLE_FR, type Hero, type Role } from "@/lib/domain";

const wrColor = (wr: number) => (wr >= 55 ? "text-good" : wr < 45 ? "text-bad" : "text-ink");

function Big({ label, value, tone, extra }: { label: string; value: React.ReactNode; tone?: string; extra?: React.ReactNode }) {
  return (
    <div className="card p-3 text-center">
      <p className={clsx("text-[34px] font-bold leading-none tabular-nums", tone)}>{value}</p>
      <p className="mt-1 text-xs text-muted">
        {label} {extra}
      </p>
    </div>
  );
}

export function RushStats({ heroes }: { heroes: Hero[] }) {
  const me = usePersonal();
  const idx = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const [who, setWho] = useState<Player["id"]>("moi");
  const s = sessionSummary(me.matches);
  const streak = currentStreak(me.matches);
  const mine = me.matches.filter((m) => (m.player ?? "moi") === who);
  const byHero = aggregate(mine, (m) => m.hero).slice(0, 8);
  const byRole = aggregate(mine, (m) => m.role);
  const pairs = duoPairs(me.matches).slice(0, 5);
  const nom = (id: Player["id"]) => me.players.find((p) => p.id === id)?.nom ?? id;

  return (
    <div className="space-y-3">
      {/* Session en cours */}
      <div className="grid grid-cols-3 gap-2">
        <Big label="Session" value={`${s.wins}-${s.losses}`} />
        <Big label="Étoiles" value={s.stars > 0 ? `+${s.stars}` : s.stars} tone={s.stars > 0 ? "text-good" : s.stars < 0 ? "text-bad" : undefined} extra={s.starsAVerifier && <AVerifier title="Estimation : +1 par victoire, −1 par défaite (protections d'étoiles non comptées)" />} />
        <Big label="Série" value={streak === 0 ? "—" : streak > 0 ? `${streak}V` : `${-streak}D`} tone={streak > 0 ? "text-good" : streak < 0 ? "text-bad" : undefined} />
      </div>

      {/* Choix du joueur */}
      <div className="flex gap-2">
        {(["moi", "elle"] as const).map((id) => (
          <button key={id} onClick={() => setWho(id)} className={clsx("chip min-h-10 px-4", who === id && "bg-white/15 font-semibold text-ink")}>
            {nom(id)}
          </button>
        ))}
      </div>

      <section className="card p-3">
        <p className="label">Win rate par héros</p>
        {byHero.length ? (
          <ul className="space-y-2">
            {byHero.map((a) => {
              const h = idx.get(a.key);
              return (
                <li key={a.key} className="flex items-center gap-3">
                  {h && <HeroAvatar hero={h} size={36} />}
                  <span className="min-w-0 flex-1 truncate font-medium">{h?.name ?? a.key}</span>
                  <span className="text-xs text-muted">{a.games} p.</span>
                  <span className={clsx("w-14 text-right text-lg font-bold tabular-nums", wrColor(a.winRate))}>{Math.round(a.winRate)} %</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucune partie pour {nom(who)}.</p>
        )}
      </section>

      {byRole.length > 0 && (
        <section className="card p-3">
          <p className="label">Win rate par rôle</p>
          <ul className="space-y-2">
            {byRole.map((a) => (
              <li key={a.key} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: ROLE_COLOR[a.key as Role] ?? "#71717a" }} />
                <span className="flex-1 font-medium">{ROLE_FR[a.key as Role] ?? a.key}</span>
                <span className="text-xs text-muted">{a.games} p.</span>
                <span className={clsx("w-14 text-right text-lg font-bold tabular-nums", wrColor(a.winRate))}>{Math.round(a.winRate)} %</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-3">
        <p className="label">Win rate en duo (vos paires)</p>
        {pairs.length ? (
          <ul className="space-y-2">
            {pairs.map((p) => (
              <li key={`${p.moi}+${p.elle}`} className="flex items-center gap-2">
                {idx.get(p.moi) && <HeroAvatar hero={idx.get(p.moi)!} size={32} />}
                {idx.get(p.elle) && <HeroAvatar hero={idx.get(p.elle)!} size={32} />}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {idx.get(p.moi)?.name} + {idx.get(p.elle)?.name}
                </span>
                <span className="text-xs text-muted">{p.games} p.</span>
                <span className={clsx("w-14 text-right text-lg font-bold tabular-nums", wrColor(p.winRate))}>{Math.round(p.winRate)} %</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Enregistrez des parties en « Duo » pour voir vos paires.</p>
        )}
      </section>

      <label className="card flex min-h-14 items-center gap-3 px-4">
        <span className="flex-1">
          <span className="block font-semibold">Alerte anti-tilt</span>
          <span className="block text-xs text-muted">« Pause conseillée » après 2 défaites d&apos;affilée</span>
        </span>
        <input type="checkbox" className="h-6 w-6 accent-[var(--color-gold)]" checked={me.prefs.antiTilt} onChange={(e) => personal.setPref("antiTilt", e.target.checked)} />
      </label>
    </div>
  );
}
