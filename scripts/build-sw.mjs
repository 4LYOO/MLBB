// Génère out/sw.js (service worker) après « next build ».
// Il liste les fichiers du site pour les mettre en cache et faire fonctionner l'appli HORS LIGNE.
//
//  - CŒUR (précaché à l'installation, ≈ 3–4 Mo) : pages principales, code JS/CSS, données, icônes ;
//  - EXTRA (téléchargé ensuite en arrière-plan) : les fiches des héros et des guides.
//
// Lancé automatiquement par « npm run build ». Ne pas modifier out/sw.js à la main.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT = path.resolve("out");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ""; // ex. « /MLBB » sur GitHub Pages

if (!fs.existsSync(OUT)) {
  console.error("Dossier out/ introuvable : lance d'abord « next build ».");
  process.exit(1);
}

/** Liste récursive des fichiers de out/ (chemins relatifs avec « / »). */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [path.relative(OUT, p).split(path.sep).join("/")];
  });
}

const files = walk(OUT).filter((f) => f !== "sw.js" && !f.endsWith(".map"));
// Les fichiers « index.html » sont servis sous l'adresse du dossier (ex. /MLBB/draft/).
const toUrl = (f) => `${BASE}/${f.replace(/(^|\/)index\.html$/, "$1")}`;
const isExtra = (f) => /^(heros|guides)\/[^/]+\//.test(f);

const core = files.filter((f) => !isExtra(f)).map(toUrl);
const extra = files.filter(isExtra).map(toUrl);

// Version = empreinte du contenu : change à chaque nouveau déploiement → l'ancien cache est remplacé.
const hash = crypto.createHash("sha256");
for (const f of files.sort()) hash.update(f).update(fs.readFileSync(path.join(OUT, f)));
const version = hash.digest("hex").slice(0, 12);

const template = fs.readFileSync(path.resolve("scripts/sw-template.js"), "utf8");
const sw = template
  .replace("__VERSION__", version)
  .replace("__BASE__", JSON.stringify(BASE))
  .replace("__CORE__", JSON.stringify(core))
  .replace("__EXTRA__", JSON.stringify(extra));
fs.writeFileSync(path.join(OUT, "sw.js"), sw);

const size = (list) => list.reduce((s, u) => s + fs.statSync(path.join(OUT, u.slice(BASE.length + 1).replace(/(^|\/)$/, "$1index.html") || "index.html")).size, 0);
console.log(`✔ sw.js version ${version} : cœur ${core.length} fichiers (${(size(core) / 1e6).toFixed(1)} Mo), extra ${extra.length} fichiers (${(size(extra) / 1e6).toFixed(1)} Mo)`);
