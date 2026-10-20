import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { EFFORT_LEVELS } from "@/lib/fusion";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const fusion = await db.fusionTemplate.findFirst({ where: { id, userId: user.id } });
  if (!fusion) return Response.json({ error: "Niet gevonden" }, { status: 404 });

  const data = await req.json();
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
    },
  });
  return Response.json({ fusion: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await db.fusionTemplate.deleteMany({ where: { id, userId: user.id } });
  return Response.json({ ok: true });
}
