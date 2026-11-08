import { getDb } from "../src/lib/server/db";
import { connectorInfos } from "../src/lib/server/connectors";

const db = getDb();
console.log("Connecteurs :");
for (const c of connectorInfos()) console.log(`  [${c.status}] ${c.id} – ${c.explanation}`);
console.log("\nStatistiques disponibles :");
const rows = db.prepare("SELECT rank, period, source_id, COUNT(*) n, MAX(captured_at) last FROM hero_stats GROUP BY rank, period, source_id").all() as any[];
if (!rows.length) console.log("  aucune (Donnée indisponible)");
rows.forEach((r) => console.log(`  ${r.rank}/${r.period} · ${r.source_id} · ${r.n} lignes · ${r.last}`));
console.log("\nDernières synchronisations :");
(db.prepare("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 10").all() as any[]).forEach((r) => console.log(`  ${r.started_at} ${r.connector} ${r.status} ${r.records} ${r.message ?? ""}`));
