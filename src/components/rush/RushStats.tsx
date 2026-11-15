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
import { currentStreak, duoPairs, sessionSummary, starsEstimate, tagInsights, tagStats } from "@/lib/engine/rush";
import { Lightbulb, X } from "lucide-react";
import { TagChips } from "./TagPicker";
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

/** Total d'étoiles (Mythique Immortel) : saisi une fois, puis estimé avec les parties du journal. */
function StarsCard() {
  const me = usePersonal();
  const est = starsEstimate(me.matches, me.prefs.etoiles);
  const goal = me.prefs.objectifEtoiles ?? null;
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(String(est?.total ?? ""));
  const [obj, setObj] = useState(String(goal ?? ""));
  if (edit || !est)
    return (
      <section className="card space-y-2 p-3">
        <p className="font-semibold">Tes étoiles Mythique Immortel</p>
        <p className="text-xs text-muted">Saisis ton total actuel (visible dans le jeu) : l&apos;appli l&apos;estime ensuite avec ton journal. Corrige-le de temps en temps.</p>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Étoiles actuelles</span>
            <input className="input" inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))} placeholder="100" />
          </label>
          <label>
            <span className="label">Objectif</span>
            <input className="input" inputMode="numeric" value={obj} onChange={(e) => setObj(e.target.value.replace(/\D/g, ""))} placeholder="150" />
          </label>
        </div>
        <button
          className="btn-primary w-full"
          disabled={!val}
          onClick={() => {
            personal.setEtoiles(Number(val), obj ? Number(obj) : null);
            setEdit(false);
          }}
        >
          Enregistrer
        </button>
      </section>
    );
  return (
    <button className="card flex w-full items-center gap-4 p-3 text-left" onClick={() => setEdit(true)}>
      <p className="text-[40px] font-bold leading-none tabular-nums text-gold">{est.total}★</p>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          Étoiles estimées <AVerifier title="Estimation : +1 / −1 par partie du journal depuis ta dernière saisie ; protections et bonus non comptés" />
        </span>
        <span className="block text-xs text-muted">
          {est.delta >= 0 ? `+${est.delta}` : est.delta} sur {est.games} partie(s) depuis ta saisie
          {goal ? ` · objectif ${goal}★ : ${goal - est.total > 0 ? `encore ${goal - est.total}` : "atteint 🎉"}` : ""}
        </span>
        <span className="block text-[11px] text-primary">Toucher pour corriger</span>
      </span>
    </button>
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
  const tStats = tagStats(mine);
  const insights = tagInsights(mine);
  const player = me.players.find((p) => p.id === who);
  const gameStats = Object.entries(player?.heroStats ?? {}).sort((a, b) => (b[1].matches ?? 0) - (a[1].matches ?? 0));
  const nom = (id: Player["id"]) => me.players.find((p) => p.id === id)?.nom ?? id;

  return (
    <div className="space-y-3">
      <StarsCard />
      {/* Session en cours */}
      <div className="grid grid-cols-3 gap-2">
        <Big label="Session" value={`${s.wins}-${s.losses}`} />
        <Big label="Étoiles" value={s.stars > 0 ? `+${s.stars}` : s.stars} tone={s.stars > 0 ? "text-good" : s.stars < 0 ? "text-bad" : undefined} extra={s.starsAVerifier && <AVerifier title="Estimation : +1 par victoire, −1 par défaite (protections d'étoiles non comptées)" />} />
        <Big label="Série" value={streak === 0 ? "—" : streak > 0 ? `${streak}V` : `${-streak}D`} tone={streak > 0 ? "text-good" : streak < 0 ? "text-bad" : undefined} />
      </div>

      {/* Choix du joueur */}
      <div className="flex gap-2">
        {(["moi", "elle"] as const).map((id) => (
          <button key={id} onClick={() => setWho(id)} className={clsx("chip min-h-10 px-4", who === id && "glass-pill font-semibold text-ink")}>
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
                  <span className={clsx("w-16 shrink-0 whitespace-nowrap text-right text-lg font-bold tabular-nums", wrColor(a.winRate))}>{Math.round(a.winRate)} %</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucune partie pour {nom(who)}.</p>
        )}
      </section>

      {/* Bilan des annotations */}
      {tStats.length > 0 && (
        <section className="card p-3">
          <p className="label">Tes annotations</p>
          <ul className="space-y-2">
            {tStats.map((t) => (
              <li key={t.tag.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <TagChips tags={[t.tag.id]} />
                </span>
                <span className="text-xs text-muted">{t.games} p.</span>
                <span className={clsx("w-16 shrink-0 whitespace-nowrap text-right text-lg font-bold tabular-nums", wrColor(t.winRate))}>{Math.round(t.winRate)} %</span>
              </li>
            ))}
          </ul>
          {insights.map((x) => (
            <p key={x} className="mt-3 flex gap-2 rounded-2xl border border-gold/30 bg-gold/10 p-2.5 text-sm text-ink-2">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-gold" /> {x}
            </p>
          ))}
        </section>
      )}

      {/* Stats du profil du jeu (importées par capture) */}
      {gameStats.length > 0 && (
        <section className="card p-3">
          <p className="label">Stats du jeu (profil) · {nom(who)}</p>
          <ul className="space-y-2">
            {gameStats.slice(0, 12).map(([slug, st]) => {
              const h = idx.get(slug);
              return (
                <li key={slug} className="flex items-center gap-3">
                  {h && <HeroAvatar hero={h} size={32} />}
                  <span className="min-w-0 flex-1 truncate font-medium">{h?.name ?? slug}</span>
                  <span className="text-xs text-muted">{st.matches ?? "?"} p.</span>
                  <span className={clsx("w-16 shrink-0 whitespace-nowrap text-right text-lg font-bold tabular-nums", st.winRate != null ? wrColor(st.winRate) : "text-muted")}>{st.winRate != null ? `${Math.round(st.winRate)} %` : "—"}</span>
                  <button className="text-muted" aria-label={`Retirer ${h?.name ?? slug}`} onClick={() => personal.removeHeroStat(who, slug)}>
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-muted">Utilisées par le Draft pour le bonus de maîtrise de {nom(who)}.</p>
        </section>
      )}

      {byRole.length > 0 && (
        <section className="card p-3">
          <p className="label">Win rate par rôle</p>
          <ul className="space-y-2">
            {byRole.map((a) => (
              <li key={a.key} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: ROLE_COLOR[a.key as Role] ?? "#71717a" }} />
                <span className="flex-1 font-medium">{ROLE_FR[a.key as Role] ?? a.key}</span>
                <span className="text-xs text-muted">{a.games} p.</span>
                <span className={clsx("w-16 shrink-0 whitespace-nowrap text-right text-lg font-bold tabular-nums", wrColor(a.winRate))}>{Math.round(a.winRate)} %</span>
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
                <span className={clsx("w-16 shrink-0 whitespace-nowrap text-right text-lg font-bold tabular-nums", wrColor(p.winRate))}>{Math.round(p.winRate)} %</span>
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
