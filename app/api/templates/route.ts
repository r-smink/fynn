import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { userBrandScope } from "@/lib/scope";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const scope = await userBrandScope(user);
  const templates = await db.promptTemplate.findMany({
    where: scope ? { brandId: scope } : {},
    orderBy: [{ category: "asc" }, { title: "asc" }],
    include: { brand: { select: { id: true, name: true } } },
  });
  return Response.json({ templates });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const template = await db.promptTemplate.create({
    data: {
      title: data.title,
      category: data.category ?? "custom",
      prompt: data.prompt,
      brandId: data.brandId || null,
    },
  });
  return Response.json({ template }, { status: 201 });
}
