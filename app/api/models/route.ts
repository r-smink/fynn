import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { syncModelCatalog } from "@/lib/openrouter";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const models = await db.modelEntry.findMany({ orderBy: [{ provider: "asc" }, { name: "asc" }] });
  return Response.json({ models });
}

/** POST = refresh catalog from OpenRouter (admin). */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const count = await syncModelCatalog();
    return Response.json({ ok: true, count });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
