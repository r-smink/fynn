import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { EFFORT_LEVELS } from "@/lib/fusion";
import { isAdminRole } from "@/lib/roles";
import { ownsOrShares } from "@/lib/scope";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const fusion = await db.fusionTemplate.findFirst({ where: { id } });
  if (!fusion || !(await ownsOrShares(fusion, user))) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const data = await req.json();
  // brandId alleen door admin wijzigbaar; members houden hun eigen brand
  const brandId =
    isAdminRole(user.role) && data.brandId !== undefined ? data.brandId || null : undefined;
  const updated = await db.fusionTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.leadModel !== undefined && { leadModel: data.leadModel }),
      ...(data.leadEffort !== undefined && {
        leadEffort: EFFORT_LEVELS.includes(data.leadEffort) ? data.leadEffort : "",
      }),
      ...(data.sidekick1 !== undefined && { sidekick1: data.sidekick1 }),
      ...(data.sidekick2 !== undefined && { sidekick2: data.sidekick2 }),
      ...(brandId !== undefined && { brandId }),
    },
  });
  return Response.json({ fusion: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const fusion = await db.fusionTemplate.findFirst({ where: { id } });
  if (!fusion || !(await ownsOrShares(fusion, user))) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }
  await db.fusionTemplate.delete({ where: { id } });
  return Response.json({ ok: true });
}
