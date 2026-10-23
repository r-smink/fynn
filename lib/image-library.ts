import { db } from "@/lib/db";
import { visibleOwnedWhere } from "@/lib/scope";

type SessionUser = { id: string; role: string };

/**
 * Mappen zijn zichtbaar volgens dezelfde regels als fusions/tasks: admins alles,
 * brand-members hun eigen mappen + die van hun brand, overigen alleen hun eigen.
 */
export async function findVisibleFolder(user: SessionUser, id: string) {
  return db.imageFolder.findFirst({ where: { id, ...(await visibleOwnedWhere(user)) } });
}

/** Mag de gebruiker deze afbeelding zien/verplaatsen/verwijderen? Eigen beeld, of in een zichtbare map. */
export async function findVisibleImage(user: SessionUser, id: string) {
  const image = await db.imageGeneration.findUnique({ where: { id } });
  if (!image) return null;
  if (image.userId === user.id) return image;
  if (image.folderId && (await findVisibleFolder(user, image.folderId))) return image;
  return null;
}

/** Kruimelpad van root naar deze map. */
async function folderPath(folderId: string) {
  const path: { id: string; name: string }[] = [];
  let id: string | null = folderId;
  while (id && path.length < 20) {
    const folder: { id: string; name: string; parentId: string | null } | null =
      await db.imageFolder.findUnique({ where: { id }, select: { id: true, name: true, parentId: true } });
    if (!folder) break;
    path.unshift({ id: folder.id, name: folder.name });
    id = folder.parentId;
  }
  return path;
}

const FOLDER_SELECT = {
  id: true, name: true, parentId: true, brandId: true,
  brand: { select: { name: true } },
  _count: { select: { images: true, children: true } },
} as const;

/** Inhoud van één map (of de root: eigen losse beelden + zichtbare topmappen). */
export async function libraryView(user: SessionUser, folderId: string | null) {
  if (folderId) {
    const folder = await findVisibleFolder(user, folderId);
    if (!folder) return null;
    const [path, folders, images] = await Promise.all([
      folderPath(folder.id),
      db.imageFolder.findMany({ where: { parentId: folder.id }, select: FOLDER_SELECT, orderBy: { name: "asc" } }),
      db.imageGeneration.findMany({ where: { folderId: folder.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    ]);
    return { folderId: folder.id, path, folders, images };
  }
  const [folders, images] = await Promise.all([
    db.imageFolder.findMany({
      where: { parentId: null, ...(await visibleOwnedWhere(user)) },
      select: FOLDER_SELECT,
      orderBy: { name: "asc" },
    }),
    db.imageGeneration.findMany({
      where: { userId: user.id, folderId: null },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  return { folderId: null, path: [], folders, images };
}

export type LibraryView = NonNullable<Awaited<ReturnType<typeof libraryView>>>;
