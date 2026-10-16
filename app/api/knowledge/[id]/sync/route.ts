import { requireAdmin } from "@/lib/auth";
import { syncSource } from "@/lib/rag/ingest";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 600;

export async function POST(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const result = await syncSource(id);
  return Response.json(result, { status: result.error ? 502 : 200 });
}
