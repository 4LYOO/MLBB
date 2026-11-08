import { z } from "zod";
import { body, ok } from "../_util";
import { getFavorites, toggleFavorite } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
export function GET() {
  return ok(getFavorites());
}
export async function POST(req: Request) {
  const b = await body(req, z.object({ kind: z.enum(["hero", "build", "guide"]), ref: z.string().min(1) }));
  if ("error" in b) return b.error;
  return ok({ favorite: toggleFavorite(b.data.kind, b.data.ref) });
}
