// Reformate les fichiers data/*.json pour qu'ils restent faciles à éditer à la main :
// les listes courtes et les petits objets (ex. "profil") tiennent sur une seule ligne.
//   node scripts/format-json.mjs            → reformate tous les fichiers de data/
import fs from "node:fs";
import path from "node:path";

function fmt(value, indent = "") {
  const inner = indent + "  ";
  const oneLine = JSON.stringify(value);
  // Petits tableaux/objets sans sous-objet : sur une ligne si ≤ 140 caractères.
  const simple = (v) => v === null || typeof v !== "object" || (Array.isArray(v) ? v.every((x) => x === null || typeof x !== "object") : Object.values(v).every((x) => x === null || typeof x !== "object"));
  if (value === null || typeof value !== "object") return oneLine;
  if (simple(value) && oneLine.length <= 140) return oneLine.replace(/,"/g, ', "').replace(/":/g, '": ').replace(/,(?=[^ ])/g, ", ");
  if (Array.isArray(value)) return `[\n${value.map((v) => inner + fmt(v, inner)).join(",\n")}\n${indent}]`;
  return `{\n${Object.entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${fmt(v, inner)}`).join(",\n")}\n${indent}}`;
}

const dir = path.join(process.cwd(), "data");
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const p = path.join(dir, f);
  fs.writeFileSync(p, fmt(JSON.parse(fs.readFileSync(p, "utf8"))) + "\n");
  console.log("formaté :", f);
}
