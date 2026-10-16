import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const data = await req.json();

  const brand = await db.brand.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl }),
      ...(data.toneOfVoice !== undefined && { toneOfVoice: data.toneOfVoice }),
      ...(data.theme !== undefined && { theme: JSON.stringify(data.theme) }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  });
  return Response.json({ brand });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await db.brand.delete({ where: { id } });
  return Response.json({ ok: true });
}
