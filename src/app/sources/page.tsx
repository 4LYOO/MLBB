import type { Metadata } from "next";
import clsx from "clsx";
import { Card, Notice, PageHeader, ReliabilityDots, fmtDate } from "@/components/ui";
import { ImportPanel, RunConnector } from "@/components/sources/ImportPanel";
import { SyncPanel } from "@/components/sources/SyncPanel";
import { PasteImport } from "@/components/sources/PasteImport";
import { getHeroes } from "@/lib/server/repo";
import { getAvailableStatKeys, getSources, getSyncRuns, isStale, staleAfterHours } from "@/lib/server/repo";
import { connectorInfos } from "@/lib/server/connectors";
import { getDb } from "@/lib/server/db";
import { AVOID_SOURCES, VERIFIED_ON } from "@/data/reference/sources";
import { PERIODS, PERIOD_FR, RANKS, RANK_FR, SOURCE_KIND_FR } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sources & données" };

const STATUS: Record<string, { label: string; cls: string }> = {
  ready: { label: "Opérationnel", cls: "border-good/50 text-good" },
  "needs-config": { label: "À configurer", cls: "border-warn/50 text-warn" },
  "not-implemented": { label: "À développer", cls: "border-warn/50 text-warn" },
  "pending-decision": { label: "Décision en attente", cls: "border-violet/50 text-violet" },
  forbidden: { label: "Interdit par les CGU", cls: "border-bad/50 text-bad" },
};

export default function SourcesPage() {
  const sources = getSources();
  const connectors = connectorInfos();
  const runs = getSyncRuns(25);
  const keys = getAvailableStatKeys();
  const db = getDb();
  const count = (t: string, where = "") => (db.prepare(`SELECT COUNT(*) n FROM ${t} ${where}`).get() as { n: number }).n;
  const coverage = [
    ["Héros", count("heroes"), "référentiel + imports"],
    ["Profils de draft", count("hero_profiles"), "éditorial"],
    ["Compétences", count("hero_details", "WHERE skills IS NOT NULL"), "import requis"],
    ["Statistiques (lignes)", count("hero_stats"), "import requis"],
    ["Matchups / synergies", count("matchups"), "import requis"],
    ["Stats e-sport", count("pro_stats"), "import requis"],
    ["Objets avec prix", count("items", "WHERE price IS NOT NULL"), `sur ${count("items")}`],
    ["Builds importés", count("builds", "WHERE is_user = 0"), "import requis"],
    ["Patchs", count("patches"), "import ou saisie"],
    ["Parties personnelles", count("matches"), "saisie"],
  ] as const;
  return (
    <>
      <PageHeader
        kicker="Fiabilité"
        title="Sources & données"
        subtitle={`Provenance, fiabilité et fraîcheur de chaque donnée. Sources du dossier de référence vérifiées le ${fmtDate(VERIFIED_ON)}. Une statistique de plus de ${staleAfterHours()} h est signalée comme potentiellement obsolète.`}
      />
      <div className="mb-4">
        <Notice>
          Les données sont séparées par nature : <b>officielles</b>, <b>statistiques</b>, <b>communautaires</b>, <b>analyses calculées</b> par l&apos;application, <b>référence éditoriale</b> et <b>saisies manuelles</b>. Chaque enregistrement importé garde sa source, sa date de capture, sa période et son rang. En cas de conflit, la capture la plus récente l&apos;emporte, puis la source la plus fiable.
        </Notice>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Synchronisation mlbb.io">
          <SyncPanel lastSync={sources.find((s) => s.id === "mlbbio")?.lastSyncAt ?? null} />
        </Card>
        <Card title="Import manuel par collage" subtitle="MLBBHub et toute source sans connecteur">
          <PasteImport heroes={getHeroes().map((h) => ({ slug: h.slug, name: h.name }))} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Connecteurs de synchronisation">
          <ul className="space-y-3">
            {connectors.map((c) => (
              <li key={c.id} className="glass-inset rounded-2xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{c.name}</p>
                  <span className={clsx("chip", STATUS[c.status].cls)}>{STATUS[c.status].label}</span>
                  <span className="ml-auto">
                    {c.id !== "mlbbio" && <RunConnector id={c.id} disabled={c.status !== "ready"} />}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-2">{c.explanation}</p>
                <p className="mt-1 text-xs text-muted">Fournit : {c.provides.join(", ")}</p>
                <p className="text-xs text-muted">Nécessite : {c.requirements.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card title="Importer des données">
            <ImportPanel />
          </Card>
          <Card title="Couverture des données">
            <ul className="space-y-1 text-sm">
              {coverage.map(([l, n, hint]) => (
                <li key={l} className="flex justify-between gap-2">
                  <span className="text-ink-2">{l}</span>
                  <span className={clsx("tabular-nums", n === 0 && "text-muted")}>
                    {n} <span className="text-xs text-muted">({hint})</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card title="Statistiques disponibles par rang et période" className="mt-4">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Rang</th>
                {PERIODS.map((p) => (
                  <th key={p}>{PERIOD_FR[p]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RANKS.map((r) => (
                <tr key={r}>
                  <td>{RANK_FR[r]}</td>
                  {PERIODS.map((p) => {
                    const k = keys.find((x) => x.rank === r && x.period === p);
                    return (
                      <td key={p} className={clsx("text-xs", !k && "text-muted", k && isStale(k.last) && "text-warn")}>
                        {k ? `${k.captures} capture(s) · ${fmtDate(k.last)}${isStale(k.last) ? " · obsolète" : ""}` : "Indisponible"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Registre des sources" className="mt-4" subtitle="Évaluation du dossier de référence + vérification d'accès et des conditions d'utilisation">
        <div className="overflow-x-auto">
          <table className="table-base min-w-[900px]">
            <thead>
              <tr>
                <th>Source</th>
                <th>Nature</th>
                <th>Fiabilité</th>
                <th>Accès vérifié</th>
                <th>Conditions</th>
                <th>Dernière synchro</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="align-top">
                  <td>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        {s.name}
                      </a>
                    ) : (
                      <span className="font-medium">{s.name}</span>
                    )}
                    {s.notes && <p className="mt-1 max-w-sm text-xs text-muted">{s.notes}</p>}
                  </td>
                  <td className="text-xs">{SOURCE_KIND_FR[s.kind]}</td>
                  <td>
                    <ReliabilityDots value={s.reliability} />
                  </td>
                  <td className="max-w-xs text-xs text-ink-2">{s.access}</td>
                  <td className="max-w-sm text-xs text-ink-2">{s.terms}</td>
                  <td className="text-xs">{fmtDate(s.lastSyncAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Journal de synchronisation">
          {runs.length ? (
            <ul className="max-h-80 space-y-1 overflow-auto text-xs">
              {runs.map((r) => (
                <li key={r.id} className="flex gap-2 border-b border-line py-1">
                  <span className="whitespace-nowrap text-muted">{fmtDate(r.started_at, true)}</span>
                  <span className={clsx("w-14", r.status === "ok" ? "text-good" : r.status === "error" ? "text-bad" : "text-warn")}>{r.status}</span>
                  <span className="text-ink-2">
                    {r.connector} · {r.records} enr. {r.message && <span className="text-muted">— {r.message.slice(0, 160)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aucune synchronisation.</p>
          )}
        </Card>
        <Card title="Sources à éviter" subtitle="Selon le dossier de référence">
          <ul className="space-y-1 text-sm">
            {AVOID_SOURCES.map((a) => (
              <li key={a.name}>
                <b>{a.name}</b> <span className="text-ink-2">— {a.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
