import fs from "node:fs";
import { dbPath, openDb } from "../src/lib/server/db";

const file = dbPath();
if (process.argv.includes("--reset") && fs.existsSync(file)) {
  for (const f of [file, `${file}-wal`, `${file}-shm`]) if (fs.existsSync(f)) fs.rmSync(f);
  console.log(`Base supprimée : ${file}`);
}
const db = openDb(file);
const n = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
console.log(`Base prête : ${file}`);
console.log(`  héros : ${n("heroes")} · objets : ${n("items")} · sources : ${n("sources")} · stats : ${n("hero_stats")}`);
