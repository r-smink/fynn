import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isSuperadmin } from "@/lib/roles";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const where = isSuperadmin(user.role) ? {} : { userId: user.id };
  const [events, totals, byModel] = await Promise.all([
    db.usageEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.usageEvent.aggregate({
      where,
      _sum: { promptTokens: true, completionTokens: true, cost: true },
      _count: true,
    }),
    db.usageEvent.groupBy({
      by: ["model"],
      where,
      _sum: { promptTokens: true, completionTokens: true, cost: true },
      _count: true,
      orderBy: { _sum: { cost: "desc" } },
    }),
  ]);

  return Response.json({ events, totals, byModel });
}
