import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { TASK_ACTIONS } from "@/lib/tasks";
import { isAdminRole } from "@/lib/roles";
import { userBrandScope, visibleOwnedWhere } from "@/lib/scope";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await db.task.findMany({
    where: await visibleOwnedWhere(user),
    orderBy: { name: "asc" },
    include: {
      agent: { select: { id: true, name: true } },
      runs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  return Response.json({ tasks });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  if (!data.name?.trim() || !data.prompt?.trim()) {
    return Response.json({ error: "Naam en prompt zijn vereist" }, { status: 400 });
  }
  const scope = await userBrandScope(user);
  const task = await db.task.create({
    data: {
      userId: user.id,
      brandId: scope ?? (isAdminRole(user.role) && data.brandId ? data.brandId : null),
      name: data.name.trim(),
      agentId: data.agentId || null,
      model: data.model ?? "",
      prompt: data.prompt,
      schedule: data.schedule ?? "",
      action: TASK_ACTIONS.includes(data.action) ? data.action : "chat_run",
      actionConfig: typeof data.actionConfig === "string"
        ? data.actionConfig
        : JSON.stringify(data.actionConfig ?? {}),
      enabled: data.enabled !== false,
    },
  });
  return Response.json({ task }, { status: 201 });
}
