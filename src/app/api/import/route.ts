import { fail, ok } from "../_util";
import { csvToPackage, importPackage } from "@/lib/server/importer";

export const dynamic = "force-dynamic";

/** Import d'un paquet JSON (application/json) ou d'un CSV (text/csv + paramètres de traçabilité). */
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  const text = await req.text();
  if (text.length > 20_000_000) return fail("Fichier trop volumineux (20 Mo max)", 413);
  let pkg: unknown;
  if (ct.includes("text/csv")) {
    const u = new URL(req.url).searchParams;
    const sourceId = u.get("sourceId");
    const capturedAt = u.get("capturedAt");
    if (!sourceId || !capturedAt) return fail("CSV : sourceId et capturedAt sont obligatoires (traçabilité).");
    pkg = csvToPackage(text, { sourceId, sourceName: u.get("sourceName") || sourceId, url: u.get("url"), capturedAt, patch: u.get("patch") });
  } else {
    try {
      pkg = JSON.parse(text);
    } catch {
      return fail("JSON invalide");
    }
  }
  const r = importPackage(pkg, "upload");
  return ok(r, r.ok ? 200 : 422);
}
