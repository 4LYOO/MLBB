import { NextResponse } from "next/server";
import type { z } from "zod";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string | string[], status = 400) => NextResponse.json({ error: message }, { status });

export async function body<T>(req: Request, schema: z.ZodType<T>): Promise<{ data: T } | { error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail("Corps JSON invalide") };
  }
  const r = schema.safeParse(raw);
  if (!r.success) return { error: fail(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)) };
  return { data: r.data };
}
