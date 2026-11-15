"use client";
/**
 * FICHE D'AVANT-PARTIE — une carte par joueur (toi / ta conjointe) :
 * build adapté à la compo ennemie, emblème, sort de combat, plan de jeu en 3 points,
 * héros ennemi à surveiller, accès direct au coaching du rôle.
 * En bas : enregistrement du résultat (Victoire / Défaite) en 1 tap.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlarmClock, GraduationCap, Trophy, X, XCircle } from "lucide-react";
import { AVerifier, HeroAvatar } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { personal, type Player } from "@/lib/client/store";
import { adaptBuild, archetypeOf, EMBLEM_BY_ARCHETYPE } from "@/lib/engine/builds";
import { analyzeComposition, matchup, type MatchupDatum } from "@/lib/engine/draft";
import { EDITORIAL_EMBLEMS, EDITORIAL_SPELLS } from "@/data/reference/items";
import { LANE_FR, type Hero, type Lane, type Role } from "@/lib/domain";

/** Rôle « principal » associé à une lane (pour le journal et le coaching). */
const ROLE_OF_LANE: Record<Lane, Role> = { exp: "Fighter", jungle: "Assassin", mid: "Mage", roam: "Tank", gold: "Marksman" };

/** Un conseil de base par lane (complété par la page Coaching en phase 3). */
const LANE_TIP: Record<Lane, string> = {
  exp: "Gagne ta lane en échanges courts, puis rejoins la Tortue quand ta vague est poussée.",
  jungle: "Sécurise tes buffs, puis ganke la lane la plus favorable ; garde Châtiment pour les objectifs.",
  mid: "Pousse ta vague vite, puis aide ton jungler sur la Tortue et contrôle la rivière.",
  roam: "Accompagne ton jungler, prends la vision avant chaque objectif et protège ton carry en teamfight.",
  gold: "Farm en priorité et ne meurs pas tôt : ton pic de puissance gagne la fin de partie.",
};

interface Props {
  heroes: Hero[];
  idx: Map<string, Hero>;
  allies: (string | null)[]; // les 5 emplacements alliés (dans l'ordre)
  enemies: string[];
  owners: (Player["id"] | null)[];
  players: Player[];
  matchups: MatchupDatum[];
  combos: Map<string, string>;
  laneOf: (slug: string) => Lane | null;
  onClose: () => void;
}

export function PregameSheet({ heroes, idx, allies, enemies, owners, players, matchups, combos, laneOf, onClose }: Props) {
  const { model } = useData();
  const [saved, setSaved] = useState<string | null>(null);
  const enemyHeroes = enemies.map((s) => idx.get(s)!).filter(Boolean);
  const allySlugs = allies.filter(Boolean) as string[];
  const analysis = useMemo(() => analyzeComposition(allySlugs, enemies, heroes, combos, matchups), [allySlugs, enemies, heroes, combos, matchups]);
  const itemName = (slug: string) => model.items.find((i) => i.slug === slug)?.name ?? slug;

  // Joueurs ayant un héros sur le plateau
  const cards = owners
    .map((o, i) => ({ owner: o, slug: allies[i] }))
    .filter((x): x is { owner: Player["id"]; slug: string } => !!x.owner && !!x.slug)
    .map(({ owner, slug }) => {
      const hero = idx.get(slug)!;
      const lane = laneOf(slug) ?? (hero.lanes[0] as Lane) ?? null;
      const build = adaptBuild(hero, enemyHeroes, lane);
      const details = model.details.get(slug);
      const consensus = details?.extras?.emblemConsensus;
      const spellCons = details?.extras?.battleSpellConsensus;
      const editorialEmblem = hero.profile ? EMBLEM_BY_ARCHETYPE[archetypeOf(hero)] : null;
      // Ennemi le plus dangereux pour CE héros (matchup le plus défavorable)
      const threat = enemyHeroes
        .map((e) => ({ e, m: matchup(hero, e, matchups) }))
        .sort((a, b) => a.m.value - b.m.value)[0];
      const plan = [
        analysis.winConditions[0] ?? "Jouez les objectifs en groupe.",
        lane ? LANE_TIP[lane] : "Reste groupé avec ton équipe.",
        threat && threat.m.value < 0 ? `Méfie-toi de ${threat.e.name} : ${(threat.m.reasons.find((r) => r.value < 0)?.text ?? "matchup défavorable").replace(/\.$/, "")}.` : analysis.tips[0] ?? "Adapte ton build à la compo adverse.",
      ];
      return { owner, player: players.find((p) => p.id === owner)!, hero, lane, build, consensus, spellCons, editorialEmblem, threat, plan };
    });

  const record = (result: "win" | "loss") => {
    const gameId = `g${Date.now()}`;
    for (const c of cards)
      personal.addMatch({
        playedAt: new Date().toISOString().slice(0, 10),
        hero: c.hero.slug,
        role: c.lane ? ROLE_OF_LANE[c.lane] : (c.hero.roles[0] ?? null),
        result,
        kills: 0,
        deaths: 0,
        assists: 0,
        sansKda: true,
        durationMin: null,
        mvp: false,
        rank: null,
        notes: null,
        entry: "draft",
        player: c.owner,
        allies: allySlugs,
        enemies,
        gameId,
      });
    setSaved(result === "win" ? "Victoire enregistrée" : "Défaite enregistrée");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-sheet bg-[#05060a]/90 backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label="Fiche d'avant-partie">
      <div className="pt-safe flex items-center gap-2 border-b border-line px-3 py-2">
        <p className="h-display flex-1 text-lg">Fiche d&apos;avant-partie</p>
        <button className="btn-ghost min-h-11 min-w-11 px-0" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>
      </div>
      <div className="pb-safe flex-1 space-y-3 overflow-y-auto p-3">
        {cards.map((c) => (
          <section key={c.owner} className="card p-3">
            <div className="mb-2 flex items-center gap-3">
              <HeroAvatar hero={c.hero} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">{c.player.nom}</p>
                <p className="h-display text-xl">{c.hero.name}</p>
                <p className="text-xs text-muted">{c.lane ? LANE_FR[c.lane] : "—"}</p>
              </div>
            </div>

            <p className="label">Build {c.build.changes.length > 0 && "(adapté à leur compo)"} <AVerifier title="Build éditorial adapté par règles : vérifie les items du patch" /></p>
            <ol className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {c.build.adapted.map((it, i) => (
                <li key={i} className={c.build.changes.some((ch) => ch.add === it && ch.replace) ? "text-gold" : ""}>
                  {i + 1}. {itemName(it)}
                </li>
              ))}
            </ol>
            {c.build.changes.filter((ch) => ch.replace).length > 0 && (
              <p className="-mt-2 mb-3 text-xs text-ink-2">{c.build.changes.filter((ch) => ch.replace).map((ch) => `${itemName(ch.add)} : ${ch.reason.replace(/\.$/, "")}`).join(" · ")}</p>
            )}

            <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="label">Emblème</p>
                {c.consensus?.main ? (
                  <p>
                    <b>{c.consensus.main.name}</b>
                    <span className="block text-xs text-muted">{c.consensus.talents?.map((t) => t.name).join(" · ")}</span>
                  </p>
                ) : c.editorialEmblem ? (
                  <p>
                    <b>{EDITORIAL_EMBLEMS.find((e) => e.slug === c.editorialEmblem!.emblem)?.nameFr}</b> <AVerifier />
                    <span className="block text-xs text-muted">{c.editorialEmblem.talents.join(" · ")}</span>
                  </p>
                ) : (
                  <p className="text-muted">—</p>
                )}
              </div>
              <div>
                <p className="label">Sort de combat</p>
                <p>
                  <b>{c.lane === "jungle" ? "Retribution" : (spellName(c.build.spell.slug) ?? c.spellCons?.primary?.name)}</b>
                  <span className="block text-xs text-muted">{c.build.spell.reason}</span>
                </p>
              </div>
            </div>

            <p className="label">Plan de jeu</p>
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-ink-2">
              {c.plan.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>

            {c.threat && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-bad/40 bg-bad/10 p-2 text-sm">
                <HeroAvatar hero={c.threat.e} size={32} />
                <span>
                  À surveiller : <b>{c.threat.e.name}</b>
                </span>
              </div>
            )}

            <Link href={c.lane ? `/coaching/${c.lane}` : "/coaching"} className="btn-ghost w-full">
              <GraduationCap size={18} /> Coaching de mon rôle{c.lane ? ` (${LANE_FR[c.lane]})` : ""}
            </Link>
          </section>
        ))}
        <Link href="/aide" className="btn-ghost w-full">
          <AlarmClock size={18} /> Aide-mémoire en partie (objectifs, items de contre)
        </Link>
        {!cards.length && <p className="text-sm text-muted">Attribue tes emplacements (« + joueur ») et choisis vos héros pour voir la fiche.</p>}

        {cards.length > 0 && (
          <section className="card p-3">
            <p className="mb-2 text-sm font-semibold">Résultat de la partie</p>
            {saved ? (
              <p className="text-center font-semibold text-good">{saved} dans le journal.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-good min-h-14" onClick={() => record("win")}>
                  <Trophy size={18} /> Victoire
                </button>
                <button className="btn-bad min-h-14" onClick={() => record("loss")}>
                  <XCircle size={18} /> Défaite
                </button>
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted">Enregistre vos héros et la compo ennemie : les bans conseillés apprennent de vos défaites.</p>
          </section>
        )}
      </div>
    </div>
  );
}

const spellName = (slug: string) => EDITORIAL_SPELLS.find((s) => s.slug === slug)?.name;
