import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { wpConfigured, wpPublishPost } from "@/lib/wordpress";
import { ownsOrShares } from "@/lib/scope";

type Ctx = { params: Promise<{ id: string }> };

/** Publiceert de WP-draft die deze task bij de laatste run heeft aangemaakt. */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const task = await db.task.findFirst({ where: { id } });
  if (!task || !(await ownsOrShares(task, user))) {
    return Response.json({ error: "Niet gevonden" }, { status: 404 });
  }

  if (!wpConfigured()) {
    return Response.json({ error: "WordPress niet geconfigureerd" }, { status: 503 });
  }
  const cfg = JSON.parse(task.actionConfig || "{}") as { wpPostId?: number };
  if (!cfg.wpPostId) {
    return Response.json({ error: "Nog geen post aangemaakt door deze task" }, { status: 400 });
  }
  try {
    const post = await wpPublishPost(cfg.wpPostId);
    return Response.json({ ok: true, link: post.link });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
