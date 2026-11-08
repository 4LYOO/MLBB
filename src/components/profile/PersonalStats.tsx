"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2, Plus, Trash2, Trophy } from "lucide-react";
import clsx from "clsx";
import { aggregate, byWeek, coach, summarize, winRateSeries, type Agg } from "@/lib/engine/coach";
import { parseResultText, type OcrGuess } from "@/lib/engine/ocr";
import { RANKS, RANK_FR, ROLES, ROLE_FR, type Hero } from "@/lib/domain";
import type { Match, Profile } from "@/lib/server/repo";
import { HeroAvatar, Notice, StatTile, Unavailable } from "@/components/ui";
import { GroupedBarChart, HBarChart, LineSeriesChart } from "@/components/charts/Charts";

const today = () => new Date().toISOString().slice(0, 10);
const pct = (v: number) => `${v.toFixed(1).replace(".", ",")} %`;

export function PersonalStats({ heroes, profile, matches }: { heroes: Hero[]; profile: Profile; matches: Match[] }) {
  const router = useRouter();
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const name = (s: string) => heroMap.get(s)?.name ?? s;

  // ---------------- Profil
  const [p, setP] = useState(profile);
  const [pMsg, setPMsg] = useState("");
  const saveProfile = async () => {
    const r = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    setPMsg(r.ok ? "Profil enregistré." : "Erreur d'enregistrement.");
    setTimeout(() => setPMsg(""), 2500);
  };

  // ---------------- Saisie de partie
  const empty = { playedAt: today(), hero: "", role: "", result: "win", kills: 0, deaths: 0, assists: 0, durationMin: "", mvp: false, rank: profile.rank ?? "", notes: "", entry: "manual" };
  const [f, setF] = useState<typeof empty>(empty);
  const [err, setErr] = useState("");
  const [ocr, setOcr] = useState<{ busy: boolean; guess: OcrGuess | null; error: string; progress: number }>({ busy: false, guess: null, error: "", progress: 0 });

  const submit = async () => {
    setErr("");
    if (!f.hero) return setErr("Choisis un héros.");
    const r = await fetch("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, role: f.role || null, rank: f.rank || null, notes: f.notes || null, durationMin: f.durationMin === "" ? null : Number(f.durationMin), kills: Number(f.kills), deaths: Number(f.deaths), assists: Number(f.assists) }),
    });
    if (!r.ok) return setErr(JSON.stringify((await r.json()).error));
    setF({ ...empty, rank: f.rank, role: f.role });
    setOcr({ busy: false, guess: null, error: "", progress: 0 });
    router.refresh();
  };
  const del = async (id: number) => {
    if (!confirm("Supprimer cette partie ?")) return;
    await fetch(`/api/matches?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  const runOcr = async (file: File) => {
    setOcr({ busy: true, guess: null, error: "", progress: 0 });
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: (m: { status: string; progress: number }) => m.status === "recognizing text" && setOcr((o) => ({ ...o, progress: m.progress })) });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const g = parseResultText(data.text, heroes);
      setOcr({ busy: false, guess: g, error: "", progress: 1 });
      setF((x) => ({
        ...x,
        hero: g.hero ?? x.hero,
        role: g.hero ? (heroMap.get(g.hero)?.roles[0] ?? x.role) : x.role,
        result: g.result ?? x.result,
        kills: g.kills ?? x.kills,
        deaths: g.deaths ?? x.deaths,
        assists: g.assists ?? x.assists,
        durationMin: g.durationMin != null ? String(g.durationMin) : x.durationMin,
        mvp: g.mvp || x.mvp,
        entry: "ocr",
      }));
    } catch (e) {
      setOcr({ busy: false, guess: null, error: `Reconnaissance impossible (${e instanceof Error ? e.message : e}). Le moteur OCR télécharge ses modèles au premier usage : une connexion Internet est nécessaire.`, progress: 0 });
    }
  };

  // ---------------- Agrégats
  const all = summarize("all", matches);
  const byHero = aggregate(matches, (m) => m.hero);
  const byRole = aggregate(matches, (m) => m.role);
  const series = winRateSeries(matches);
  const weeks = byWeek(matches);
  const tips = coach(matches, name);
  const best = byHero.filter((h) => h.games >= 3).sort((a, b) => b.winRate - a.winRate);
  const toImprove = byHero.filter((h) => h.games >= 3 && h.winRate < 50).sort((a, b) => a.winRate - b.winRate);
  // Progression : héros dont le WR des 5 dernières parties dépasse celui des précédentes
  const progressing = byHero
    .filter((h) => h.games >= 6)
    .map((h) => {
      const ms = matches.filter((m) => m.hero === h.key).sort((a, b) => a.playedAt.localeCompare(b.playedAt));
      const last = summarize("l", ms.slice(-5)).winRate;
      const prev = summarize("p", ms.slice(0, -5)).winRate;
      return { key: h.key, delta: last - prev, last };
    })
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Profil */}
        <section className="card card-pad">
          <h2 className="h-display mb-3 text-lg">Mon profil</h2>
          <p className="mb-3 text-xs text-muted">Aucune API officielle ne permet de récupérer un compte MLBB : les informations sont saisies manuellement et stockées localement.</p>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="label">Pseudo</span>
              <input className="input" value={p.nickname ?? ""} onChange={(e) => setP({ ...p, nickname: e.target.value })} />
            </label>
            <label>
              <span className="label">ID joueur</span>
              <input className="input" value={p.playerId ?? ""} onChange={(e) => setP({ ...p, playerId: e.target.value })} />
            </label>
            <label>
              <span className="label">Serveur</span>
              <input className="input" value={p.server ?? ""} onChange={(e) => setP({ ...p, server: e.target.value })} />
            </label>
            <label>
              <span className="label">Rang actuel</span>
              <select className="input" value={p.rank ?? ""} onChange={(e) => setP({ ...p, rank: e.target.value })}>
                <option value="">—</option>
                {RANKS.filter((r) => r !== "all").map((r) => (
                  <option key={r} value={r}>
                    {RANK_FR[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Étoiles</span>
              <input className="input" type="number" min={0} value={p.stars ?? ""} onChange={(e) => setP({ ...p, stars: e.target.value === "" ? null : Number(e.target.value) })} />
            </label>
            <label>
              <span className="label">Rôle principal</span>
              <select className="input" value={p.mainRole ?? ""} onChange={(e) => setP({ ...p, mainRole: e.target.value })}>
                <option value="">—</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_FR[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Rôle secondaire</span>
              <select className="input" value={p.secondRole ?? ""} onChange={(e) => setP({ ...p, secondRole: e.target.value })}>
                <option value="">—</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_FR[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Héros favoris</span>
              <select className="input" value="" onChange={(e) => e.target.value && setP({ ...p, favoriteHeroes: [...new Set([...p.favoriteHeroes, e.target.value])].slice(0, 10) })}>
                <option value="">Ajouter…</option>
                {heroes.map((h) => (
                  <option key={h.slug} value={h.slug}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.favoriteHeroes.map((s) => (
              <button key={s} className="chip" onClick={() => setP({ ...p, favoriteHeroes: p.favoriteHeroes.filter((x) => x !== s) })} title="Retirer">
                {name(s)} ×
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn-primary" onClick={saveProfile}>
              Enregistrer
            </button>
            {pMsg && <span className="text-sm text-good">{pMsg}</span>}
          </div>
        </section>

        {/* Ajout de partie */}
        <section className="card card-pad">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="h-display text-lg">Ajouter une partie</h2>
            <label className={clsx("btn-ghost cursor-pointer", ocr.busy && "opacity-50")}>
              {ocr.busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {ocr.busy ? `Analyse… ${Math.round(ocr.progress * 100)} %` : "Importer une capture (expérimental)"}
              <input type="file" accept="image/*" className="hidden" disabled={ocr.busy} onChange={(e) => e.target.files?.[0] && runOcr(e.target.files[0])} />
            </label>
          </div>
          {ocr.guess && (
            <div className="mb-3">
              <Notice>
                Formulaire pré-rempli par reconnaissance visuelle ({ocr.guess.confidence.join(", ") || "peu d'éléments détectés"}). <b>Vérifie chaque champ avant d&apos;enregistrer.</b>
              </Notice>
            </div>
          )}
          {ocr.error && (
            <div className="mb-3">
              <Notice tone="warn">{ocr.error}</Notice>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label>
              <span className="label">Date</span>
              <input className="input" type="date" value={f.playedAt} onChange={(e) => setF({ ...f, playedAt: e.target.value })} />
            </label>
            <label className="col-span-1 sm:col-span-2">
              <span className="label">Héros joué</span>
              <select className="input" value={f.hero} onChange={(e) => setF({ ...f, hero: e.target.value, role: f.role || heroMap.get(e.target.value)?.roles[0] || "" })}>
                <option value="">Choisir…</option>
                {heroes.map((h) => (
                  <option key={h.slug} value={h.slug}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Rôle</span>
              <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                <option value="">—</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_FR[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Résultat</span>
              <select className="input" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })}>
                <option value="win">Victoire</option>
                <option value="loss">Défaite</option>
              </select>
            </label>
            {(["kills", "deaths", "assists"] as const).map((k) => (
              <label key={k}>
                <span className="label">{{ kills: "Kills", deaths: "Morts", assists: "Assists" }[k]}</span>
                <input className="input" type="number" min={0} max={99} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} />
              </label>
            ))}
            <label>
              <span className="label">Durée (min)</span>
              <input className="input" type="number" min={0} step={0.5} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} />
            </label>
            <label>
              <span className="label">Rang</span>
              <select className="input" value={f.rank} onChange={(e) => setF({ ...f, rank: e.target.value })}>
                <option value="">—</option>
                {RANKS.filter((r) => r !== "all").map((r) => (
                  <option key={r} value={r}>
                    {RANK_FR[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={f.mvp} onChange={(e) => setF({ ...f, mvp: e.target.checked })} /> MVP
            </label>
            <label className="col-span-2 sm:col-span-4">
              <span className="label">Remarques</span>
              <input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Ex. : mal positionné sur la Tortue, mauvais build contre les soins…" />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn-primary" onClick={submit}>
              <Plus size={16} /> Ajouter la partie
            </button>
            {err && <span className="text-sm text-bad">{err}</span>}
          </div>
        </section>
      </div>

      {/* Synthèse */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatTile label="Parties" value={all.games} />
        <StatTile label="Win rate" value={all.games ? pct(all.winRate) : "—"} accent="gold" />
        <StatTile label="KDA" value={all.games ? all.kda.toFixed(2).replace(".", ",") : "—"} accent="violet" />
        <StatTile label="Kills moy." value={all.games ? all.kills.toFixed(1).replace(".", ",") : "—"} />
        <StatTile label="Morts moy." value={all.games ? all.deaths.toFixed(1).replace(".", ",") : "—"} />
        <StatTile label="Assists moy." value={all.games ? all.assists.toFixed(1).replace(".", ",") : "—"} />
        <StatTile label="MVP" value={all.mvp} accent="gold" hint={all.games ? pct((all.mvp / all.games) * 100) : undefined} />
      </div>

      {matches.length === 0 ? (
        <Unavailable reason="Aucune partie enregistrée. Ajoute tes parties ci-dessus pour débloquer tes statistiques, tes graphiques de progression et le coach." action={false} />
      ) : (
        <>
          <section className="card card-pad">
            <h2 className="h-display mb-3 flex items-center gap-2 text-lg">
              <Trophy size={18} className="text-gold" /> Coach personnel
            </h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {tips.map((t, i) => (
                <li key={i} className={clsx("rounded-xl border p-3 text-sm", t.level === "positive" ? "border-good/40 bg-good/5" : t.level === "warning" ? "border-warn/40 bg-warn/5" : "border-line bg-surface-2/50")}>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-ink-2">{t.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Règles transparentes calculées à partir de tes {matches.length} partie(s) ; ce ne sont pas des certitudes.</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card card-pad">
              <h2 className="h-display mb-2 text-lg">Évolution du win rate</h2>
              <LineSeriesChart
                data={series.map((s) => ({ x: `#${s.n}`, cumulative: s.cumulative, rolling: s.rolling }))}
                series={[
                  { key: "cumulative", label: "Cumulé" },
                  { key: "rolling", label: "Sur 10 parties" },
                ]}
                unit=" %"
                reference={50}
              />
            </section>
            <section className="card card-pad">
              <h2 className="h-display mb-2 text-lg">Performances par semaine</h2>
              <GroupedBarChart data={weeks.map((w) => ({ x: new Date(w.key).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), wr: Math.round(w.winRate) }))} series={[{ key: "wr", label: "Win rate" }]} unit=" %" />
              <p className="mt-1 text-xs text-muted">Semaines commençant le lundi · {weeks.map((w) => `${w.games} p.`).join(" · ")}</p>
            </section>
            <section className="card card-pad">
              <h2 className="h-display mb-2 text-lg">Win rate par rôle</h2>
              {byRole.length ? <HBarChart data={byRole.map((r) => ({ label: `${ROLE_FR[r.key as keyof typeof ROLE_FR] ?? r.key} (${r.games})`, value: Math.round(r.winRate) }))} unit=" %" /> : <p className="text-sm text-muted">Renseigne le rôle de tes parties.</p>}
            </section>
            <section className="card card-pad">
              <h2 className="h-display mb-2 text-lg">Héros les plus joués</h2>
              <HBarChart data={byHero.slice(0, 8).map((h) => ({ label: name(h.key), value: h.games }))} color="#199e70" />
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <HeroList title="Mes meilleurs héros (≥ 3 parties)" rows={best.slice(0, 6)} name={name} heroMap={heroMap} />
            <HeroList title="Héros à améliorer" rows={toImprove.slice(0, 6)} name={name} heroMap={heroMap} />
            <section className="card card-pad">
              <h2 className="h-display mb-2 text-lg">En progression</h2>
              {progressing.length ? (
                <ul className="space-y-1.5 text-sm">
                  {progressing.slice(0, 6).map((x) => (
                    <li key={x.key} className="flex justify-between">
                      <span>{name(x.key)}</span>
                      <span className="text-good">+{x.delta.toFixed(0)} pt (5 dernières : {x.last.toFixed(0)} %)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nécessite au moins 6 parties sur un même héros.</p>
              )}
            </section>
          </div>

          <section className="card card-pad">
            <h2 className="h-display mb-2 text-lg">Win rate par héros</h2>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Héros</th>
                    <th>Parties</th>
                    <th>Win rate</th>
                    <th>KDA</th>
                    <th>K / D / A moy.</th>
                    <th>MVP</th>
                  </tr>
                </thead>
                <tbody>
                  {byHero.map((h) => (
                    <tr key={h.key}>
                      <td>
                        <Link href={`/heros/${h.key}`} className="hover:text-gold">
                          {name(h.key)}
                        </Link>
                      </td>
                      <td>{h.games}</td>
                      <td className={h.winRate >= 55 ? "text-good" : h.winRate < 45 ? "text-bad" : ""}>{pct(h.winRate)}</td>
                      <td>{h.kda.toFixed(2)}</td>
                      <td>
                        {h.kills.toFixed(1)} / {h.deaths.toFixed(1)} / {h.assists.toFixed(1)}
                      </td>
                      <td>{h.mvp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="h-display mb-2 text-lg">Historique des parties</h2>
            <div className="max-h-[480px] overflow-auto">
              <table className="table-base">
                <thead className="sticky top-0 bg-surface">
                  <tr>
                    <th>Date</th>
                    <th>Héros</th>
                    <th>Rôle</th>
                    <th>Résultat</th>
                    <th>K/D/A</th>
                    <th>Durée</th>
                    <th>MVP</th>
                    <th>Remarques</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap">{new Date(m.playedAt).toLocaleDateString("fr-FR")}</td>
                      <td>{name(m.hero)}</td>
                      <td>{m.role ? ROLE_FR[m.role as keyof typeof ROLE_FR] ?? m.role : "—"}</td>
                      <td className={m.result === "win" ? "text-good" : "text-bad"}>{m.result === "win" ? "Victoire" : "Défaite"}</td>
                      <td className="tabular-nums">
                        {m.kills}/{m.deaths}/{m.assists}
                      </td>
                      <td>{m.durationMin ?? "—"}</td>
                      <td>{m.mvp ? "★" : ""}</td>
                      <td className="max-w-xs truncate text-xs text-ink-2" title={m.notes ?? ""}>
                        {m.notes}
                        {m.entry === "ocr" && <span className="chip ml-1 text-[10px]">OCR</span>}
                      </td>
                      <td>
                        <button onClick={() => del(m.id)} className="text-muted hover:text-bad" aria-label="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function HeroList({ title, rows, name, heroMap }: { title: string; rows: Agg[]; name: (s: string) => string; heroMap: Map<string, Hero> }) {
  return (
    <section className="card card-pad">
      <h2 className="h-display mb-2 text-lg">{title}</h2>
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((h) => (
            <li key={h.key} className="flex items-center gap-2 text-sm">
              {heroMap.get(h.key) && <HeroAvatar hero={heroMap.get(h.key)!} size={26} />}
              {name(h.key)}
              <span className="ml-auto tabular-nums text-ink-2">
                {pct(h.winRate)} · {h.games} p.
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Pas encore assez de parties.</p>
      )}
    </section>
  );
}
