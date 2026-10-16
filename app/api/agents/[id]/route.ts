import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const data = await req.json();

  const agent = await db.agent.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
      ...(data.brandId !== undefined && { brandId: data.brandId || null }),
      ...(data.defaultModel !== undefined && { defaultModel: data.defaultModel }),
      ...(data.temperature !== undefined && { temperature: data.temperature }),
      ...(data.enabledTools !== undefined && { enabledTools: JSON.stringify(data.enabledTools) }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.sourceIds !== undefined && {
        sources: { set: data.sourceIds.map((sid: string) => ({ id: sid })) },
      }),
    },
    include: { brand: true },
  });
  return Response.json({ agent });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await db.agent.delete({ where: { id } });
  return Response.json({ ok: true });
}
