"use client";
import { useMemo, useState } from "react";
import { Save, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { adaptBuild, ARCHETYPE_FR, type EditorialBuild } from "@/lib/engine/builds";
import { ITEM_TAGS, type ItemTag } from "@/data/reference/items";
import { LANES, LANE_FR, UNAVAILABLE, type Hero, type Lane } from "@/lib/domain";
import type { Build, Item } from "@/lib/data/model";
import { personal } from "@/lib/client/store";
import { HeroAvatar } from "@/components/ui";
import { ItemIcon } from "@/components/hero/ItemRow";

interface Props {
  hero: Hero;
  heroes: Hero[];
  items: Item[];
  imported: Build[];
  editorial: EditorialBuild[];
}

interface AnyBuild {
  key: string;
  title: string;
  items: string[];
  origin: string;
  id?: string;
  user?: boolean;
}

export function BuildLab({ hero, heroes, items, imported, editorial }: Props) {
  const itemMap = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);
  const [enemies, setEnemies] = useState<string[]>([]);
  const [lane, setLane] = useState<Lane | "">((hero.lanes[0] as Lane) ?? "");
  const [heavyArmor, setHeavyArmor] = useState(false);
  const [heavyMagicDef, setHeavyMagicDef] = useState(false);
  const userBuilds: Build[] = imported.filter((b) => b.isUser);
  const all: AnyBuild[] = [
    ...imported.filter((b) => !b.isUser).map((b) => ({ key: `i${b.id}`, title: b.title, items: b.items, origin: `${b.sourceId}${b.sampleSize ? ` · n=${b.sampleSize}` : ""}` })),
    ...userBuilds.map((b) => ({ key: `${b.id}`, title: b.title, items: b.items, origin: "Mon build", id: b.id, user: true })),
    ...editorial.map((b) => ({ key: `e${b.type}`, title: b.title, items: b.items, origin: "Éditorial" })),
  ];
  const [baseKey, setBaseKey] = useState(all[0]?.key ?? "");
  const base = all.find((b) => b.key === baseKey) ?? all[0];
  const enemyHeroes = enemies.map((s) => heroes.find((h) => h.slug === s)!).filter(Boolean);
  const res = useMemo(() => adaptBuild(hero, enemyHeroes, (lane || null) as Lane | null, { heavyArmor, heavyMagicDef }, base?.items), [hero, enemyHeroes, lane, heavyArmor, heavyMagicDef, base]);

  const [cmpA, setCmpA] = useState(all[0]?.key ?? "");
  const [cmpB, setCmpB] = useState(all[1]?.key ?? "");
  const A = all.find((b) => b.key === cmpA);
  const B = all.find((b) => b.key === cmpB);

  const [custom, setCustom] = useState<string[]>(base?.items ?? []);
  const [customTitle, setCustomTitle] = useState("");
  const [msg, setMsg] = useState("");

  const saveCustom = (list: string[], title: string) => {
    personal.saveBuild({ hero: hero.slug, title, type: "personal", items: list });
    setMsg("Build sauvegardé sur cet appareil.");
    setTimeout(() => setMsg(""), 2000);
  };
  const removeUser = (id: string) => personal.deleteBuild(id);

  const tagCount = (list: string[]) => {
    const c = new Map<string, number>();
    list.forEach((s) => itemMap.get(s)?.tags.forEach((t) => c.set(t, (c.get(t) ?? 0) + 1)));
    return c;
  };
  const statSum = (list: string[]) => {
    const tot: Record<string, number> = {};
    let complete = true;
    let price = 0;
    for (const s of list) {
      const it = itemMap.get(s);
      if (!it?.stats || it.price == null) complete = false;
      else {
        price += it.price;
        Object.entries(it.stats).forEach(([k, v]) => (tot[k] = (tot[k] ?? 0) + v));
      }
    }
    return { tot, price, complete };
  };

  return (
    <div className="space-y-6">
      {/* Builds disponibles */}
      <section>
        <h3 className="h-display mb-2 text-lg">Builds de {hero.name}</h3>
        {!imported.some((b) => !b.isUser) && (
          <p className="mb-2 text-xs text-muted">
            Aucun build statistique importé : les builds Méta, Solo Queue et Compétitif affichent « {UNAVAILABLE} ». Les variantes ci-dessous sont des modèles éditoriaux (archétype {ARCHETYPE_FR[res.archetype]}).
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {all.map((b) => (
            <div key={b.key} className={clsx("rounded-xl border p-3", b.key === baseKey ? "border-gold/60 bg-gold/5" : "border-line bg-surface-2/50")}>
              <div className="mb-2 flex items-center gap-2">
                <p className="font-medium">{b.title}</p>
                <span className="chip text-[10px]">{b.origin}</span>
                <div className="ml-auto flex gap-1">
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setBaseKey(b.key)}>
                    Adapter
                  </button>
                  {b.user && b.id && (
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => removeUser(b.id!)} aria-label="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <ol className="flex flex-wrap gap-2">
                {b.items.map((s, i) => {
                  const it = itemMap.get(s);
                  return (
                    <li key={i} className="flex w-16 flex-col items-center gap-1 text-center" title={it?.use ?? s}>
                      {it ? <ItemIcon item={it} size={40} /> : <span className="h-10 w-10 rounded-lg bg-surface-3" />}
                      <span className="text-[10px] leading-tight text-ink-2">
                        {i + 1}. {it?.name ?? s}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
          {["Build Méta", "Build Solo Queue", "Build Compétitif"].map((t, i) => {
            const type = ["meta", "solo", "competitive"][i];
            const has = imported.some((b) => b.type === type);
            return (
              <p key={t} className="rounded-lg border border-dashed border-line p-2">
                {t} : {has ? "voir ci-dessus (importé)" : `${UNAVAILABLE} — nécessite un import avec échantillon`}
              </p>
            );
          })}
        </div>
      </section>

      {/* Builds adaptatifs */}
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <h3 className="h-display text-lg">Build adaptatif</h3>
        <p className="mb-3 text-xs text-muted">Choisis la composition adverse : le moteur remplace les objets flexibles selon les soins, boucliers, résistances, types de dégâts et contrôles adverses. Règles transparentes, non statistiques.</p>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="min-w-56">
            <span className="label">Ajouter un adversaire ({enemies.length}/5)</span>
            <select
              className="input"
              value=""
              onChange={(e) => e.target.value && enemies.length < 5 && setEnemies((x) => [...new Set([...x, e.target.value])])}
              disabled={enemies.length >= 5}
            >
              <option value="">Choisir…</option>
              {heroes
                .filter((h) => h.slug !== hero.slug && !enemies.includes(h.slug) && h.profile)
                .map((h) => (
                  <option key={h.slug} value={h.slug}>
                    {h.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="label">Ma lane</span>
            <select className="input" value={lane} onChange={(e) => setLane(e.target.value as Lane)}>
              {LANES.map((l) => (
                <option key={l} value={l}>
                  {LANE_FR[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs text-ink-2">
            <input type="checkbox" checked={heavyArmor} onChange={(e) => setHeavyArmor(e.target.checked)} /> Adversaires avec beaucoup d&apos;armure
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs text-ink-2">
            <input type="checkbox" checked={heavyMagicDef} onChange={(e) => setHeavyMagicDef(e.target.checked)} /> Beaucoup de défense magique
          </label>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {enemyHeroes.map((h) => (
            <span key={h.slug} className="chip gap-2 py-1">
              <HeroAvatar hero={h} size={20} /> {h.name}
              <button onClick={() => setEnemies((x) => x.filter((s) => s !== h.slug))} aria-label={`Retirer ${h.name}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="label">Build adapté (base : {base?.title})</p>
            <ol className="space-y-1.5">
              {res.adapted.map((s, i) => {
                const it = itemMap.get(s);
                const ch = res.changes.find((c) => c.add === s && c.replace);
                return (
                  <li key={i} className={clsx("flex items-center gap-2 rounded-lg border p-1.5 text-sm", ch ? "border-gold/60 bg-gold/5" : "border-line")}>
                    <span className="w-4 text-center text-muted">{i + 1}</span>
                    {it && <ItemIcon item={it} size={28} />}
                    <span>{it?.name ?? s}</span>
                    {ch && <span className="ml-auto text-[11px] text-gold">remplace {itemMap.get(ch.replace!)?.name}</span>}
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 text-sm">
              Sort conseillé : <b>{res.spell.slug}</b> <span className="text-muted">— {res.spell.reason}</span>
            </p>
            <button className="btn-ghost mt-2" onClick={() => saveCustom(res.adapted, `Adapté vs ${enemyHeroes.map((h) => h.name).join(", ") || "—"}`)}>
              <Save size={14} /> Sauvegarder ce build
            </button>
          </div>
          <div>
            <p className="label">Pourquoi ces changements</p>
            {res.changes.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                {res.changes.map((c, i) => (
                  <li key={i}>
                    <b>{itemMap.get(c.add)?.name}</b> : {c.reason} <span className="text-muted">({c.trigger})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{enemies.length ? "Aucune adaptation nécessaire face à cette composition." : "Ajoute des adversaires pour adapter le build."}</p>
            )}
            {enemies.length > 0 && (
              <p className="mt-3 text-xs text-muted">
                Adversaires : {res.enemySummary.physical} physique(s), {res.enemySummary.magic} magique(s), {res.enemySummary.healers} à soins/sustain, {res.enemySummary.shields} à boucliers, {res.enemySummary.tanks} très résistant(s), contrôle cumulé {res.enemySummary.cc}.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Comparateur de builds */}
      <section>
        <h3 className="h-display mb-2 text-lg">Comparer deux builds</h3>
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {[
            [cmpA, setCmpA],
            [cmpB, setCmpB],
          ].map(([v, set], i) => (
            <select key={i} className="input" value={v as string} onChange={(e) => (set as (x: string) => void)(e.target.value)}>
              {all.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.title} ({b.origin})
                </option>
              ))}
            </select>
          ))}
        </div>
        {A && B && (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Critère</th>
                  <th>{A.title}</th>
                  <th>{B.title}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Objets</td>
                  <td className="text-xs">{A.items.map((s) => itemMap.get(s)?.name ?? s).join(", ")}</td>
                  <td className="text-xs">{B.items.map((s) => itemMap.get(s)?.name ?? s).join(", ")}</td>
                </tr>
                <tr>
                  <td>Coût total</td>
                  {[A, B].map((x) => {
                    const s = statSum(x.items);
                    return <td key={x.key}>{s.complete ? `${s.price} or` : UNAVAILABLE}</td>;
                  })}
                </tr>
                {(Object.keys(ITEM_TAGS) as ItemTag[])
                  .filter((t) => tagCount(A.items).get(t) || tagCount(B.items).get(t))
                  .map((t) => {
                    const a = tagCount(A.items).get(t) ?? 0;
                    const b = tagCount(B.items).get(t) ?? 0;
                    return (
                      <tr key={t}>
                        <td>{ITEM_TAGS[t]}</td>
                        <td className={a > b ? "text-good" : ""}>{a ? `${a} objet(s)` : "—"}</td>
                        <td className={b > a ? "text-good" : ""}>{b ? `${b} objet(s)` : "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-muted">Comparaison par rôle tactique des objets ; les totaux de statistiques s&apos;afficheront quand les statistiques d&apos;objets auront été importées.</p>
          </div>
        )}
      </section>

      {/* Build personnalisé */}
      <section>
        <h3 className="h-display mb-2 text-lg">Créer mon build</h3>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <select key={i} className="input" value={custom[i] ?? ""} onChange={(e) => setCustom((c) => Object.assign([...c], { [i]: e.target.value }))} aria-label={`Objet ${i + 1}`}>
              <option value="">Objet {i + 1}</option>
              {items.map((it) => (
                <option key={it.slug} value={it.slug}>
                  {it.name}
                </option>
              ))}
            </select>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="Nom du build" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
          <button className="btn-primary" disabled={!customTitle || custom.filter(Boolean).length === 0} onClick={() => saveCustom(custom.filter(Boolean), customTitle)}>
            <Save size={14} /> Sauvegarder
          </button>
          {msg && <span className="self-center text-sm text-good">{msg}</span>}
        </div>
      </section>
    </div>
  );
}
