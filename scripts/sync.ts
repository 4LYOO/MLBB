import { getDb } from "../src/lib/server/db";
import { importPackage } from "../src/lib/server/importer";
import { fetchMlbbioPackage, ourSlug } from "../src/lib/server/mlbbio";

/** npm run data:sync [-- --limit=5]   → synchronise mlbb.io au premier plan. */
const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || undefined;
(async () => {
  const db = getDb();
  const known = new Map((db.prepare("SELECT slug, name FROM heroes").all() as { slug: string; name: string }[]).map((h) => [ourSlug(h.name), h.slug]));
  const { pkg, errors } = await fetchMlbbioPackage(known, (d, t, l) => process.stdout.write(`\r${d}/${t} ${l.padEnd(24)}`), { limit });
  console.log();
  const save = process.argv.find((a) => a.startsWith("--save="))?.split("=")[1];
  if (save) (await import("node:fs")).writeFileSync(save, JSON.stringify(pkg));
  errors.forEach((e) => console.log("  ✘", e));
  const r = importPackage(pkg, "mlbbio-cli");
  console.log(r.ok ? "✔ Import" : "✘ Import", JSON.stringify(r.counts));
  r.warnings.slice(0, 20).forEach((w) => console.log("  ⚠", w));
  r.errors.forEach((e) => console.log("  ✘", e));
})();
