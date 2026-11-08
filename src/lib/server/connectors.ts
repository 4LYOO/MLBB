import fs from "node:fs";
import path from "node:path";
import { getDb, now } from "./db";
import { importPackage, type ImportResult } from "./importer";

/**
 * Registre des connecteurs. Un connecteur produit des paquets `mlbb-companion/v1`
 * que l'importeur valide, trace et enregistre.
 *
 * État au 2026-11-08 :
 *  - file-folder : opérationnel (data/imports/*.json)
 *  - moonton     : préparé, en attente d'un accès officiel (aucune API publique documentée)
 *  - liquipedia  : préparé (API MediaWiki CC BY-SA), parsing des pages de stats à implémenter
 *  - mlbbio      : désactivé — décision d'utilisation en attente (pas de CGU trouvée)
 *  - mlbbhub     : interdit — CGU §4 (« automated scraping … strictly prohibited »)
 */
export type ConnectorStatus = "ready" | "needs-config" | "not-implemented" | "pending-decision" | "forbidden";

export interface ConnectorInfo {
  id: string;
  name: string;
  sourceId: string;
  status: ConnectorStatus;
  provides: string[];
  requirements: string[];
  explanation: string;
}

export interface Connector extends ConnectorInfo {
  run(): Promise<ImportResult[]>;
}

const IMPORT_DIR = () => path.join(process.cwd(), "data", "imports");

function logRun(connector: string, sourceId: string, status: string, message: string) {
  getDb()
    .prepare("INSERT INTO sync_runs (connector, source_id, started_at, finished_at, status, records, message) VALUES (?, ?, ?, ?, ?, 0, ?)")
    .run(connector, sourceId, now(), now(), status, message);
}

const unavailable = (info: ConnectorInfo): Connector => ({
  ...info,
  async run() {
    logRun(info.id, info.sourceId, "skipped", info.explanation);
    return [{ ok: false, sourceId: info.sourceId, counts: {}, warnings: [], errors: [info.explanation] }];
  },
});

export const CONNECTORS: Connector[] = [
  {
    id: "file-folder",
    name: "Dossier d'import local",
    sourceId: "file-import",
    status: "ready",
    provides: ["Toutes les données du format mlbb-companion/v1"],
    requirements: ["Déposer des fichiers .json dans data/imports/"],
    explanation: "Importe chaque fichier JSON du dossier data/imports/. La source déclarée dans chaque fichier est conservée.",
    async run() {
      const dir = IMPORT_DIR();
      if (!fs.existsSync(dir)) return [];
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      if (!files.length) {
        logRun("file-folder", "file-import", "skipped", "Aucun fichier .json dans data/imports/.");
        return [];
      }
      return files.map((f) => {
        try {
          return importPackage(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), `file-folder:${f}`);
        } catch (e) {
          const msg = `${f} : JSON invalide (${e instanceof Error ? e.message : e})`;
          logRun("file-folder", "file-import", "error", msg);
          return { ok: false, sourceId: null, counts: {}, warnings: [], errors: [msg] };
        }
      });
    },
  },
  (() => {
    const configured = !!process.env.MOONTON_API_BASE;
    const info: ConnectorInfo = {
      id: "moonton",
      name: "Moonton (officiel)",
      sourceId: "moonton",
      status: configured ? "not-implemented" : "needs-config",
      provides: ["Statistiques WR/PR/BR par rang", "Liste officielle des héros"],
      requirements: ["Accès officiel fourni par Moonton", "MOONTON_API_BASE", "MOONTON_API_KEY (si exigée)"],
      explanation: configured
        ? "Variables présentes, mais le format de l'API officielle n'est pas documenté publiquement : le mappage vers mlbb-companion/v1 reste à écrire."
        : "Aucune API publique documentée par Moonton. Renseigne MOONTON_API_BASE si tu obtiens un accès officiel.",
    };
    return unavailable(info);
  })(),
  unavailable({
    id: "liquipedia",
    name: "Liquipedia (e-sport)",
    sourceId: "liquipedia",
    status: process.env.LIQUIPEDIA_USER_AGENT ? "not-implemented" : "needs-config",
    provides: ["Picks, bans, win rate et présence par tournoi (proStats)"],
    requirements: ["LIQUIPEDIA_USER_AGENT identifiable (avec contact)", "Respect du débit de l'API (1 requête / 2 s)", "Attribution CC BY-SA"],
    explanation:
      "Licence compatible (CC BY-SA) et API MediaWiki disponible. L'extraction des tableaux de statistiques de tournoi reste à implémenter ; en attendant, importe un fichier proStats.",
  }),
  unavailable({
    id: "mlbbio",
    name: "mlbb.io",
    sourceId: "mlbbio",
    status: "pending-decision",
    provides: ["Stats par rang × période", "Compétences", "Counters/synergies", "Consensus emblème/sort"],
    requirements: ["Ta décision explicite d'utiliser cette source", "Idéalement l'accord de l'éditeur du site"],
    explanation:
      "Désactivé : le site n'a pas d'API documentée et aucune condition d'utilisation n'a été trouvée. Décision à prendre (voir README, section « Décision en attente »).",
  }),
  unavailable({
    id: "mlbbhub",
    name: "MLBBHub",
    sourceId: "mlbbhub",
    status: "forbidden",
    provides: ["Stats ranked, tier list, counters, matchups"],
    requirements: ["Autorisation écrite de MLBBHub"],
    explanation: "Les CGU de MLBBHub interdisent l'extraction automatisée sans autorisation écrite. Consultation manuelle via les liens uniquement.",
  }),
];

export function connectorInfos(): ConnectorInfo[] {
  return CONNECTORS.map(({ run: _run, ...info }) => info);
}

export async function runConnector(id: string) {
  const c = CONNECTORS.find((x) => x.id === id);
  if (!c) throw new Error(`Connecteur inconnu : ${id}`);
  return c.run();
}
