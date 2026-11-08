import { z } from "zod";
import { body, ok } from "../_util";
import { connectorInfos, runConnector } from "@/lib/server/connectors";
import { jobState } from "@/lib/server/jobs";

export const dynamic = "force-dynamic";
export function GET(req: Request) {
  if (new URL(req.url).searchParams.has("status")) return ok(jobState());
  return ok(connectorInfos());
}
export async function POST(req: Request) {
  const b = await body(req, z.object({ connector: z.string() }));
  if ("error" in b) return b.error;
  return ok(await runConnector(b.data.connector));
}
