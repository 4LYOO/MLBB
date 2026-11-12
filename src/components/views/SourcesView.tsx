"use client";
import clsx from "clsx";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Card, Notice, ReliabilityDots, fmtDate } from "@/components/ui";
import { BackupPanel, ImportPanel } from "@/components/sources/ImportPanel";
import { PasteImport } from "@/components/sources/PasteImport";
import { useData } from "@/lib/client/data";
import { availableStatKeys, catalogOf, isStale, STALE_HOURS } from "@/lib/data/model";
import { AVOID_SOURCES, VERIFIED_ON } from "@/data/reference/sources";
import { PERIODS, PERIOD_FR, RANKS, RANK_FR, SOURCE_KIND_FR } from "@/lib/domain";
import { DataGate } from "./Loading";

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? "";

const CONNECTORS = [
  {
    name: "mlbb.io",
    status: "Automatique",
    cls: "!border-good/50 text-good",
    text: "Synchronisé par GitHub Actions toutes les 12 h puis publié avec le site : stats 6 rangs × 5 périodes, compétences, counters, synergies, emblèmes, objets.",
  },
  {
    name: "MLBBHub",
    status: "Import manuel",
    cls: "!border-warn/50 text-warn",
    text: "Ses conditions interdisent l'extraction automatisée sans autorisation écrite (revérifié le 8 nov. 2026) : copie le tableau dans Safari et colle-le ci-dessous.",
  },
  {
    name: "Liquipedia (e-sport)",
    status: "Fichier",
    cls: "!border-warn/50 text-warn",
    text: "Licence CC BY-SA. Importe un fichier proStats, ou dépose-le dans data/imports/ du dépôt pour le publier à chaque synchro.",
  },
  {
    name: "Moonton (officiel)",
    status: "Indisponible",
    cls: "!border-bad/50 text-bad",
    text: "Aucune API publique documentée.",
  },
];

const STATUS_FR: Record<string, string> = { ok: "OK", warning: "Partiel", error: "Erreur", "kept-previous": "Conservé" };

export function SourcesView() {
  return (
    <DataGate>
      <Inner />
    </DataGate>
  );
}

function Inner() {
  const { model, published } = useData();
  const keys = availableStatKeys(model);
  const lastOk = published?.syncLog.find((l) => l.connector === "mlbbio" && (l.status === "ok" || l.status === "warning"));
  const coverage: [string, number, string][] = [
    ["Héros", model.heroes.length, "référentiel + synchro"],
    ["Profils de draft", model.heroes.filter((h) => h.profile).length, "éditorial + dérivés"],
    ["Compétences", [...model.details.values()].filter((d) => d.skills?.length).length, "synchro"],
    ["Statistiques (lignes)", model.stats.length, "synchro + historique + imports"],
    ["Matchups / synergies", model.matchups.length, "synchro"],
    ["Stats e-sport", model.proStats.length, "import"],
    ["Objets avec prix", model.items.filter((i) => i.price != null).length, `sur ${model.items.length}`],
    ["Talents", catalogOf(model, "talent").length, "synchro"],
    ["Patchs", model.patches.length, "import ou saisie"],
  ];

  return (
    <>
      <div className="mb-4">
        <Notice>
          Les données sont séparées par nature : <b>statistiques</b> (mlbb.io, imports), <b>communautaires</b>, <b>analyses calculées</b> par l&apos;application, <b>référence éditoriale</b> et <b>saisies
          manuelles</b>. Chaque donnée garde sa source, sa date de capture, sa période et son rang. En cas de conflit, la capture la plus récente l&apos;emporte, puis la source la plus fiable.
        </Notice>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Synchronisation automatique">
          <div className="space-y-2 text-sm">
            <p className="text-ink-2">
              GitHub Actions télécharge les données de mlbb.io <b>toutes les 12 h</b> et republie l&apos;application. Rien à faire de ton côté.
            </p>
            <p className="text-xs text-muted">
              Site généré le {fmtDate(published?.generatedAt, true)} · dernière synchro réussie : {fmtDate(lastOk?.at, true)}
              {lastOk?.counts && ` (${lastOk.counts.heroes} héros, ${lastOk.counts.heroStats} stats)`}
            </p>
            {REPO_URL && (
              <a className="btn-primary w-full sm:w-auto" href={`${REPO_URL}/actions/workflows/publish.yml`} target="_blank" rel="noreferrer">
                <RefreshCw size={16} /> Lancer une synchro maintenant <ExternalLink size={14} />
              </a>
            )}
            <p className="text-[11px] text-muted">Sur GitHub : « Run workflow » → la nouvelle version est en ligne ≈ 5 minutes après.</p>
            {published?.syncLog.length ? (
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
                {published.syncLog.slice(0, 12).map((l, i) => (
                  <li key={i} className="flex gap-2 border-b border-line py-1">
                    <span className="whitespace-nowrap text-muted">{fmtDate(l.at, true)}</span>
                    <span className={clsx("w-16 shrink-0", l.status === "ok" ? "text-good" : l.status === "error" ? "text-bad" : "text-warn")}>{STATUS_FR[l.status] ?? l.status}</span>
                    <span className="text-ink-2">{l.message}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
        <Card title="Import manuel par collage" subtitle="MLBBHub et toute source sans connecteur">
          <PasteImport heroes={model.heroes.map((h) => ({ slug: h.slug, name: h.name }))} />
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Importer un fichier">
          <ImportPanel />
        </Card>
        <div className="space-y-4">
          <Card title="Sauvegarde de mes données">
            <BackupPanel />
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

      <Card title="Sources et connecteurs" className="mb-4">
        <ul className="grid gap-2 md:grid-cols-2">
          {CONNECTORS.map((c) => (
            <li key={c.name} className="glass-inset rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <p className="font-medium">{c.name}</p>
                <span className={clsx("chip", c.cls)}>{c.status}</span>
              </div>
              <p className="mt-1 text-sm text-ink-2">{c.text}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Statistiques disponibles par rang et période" className="mb-4" subtitle={`Signalées obsolètes au-delà de ${STALE_HOURS} h`}>
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
                  <td className="whitespace-nowrap">{RANK_FR[r]}</td>
                  {PERIODS.map((p) => {
                    const k = keys.find((x) => x.rank === r && x.period === p);
                    return (
                      <td key={p} className={clsx("whitespace-nowrap text-xs", !k && "text-muted", k && isStale(k.last) && "text-warn")}>
                        {k ? `${k.captures} capture(s) · ${fmtDate(k.last)}` : "Indisponible"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Registre des sources" className="mb-4" subtitle={`Évaluation du dossier de référence + vérification d'accès et des conditions (${fmtDate(VERIFIED_ON)})`}>
        <ul className="space-y-2">
          {model.sources.map((s) => (
            <li key={s.id} className="glass-inset rounded-2xl p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                    {s.name}
                  </a>
                ) : (
                  <span className="font-medium">{s.name}</span>
                )}
                <span className="chip">{SOURCE_KIND_FR[s.kind]}</span>
                <ReliabilityDots value={s.reliability} />
                <span className="ml-auto text-xs text-muted">{s.lastSyncAt ? `synchro ${fmtDate(s.lastSyncAt, true)}` : ""}</span>
              </div>
              {s.notes && <p className="mt-1 text-xs text-muted">{s.notes}</p>}
              <p className="mt-1 text-xs text-ink-2">
                <b>Accès :</b> {s.access}
              </p>
              <p className="text-xs text-ink-2">
                <b>Conditions :</b> {s.terms}
              </p>
            </li>
          ))}
        </ul>
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
    </>
  );
}
