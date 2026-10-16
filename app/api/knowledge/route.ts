import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const sources = await db.knowledgeSource.findMany({
    orderBy: { createdAt: "asc" },
    include: { brand: { select: { id: true, name: true } } },
  });
  return Response.json({ sources });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();

  const source = await db.knowledgeSource.create({
    data: {
      name: data.name,
      type: data.type, // file | url | sitemap | git | folder
      config: JSON.stringify(data.config ?? {}),
      brandId: data.brandId || null,
    },
  });
  return Response.json({ source }, { status: 201 });
}
