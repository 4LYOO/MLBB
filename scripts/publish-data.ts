/**
 * Génère public/data/published.json et public/data/history.json.
 * Exécuté par GitHub Actions avant chaque déploiement (toutes les 12 h et à chaque push).
 *
 *   npm run data:publish                         → synchro mlbb.io + fichiers versionnés de data/imports/
 *   npm run data:publish -- --from-file=pkg.json → utilise un paquet déjà téléchargé (tests locaux)
 *   PAGES_URL=https://<user>.github.io/<repo>    → récupère l'historique déjà publié
 */
import fs from "node:fs";
import path from "node:path";
import { fetchMlbbioPackage, ourSlug } from "../src/lib/sync/mlbbio";
import { validatePackage, type DataPackage } from "../src/lib/data/schema";
import { appendHistory, type HistoryFile, type PublishedFile, type SyncLogEntry } from "../src/lib/data/published";
import { parseEditorialHeroes } from "../src/data/reference/heroes";

const OUT = path.join(process.cwd(), "public", "data");
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const pages = process.env.PAGES_URL?.replace(/\/$/, "");
  const prev = pages ? await getJson<PublishedFile>(`${pages}/data/published.json`) : null;
  const prevHistory = pages ? await getJson<HistoryFile>(`${pages}/data/history.json`) : null;
  console.log(`Données précédentes : ${prev ? "trouvées" : "aucune"} · historique : ${prevHistory?.captures.length ?? 0} capture(s)`);

  const log: SyncLogEntry[] = [];
  const prevMlbbio = prev?.packages.find((p) => p.source.id === "mlbbio") ?? null;
  let mlbbio: DataPackage | null = null;
  let fresh = false;

  const fromFile = arg("from-file");
  try {
    let pkg: DataPackage;
    let errors: string[] = [];
    if (fromFile) pkg = JSON.parse(fs.readFileSync(fromFile, "utf8"));
    else {
      const known = new Map<string, string>(parseEditorialHeroes().map((h) => [ourSlug(h.name), h.slug]));
      for (const h of prevMlbbio?.heroes ?? []) known.set(ourSlug(h.name), h.slug);
      ({ pkg, errors } = await fetchMlbbioPackage(known, (d, t, l) => d % 20 === 0 && console.log(`  ${d}/${t} ${l}`)));
    }
    const v = validatePackage(pkg);
    const heroesWithStats = new Set((pkg.heroStats ?? []).map((s) => s.hero)).size;
    if (!v.ok) throw new Error(`paquet invalide : ${v.errors.slice(0, 3).join(" ; ")}`);
    if (heroesWithStats < 100) throw new Error(`seulement ${heroesWithStats} héros avec statistiques (seuil 100)`);
    mlbbio = v.data;
    fresh = true;
    log.push({
      at: new Date().toISOString(),
      connector: "mlbbio",
      status: errors.length ? "warning" : "ok",
      message: errors.length ? `${errors.length} page(s) en erreur : ${errors.slice(0, 3).join(" ; ")}` : "Synchronisation complète.",
      counts: { heroes: pkg.heroes?.length ?? 0, heroStats: pkg.heroStats?.length ?? 0, matchups: pkg.matchups?.length ?? 0, items: pkg.items?.length ?? 0 },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("✘ mlbb.io :", msg);
    mlbbio = prevMlbbio;
    log.push({ at: new Date().toISOString(), connector: "mlbbio", status: mlbbio ? "kept-previous" : "error", message: `${msg}${mlbbio ? " — données précédentes conservées" : ""}` });
  }

  // Paquets versionnés dans le dépôt (ex. stats e-sport, patch notes) : data/imports/*.json
  const extra: DataPackage[] = [];
  const dir = path.join(process.cwd(), "data", "imports");
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith(".json")) : []) {
    const v = validatePackage(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
    if (v.ok) extra.push(v.data);
    else log.push({ at: new Date().toISOString(), connector: `fichier:${f}`, status: "error", message: v.errors.slice(0, 3).join(" ; ") });
  }

  const published: PublishedFile = {
    format: "mlbb-companion/published-v1",
    generatedAt: new Date().toISOString(),
    packages: [...(mlbbio ? [mlbbio] : []), ...extra],
    syncLog: [...log, ...(prev?.syncLog ?? [])].slice(0, 40),
  };
  const history = mlbbio && fresh ? appendHistory(prevHistory, mlbbio) : (prevHistory ?? { format: "mlbb-companion/history-v1", captures: [] });
  fs.writeFileSync(path.join(OUT, "published.json"), JSON.stringify(published));
  fs.writeFileSync(path.join(OUT, "history.json"), JSON.stringify(history));
  console.log(`✔ published.json (${published.packages.length} paquet(s)) · history.json (${history.captures.length} capture(s))`);
  if (!mlbbio) process.exitCode = 0; // le site reste déployable sans données (« Donnée indisponible »)
})();
