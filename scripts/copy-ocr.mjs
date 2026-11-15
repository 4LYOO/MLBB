// Copie le moteur de reconnaissance de texte (Tesseract) dans public/ocr/ avant la construction du site.
// L'OCR tourne ENTIÈREMENT sur l'iPhone : aucune image n'est envoyée ailleurs, aucun service tiers.
//   - worker.min.js            : le « travailleur » qui fait l'analyse en arrière-plan
//   - tesseract-core-*lstm*    : le moteur (WebAssembly), plusieurs variantes selon le téléphone
//   - eng / fra .traineddata   : les modèles de langue (anglais + français), version légère « best_int »
// Lancé automatiquement par « npm run build » (fichiers non versionnés dans Git).
import fs from "node:fs";
import path from "node:path";

const out = path.resolve("public/ocr");
fs.mkdirSync(out, { recursive: true });
const copy = (from, name = path.basename(from)) => fs.copyFileSync(path.resolve(from), path.join(out, name));

copy("node_modules/tesseract.js/dist/worker.min.js");
const core = "node_modules/tesseract.js-core";
for (const f of fs.readdirSync(core).filter((f) => /^tesseract-core.*lstm\.wasm(\.js)?$/.test(f) || /^tesseract-core.*lstm\.js$/.test(f))) copy(path.join(core, f));
for (const lang of ["eng", "fra"]) copy(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`);

const total = fs.readdirSync(out).reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`✔ OCR copié dans public/ocr (${fs.readdirSync(out).length} fichiers, ${(total / 1e6).toFixed(1)} Mo)`);
