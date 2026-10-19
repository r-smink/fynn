import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await ctx.params;
  const source = await db.knowledgeSource.findUnique({
    where: { id },
    include: {
      brand: true,
      chunks: { take: 10, select: { id: true, path: true, text: true } },
      assets: {
        select: { id: true, filename: true, contentType: true, size: true, caption: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!source) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  return Response.json({ source });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const data = await req.json();
  const source = await db.knowledgeSource.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.config !== undefined && { config: JSON.stringify(data.config) }),
      ...(data.brandId !== undefined && { brandId: data.brandId || null }),
    },
  });
  return Response.json({ source });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const assets = await db.knowledgeAsset.findMany({
    where: { sourceId: id },
    select: { storageKey: true },
  });
  await Promise.all(assets.map(({ storageKey }) => deleteFile(storageKey).catch(() => {})));
  await db.knowledgeSource.delete({ where: { id } });
  return Response.json({ ok: true });
}
