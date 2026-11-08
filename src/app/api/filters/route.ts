import { z } from "zod";
import { body, ok } from "../_util";
import { deleteFilter, getSavedFilters, saveFilter } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
export function GET(req: Request) {
  return ok(getSavedFilters(new URL(req.url).searchParams.get("page") ?? undefined));
}
export async function POST(req: Request) {
  const b = await body(req, z.object({ page: z.string().min(1), name: z.string().min(1).max(60), params: z.record(z.string(), z.string()) }));
  if ("error" in b) return b.error;
  saveFilter(b.data.page, b.data.name, b.data.params);
  return ok({ ok: true }, 201);
}
export function DELETE(req: Request) {
  deleteFilter(Number(new URL(req.url).searchParams.get("id")));
  return ok({ ok: true });
}
