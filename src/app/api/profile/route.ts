import { z } from "zod";
import { body, ok } from "../_util";
import { getProfile, saveProfile } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
const s = z.string().max(80).nullish().transform((v) => (v ? v : null));
export function GET() {
  return ok(getProfile());
}
export async function PUT(req: Request) {
  const b = await body(
    req,
    z.object({ nickname: s, playerId: s, server: s, rank: s, stars: z.number().int().min(0).max(999).nullish().transform((v) => v ?? null), mainRole: s, secondRole: s, favoriteHeroes: z.array(z.string()).max(20).default([]) }),
  );
  if ("error" in b) return b.error;
  saveProfile(b.data);
  return ok(getProfile());
}
