import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { userBrandScope, visibleOwnedWhere } from "@/lib/scope";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const styles = await db.imageStyle.findMany({
    where: await visibleOwnedWhere(user),
    orderBy: { name: "asc" },
  });
  return Response.json({ styles });
}

/** POST { name, emoji?, prompt, brandId? } — eigen stijl-preset. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  if (!data.name?.trim() || !data.prompt?.trim()) {
    return Response.json({ error: "Naam en stijlomschrijving zijn vereist" }, { status: 400 });
  }
  const scope = await userBrandScope(user);
  const style = await db.imageStyle.create({
    data: {
      userId: user.id,
      // members aan een brand: automatisch aan die brand; admins mogen kiezen
      brandId: scope ?? (isAdminRole(user.role) && data.brandId ? data.brandId : null),
      name: data.name.trim().slice(0, 40),
      emoji: (data.emoji?.trim() || "🎨").slice(0, 8),
      prompt: data.prompt.trim().slice(0, 1000),
    },
  });
  return Response.json({ style }, { status: 201 });
}
