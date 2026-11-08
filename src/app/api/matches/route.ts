import { z } from "zod";
import { body, fail, ok } from "../_util";
import { addMatch, deleteMatch, getMatches, getHero } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
const MatchSchema = z.object({
  playedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  hero: z.string().min(1),
  role: z.string().nullish(),
  result: z.enum(["win", "loss"]),
  kills: z.number().int().min(0).max(99),
  deaths: z.number().int().min(0).max(99),
  assists: z.number().int().min(0).max(99),
  durationMin: z.number().min(0).max(90).nullish(),
  mvp: z.boolean().default(false),
  rank: z.string().nullish(),
  notes: z.string().max(1000).nullish(),
  entry: z.enum(["manual", "ocr"]).default("manual"),
});
export function GET() {
  return ok(getMatches());
}
export async function POST(req: Request) {
  const b = await body(req, MatchSchema);
  if ("error" in b) return b.error;
  if (!getHero(b.data.hero)) return fail("Héros inconnu");
  const id = addMatch({ ...b.data, role: b.data.role ?? null, durationMin: b.data.durationMin ?? null, rank: b.data.rank ?? null, notes: b.data.notes ?? null });
  return ok({ id }, 201);
}
export function DELETE(req: Request) {
  deleteMatch(Number(new URL(req.url).searchParams.get("id")));
  return ok({ ok: true });
}
