import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const data = await req.json();
  const template = await db.promptTemplate.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.prompt !== undefined && { prompt: data.prompt }),
      ...(data.brandId !== undefined && { brandId: data.brandId || null }),
    },
  });
  return Response.json({ template });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await db.promptTemplate.delete({ where: { id } });
  return Response.json({ ok: true });
}
