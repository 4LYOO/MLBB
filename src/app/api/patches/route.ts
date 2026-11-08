import { z } from "zod";
import { body, ok } from "../_util";
import { deletePatch, getPatches, savePatch } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
export function GET() {
  return ok(getPatches());
}
/** Saisie manuelle d'une note de patch (source « manual »). */
export async function POST(req: Request) {
  const b = await body(
    req,
    z.object({
      version: z.string().min(1).max(30),
      date: z.string().nullish(),
      server: z.enum(["official", "advanced"]).nullish(),
      title: z.string().max(120).nullish(),
      url: z.string().url().nullish().or(z.literal("")),
      changes: z.array(z.object({ targetType: z.string(), target: z.string().min(1), change: z.string(), text: z.string().min(1) })).max(300),
    }),
  );
  if ("error" in b) return b.error;
  savePatch({ ...b.data, url: b.data.url || null, sourceId: "manual" });
  return ok({ ok: true }, 201);
}
export function DELETE(req: Request) {
  deletePatch(new URL(req.url).searchParams.get("version") ?? "");
  return ok({ ok: true });
}
