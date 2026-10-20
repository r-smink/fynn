import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { runTask, taskIsDue } from "@/lib/tasks";

export const maxDuration = 300;

/**
 * Wordt door een externe scheduler (GitHub Actions / Vercel Cron) aangeroepen.
 * Beveiligd via `Authorization: Bearer <CRON_SECRET>` of ?secret=<CRON_SECRET>.
 * Voert maximaal 10 due tasks per aanroep uit (Hobby maxDuration).
 */
export async function GET(req: Request) {
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(req.url).searchParams.get("secret") ??
    "";
  if (!env.cronSecret || provided !== env.cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const tasks = await db.task.findMany({
    where: { enabled: true, NOT: { schedule: "" } },
    take: 100,
  });
  const due = tasks.filter((t) => taskIsDue(t, now)).slice(0, 10);

  const results = [];
  for (const t of due) {
    const run = await runTask(t.id);
    results.push({ taskId: t.id, name: t.name, status: run.status, resultUrl: run.resultUrl });
  }
  return Response.json({ ok: true, ran: results.length, results });
}
