import { z } from "zod";
import { body, ok } from "../_util";
import { deleteUserBuild, getBuilds, saveUserBuild } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
export function GET(req: Request) {
  return ok(getBuilds(new URL(req.url).searchParams.get("hero") ?? undefined));
}
export async function POST(req: Request) {
  const b = await body(req, z.object({ hero: z.string(), title: z.string().min(1).max(80), type: z.string(), items: z.array(z.string()).min(1).max(7), emblem: z.string().nullish(), talents: z.array(z.string()).optional(), spell: z.string().nullish(), notes: z.string().max(500).nullish() }));
  if ("error" in b) return b.error;
  return ok({ id: saveUserBuild(b.data) }, 201);
}
export function DELETE(req: Request) {
  deleteUserBuild(Number(new URL(req.url).searchParams.get("id")));
  return ok({ ok: true });
}
