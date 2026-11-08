"use client";
import Link from "next/link";
import clsx from "clsx";
import { Card, HeroAvatar, Notice, PageHeader, Provenance, Unavailable, fmtDate } from "@/components/ui";
import { DeletePatch, PatchForm } from "@/components/patch/PatchForm";
import { useData } from "@/lib/client/data";
import { DataGate } from "./Loading";
import { impactedHeroes } from "@/lib/engine/patch";
import { REFERENCE_PATCH, REFERENCE_SEASON, REFERENCE_LINKS } from "@/data/reference/sources";


const CHANGE_FR: Record<string, string> = { buff: "Buff", nerf: "Nerf", adjust: "Ajustement", new: "Nouveau", revamp: "Refonte", other: "Autre" };
const TYPE_FR: Record<string, string> = { hero: "Héros", item: "Objets", emblem: "Emblèmes", spell: "Sorts", system: "Gameplay" };

export function PatchesView() {
  return (
    <DataGate>
      <Inner />
    </DataGate>
  );
}

function Inner() {
  const { model } = useData();
  const patches = model.patches;
  const heroes = model.heroes;
  const items = model.items;
  const sources = Object.fromEntries(model.sourceById);
  const byHero = new Map(heroes.map((h) => [h.slug, h]));
  return (
    <>
      <PageHeader
        kicker="Mises à jour"
        title="Patch notes"
        subtitle={`Référence du dossier de sources : ${REFERENCE_SEASON}, patch ${REFERENCE_PATCH} (serveur officiel). Importe ou saisis les notes de patch : les héros impactés sont identifiés automatiquement.`}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {!patches.length && <Unavailable reason="Aucune note de patch importée ou saisie. Les notes ne sont jamais rédigées de mémoire : utilise le formulaire ou un paquet de données." />}
          {patches.map((p) => {
            const imp = impactedHeroes(p.changes, heroes, items);
            const groups = [...new Set(p.changes.map((c) => c.targetType))];
            return (
              <Card
                key={p.version}
                title={`Patch ${p.version}${p.title ? ` — ${p.title}` : ""}`}
                subtitle={`${p.server === "advanced" ? "Serveur avancé (test)" : "Serveur officiel"} · ${fmtDate(p.date)}`}
                actions={p.isUser ? <DeletePatch version={p.version} /> : undefined}
              >
                {p.server === "advanced" && (
                  <div className="mb-3">
                    <Notice tone="warn">Serveur avancé : changements en test, pas forcément repris sur le serveur officiel.</Notice>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    {groups.map((g) => (
                      <div key={g}>
                        <p className="label">{TYPE_FR[g] ?? g}</p>
                        <ul className="space-y-1 text-sm">
                          {p.changes
                            .filter((c) => c.targetType === g)
                            .map((c) => (
                              <li key={c.id}>
                                <span className={clsx("chip mr-2", c.change === "buff" && "border-good/50 text-good", c.change === "nerf" && "border-bad/50 text-bad")}>{CHANGE_FR[c.change] ?? c.change}</span>
                                <b>{byHero.get(c.target)?.name ?? c.target}</b> — <span className="text-ink-2">{c.text}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="label">Héros potentiellement impactés</p>
                    {imp.direct.size + imp.indirect.size === 0 ? (
                      <p className="text-sm text-muted">Aucun héros identifié.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {[...imp.direct.entries()].map(([s, why]) => (
                          <li key={s} className="flex items-start gap-2">
                            {byHero.get(s) && <HeroAvatar hero={byHero.get(s)!} size={22} />}
                            <span>
                              <Link className="font-medium hover:text-gold" href={`/heros/${s}`}>
                                {byHero.get(s)?.name}
                              </Link>{" "}
                              <span className="chip ml-1 text-[10px]">direct</span> <span className="text-xs text-ink-2">{why[0]}</span>
                            </span>
                          </li>
                        ))}
                        {[...imp.indirect.entries()].slice(0, 15).map(([s, why]) => (
                          <li key={s} className="flex items-start gap-2">
                            {byHero.get(s) && <HeroAvatar hero={byHero.get(s)!} size={22} />}
                            <span>
                              <Link className="hover:text-gold" href={`/heros/${s}`}>
                                {byHero.get(s)?.name}
                              </Link>{" "}
                              <span className="chip ml-1 text-[10px]">via objet</span> <span className="text-xs text-muted">{why.join(", ")}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-[11px] text-muted">Impact indirect : objet modifié présent dans le build de base de l&apos;archétype du héros. Vérifie l&apos;effet réel une semaine après via les tendances.</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Provenance source={sources[p.sourceId]} capturedAt={p.capturedAt} note={p.url ? `Lien : ${p.url}` : undefined} />
                </div>
              </Card>
            );
          })}
        </div>
        <div className="space-y-4">
          <Card title="Saisir une note de patch" subtitle="Source « manuelle » — indique toujours le lien d'origine">
            <PatchForm />
          </Card>
          <Card title="Où lire les patch notes">
            <ul className="space-y-1 text-sm">
              {REFERENCE_LINKS.filter((l) => l.category === "Mises à jour").map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {l.name}
                  </a>{" "}
                  <span className="text-xs text-muted">— {l.note}</span>
                </li>
              ))}
              <li>
                <a href="https://www.reddit.com/r/MobileLegendsGame/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  r/MobileLegendsGame
                </a>{" "}
                <span className="text-xs text-muted">— notes officielles et serveur avancé le jour même</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
