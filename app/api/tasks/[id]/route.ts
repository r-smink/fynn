import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { TASK_ACTIONS } from "@/lib/tasks";
import { isAdminRole } from "@/lib/roles";
import { ownsOrShares } from "@/lib/scope";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const task = await db.task.findFirst({ where: { id } });
  if (!task || !(await ownsOrShares(task, user))) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const data = await req.json();
  const brandId =
    isAdminRole(user.role) && data.brandId !== undefined ? data.brandId || null : undefined;
  const updated = await db.task.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.agentId !== undefined && { agentId: data.agentId || null }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.prompt !== undefined && { prompt: data.prompt }),
      ...(data.schedule !== undefined && { schedule: data.schedule }),
      ...(data.action !== undefined && TASK_ACTIONS.includes(data.action) && { action: data.action }),
      ...(data.actionConfig !== undefined && {
        actionConfig: typeof data.actionConfig === "string"
          ? data.actionConfig
          : JSON.stringify(data.actionConfig),
      }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(brandId !== undefined && { brandId }),
    },
  });
  return Response.json({ task: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const task = await db.task.findFirst({ where: { id } });
  if (!task || !(await ownsOrShares(task, user))) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }
  await db.task.delete({ where: { id } });
  return Response.json({ ok: true });
}
