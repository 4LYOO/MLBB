import { z } from "zod";
import { body, ok } from "../_util";
import { addRecent, getRecent } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
export function GET() {
  return ok(getRecent());
}
export async function POST(req: Request) {
  const b = await body(req, z.object({ kind: z.string(), ref: z.string(), label: z.string() }));
  if ("error" in b) return b.error;
  addRecent(b.data.kind, b.data.ref, b.data.label);
  return ok({ ok: true });
}
