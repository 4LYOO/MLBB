import { z } from "zod";
import { body, ok } from "../_util";
import { deleteDraft, getDrafts, saveDraft } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
export function GET() {
  return ok(getDrafts());
}
export async function POST(req: Request) {
  const b = await body(req, z.object({ id: z.number().int().optional(), name: z.string().min(1).max(80), mode: z.string(), state: z.unknown(), summary: z.unknown() }));
  if ("error" in b) return b.error;
  return ok({ id: saveDraft(b.data) }, 201);
}
export function DELETE(req: Request) {
  deleteDraft(Number(new URL(req.url).searchParams.get("id")));
  return ok({ ok: true });
}
