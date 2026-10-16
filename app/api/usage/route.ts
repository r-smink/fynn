import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [events, totals, byModel] = await Promise.all([
    db.usageEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.usageEvent.aggregate({
      _sum: { promptTokens: true, completionTokens: true, cost: true },
      _count: true,
    }),
    db.usageEvent.groupBy({
      by: ["model"],
      _sum: { promptTokens: true, completionTokens: true, cost: true },
      _count: true,
      orderBy: { _sum: { cost: "desc" } },
    }),
  ]);

  return Response.json({ events, totals, byModel });
}
