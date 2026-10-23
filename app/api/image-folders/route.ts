import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { userBrandScope, visibleOwnedWhere } from "@/lib/scope";
import { findVisibleFolder } from "@/lib/image-library";

/** Alle zichtbare mappen (plat), bijv. voor "verplaats naar map". */
export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const folders = await db.imageFolder.findMany({
    where: await visibleOwnedWhere(user),
    select: { id: true, name: true, parentId: true, brandId: true },
    orderBy: { name: "asc" },
  });
  return Response.json({ folders });
}

/** POST { name, parentId?, brandId? } — submappen erven de brand van hun bovenliggende map. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = (await req.json()) as { name?: string; parentId?: string | null; brandId?: string | null };
  const name = data.name?.trim().slice(0, 60);
  if (!name) return Response.json({ error: "Naam is vereist" }, { status: 400 });

  const parent = data.parentId ? await findVisibleFolder(user, data.parentId) : null;
  if (data.parentId && !parent) return Response.json({ error: "Bovenliggende map niet gevonden" }, { status: 404 });

  const scope = await userBrandScope(user);
  const folder = await db.imageFolder.create({
    data: {
      userId: user.id,
      parentId: parent?.id ?? null,
      // members aan een brand: automatisch aan die brand; admins mogen kiezen
      brandId: parent ? parent.brandId : scope ?? (isAdminRole(user.role) && data.brandId ? data.brandId : null),
      name,
    },
  });
  return Response.json({ folder }, { status: 201 });
}
