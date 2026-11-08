import fs from "node:fs";
import path from "node:path";
import { importPackage, csvToPackage } from "../src/lib/server/importer";
import { runConnector } from "../src/lib/server/connectors";

/**
 * npm run data:import                       → importe data/imports/*.json
 * npm run data:import -- fichier.json       → importe un fichier
 * npm run data:import -- stats.csv --source-id=x --source-name="X" --captured-at=2026-11-08T10:00:00Z [--patch=2.2.16a] [--url=https://…]
 * npm run data:import -- --connector=<id>   → lance un connecteur
 */
const args = process.argv.slice(2);
const opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const files = args.filter((a) => !a.startsWith("--"));

function print(label: string, r: { ok: boolean; counts: Record<string, number>; warnings: string[]; errors: string[] }) {
  console.log(`${r.ok ? "✔" : "✘"} ${label}`, JSON.stringify(r.counts));
  r.warnings.slice(0, 15).forEach((w) => console.log("   ⚠", w));
  r.errors.forEach((e) => console.log("   ✘", e));
}

(async () => {
  const connector = opt("connector");
  if (connector) {
    for (const r of await runConnector(connector)) print(connector, r);
    return;
  }
  if (!files.length) {
    const res = await runConnector("file-folder");
    if (!res.length) console.log("Aucun fichier dans data/imports/. Voir docs/DATA-FORMAT.md.");
    res.forEach((r, i) => print(`fichier ${i + 1}`, r));
    return;
  }
  for (const f of files) {
    const content = fs.readFileSync(f, "utf8");
    let pkg: unknown;
    if (path.extname(f).toLowerCase() === ".csv") {
      const sourceId = opt("source-id");
      const capturedAt = opt("captured-at");
      if (!sourceId || !capturedAt) {
        console.error("CSV : --source-id et --captured-at sont obligatoires (traçabilité).");
        process.exitCode = 1;
        continue;
      }
      pkg = csvToPackage(content, { sourceId, sourceName: opt("source-name") ?? sourceId, url: opt("url"), capturedAt, patch: opt("patch") });
    } else pkg = JSON.parse(content);
    print(f, importPackage(pkg, `cli:${path.basename(f)}`));
  }
})();
