"use client";
/**
 * Dernières parties du journal, avec leurs annotations.
 * Toucher une partie permet d'ajouter / modifier étiquettes et note (ou de la supprimer).
 */
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Pencil, Trash2 } from "lucide-react";
import { HeroAvatar } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { personal, usePersonal, type Match } from "@/lib/client/store";
import type { Hero } from "@/lib/domain";
import { TagChips, TagPicker } from "./TagPicker";

/** Regroupe les lignes d'une même partie (duo) sous un seul élément, plus récentes d'abord. */
export function groupGames(matches: Match[]): Match[][] {
  const groups = new Map<string, Match[]>();
  for (const m of matches) {
    const key = m.gameId ?? `id${m.id}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const t = (m: Match) => new Date(m.createdAt ?? m.playedAt).getTime() || m.id;
  return [...groups.values()].sort((a, b) => t(b[0]) - t(a[0]));
}

export function RecentGames({ heroes }: { heroes: Hero[] }) {
  const me = usePersonal();
  const idx = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const games = useMemo(() => groupGames(me.matches).slice(0, 8), [me.matches]);
  const [edit, setEdit] = useState<string | null>(null);
  const nom = (id?: string) => me.players.find((p) => p.id === (id ?? "moi"))?.nom ?? "";
  const editing = edit ? groupGames(me.matches).find((g) => (g[0].gameId ?? `id${g[0].id}`) === edit) : null;

  if (!games.length) return null;
  return (
    <section className="card p-3">
      <p className="label">Dernières parties</p>
      <ul className="space-y-2">
        {games.map((g) => {
          const key = g[0].gameId ?? `id${g[0].id}`;
          const win = g[0].result === "win";
          const when = g[0].createdAt ? new Date(g[0].createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : g[0].playedAt;
          return (
            <li key={key}>
              <button onClick={() => setEdit(key)} className="flex w-full items-start gap-2.5 rounded-2xl border border-white/5 bg-white/[0.03] p-2 text-left">
                <span className={clsx("mt-1 h-10 w-1.5 shrink-0 rounded-full", win ? "bg-good" : "bg-bad")} />
                <span className="flex shrink-0 -space-x-2">
                  {g.map((m) => idx.get(m.hero) && <HeroAvatar key={m.id} hero={idx.get(m.hero)!} size={36} />)}
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-center gap-2 text-sm">
                    <b className={win ? "text-good" : "text-bad"}>{win ? "Victoire" : "Défaite"}</b>
                    <span className="truncate text-xs text-muted">{when}</span>
                  </span>
                  {g.map((m) =>
                    !m.sansKda || m.tags?.length || m.notes ? (
                      <span key={m.id} className="block text-xs text-ink-2">
                        {g.length > 1 && <b>{nom(m.player)} : </b>}
                        {!m.sansKda && `${m.kills}/${m.deaths}/${m.assists}`}
                        {m.rating != null && ` · note ${String(m.rating).replace(".", ",")}`}
                        {m.mvp && " · MVP"}
                        {m.notes && <span className="block italic text-muted">« {m.notes} »</span>}
                        <TagChips tags={m.tags} />
                      </span>
                    ) : null,
                  )}
                </span>
                <Pencil size={14} className="mt-1 shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>
      {editing && <AnnotateSheet game={editing} onClose={() => setEdit(null)} />}
    </section>
  );
}

/** Annoter une partie : étiquettes et note pour chaque joueur, ou suppression. */
export function AnnotateSheet({ game, onClose }: { game: Match[]; onClose: () => void }) {
  const me = usePersonal();
  // On relit la partie dans le stockage à chaque rendu : les modifications s'affichent tout de suite.
  const rows = game.map((g) => me.matches.find((m) => m.id === g.id)).filter((m): m is Match => !!m);
  const [notes, setNotes] = useState<Record<number, string>>(Object.fromEntries(game.map((m) => [m.id, m.notes ?? ""])));
  const nom = (id?: string) => me.players.find((p) => p.id === (id ?? "moi"))?.nom ?? "";
  const close = () => {
    for (const m of rows) if ((m.notes ?? "") !== (notes[m.id] ?? "")) personal.updateMatch(m.id, { notes: notes[m.id].trim() || null });
    onClose();
  };
  return (
    <Sheet
      title="Annoter la partie"
      onClose={close}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            className="btn-ghost min-h-12 text-bad"
            onClick={() => {
              if (!confirm("Supprimer cette partie du journal ?")) return;
              rows.forEach((m) => personal.deleteMatch(m.id));
              onClose();
            }}
          >
            <Trash2 size={16} /> Supprimer
          </button>
          <button className="btn-gold min-h-12" onClick={close}>
            Terminé
          </button>
        </div>
      }
    >
      {rows.map((m) => (
        <section key={m.id} className="card space-y-2 p-3">
          <p className="font-bold">{nom(m.player)}</p>
          <TagPicker
            tags={m.tags ?? []}
            onToggle={(t) => personal.updateMatch(m.id, { tags: m.tags?.includes(t) ? m.tags.filter((x) => x !== t) : [...(m.tags ?? []), t] })}
            note={notes[m.id]}
            onNote={(v) => setNotes((n) => ({ ...n, [m.id]: v }))}
          />
        </section>
      ))}
    </Sheet>
  );
}
