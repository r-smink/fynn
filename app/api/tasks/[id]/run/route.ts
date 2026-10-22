import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { runTask } from "@/lib/tasks";
import { ownsOrShares } from "@/lib/scope";

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/** Handmatig een task uitvoeren. */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const task = await db.task.findFirst({ where: { id } });
  if (!task || !(await ownsOrShares(task, user))) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const run = await runTask(task.id);
  return Response.json({ run });
}
