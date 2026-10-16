import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { agents: true, sources: true, templates: true } } },
  });
  return Response.json({ brands });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const brand = await db.brand.create({
    data: {
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: data.description ?? "",
      logoUrl: data.logoUrl ?? "",
      websiteUrl: data.websiteUrl ?? "",
      toneOfVoice: data.toneOfVoice ?? "",
      theme: JSON.stringify(data.theme ?? {}),
      isDefault: data.isDefault ?? false,
    },
  });
  return Response.json({ brand }, { status: 201 });
}
