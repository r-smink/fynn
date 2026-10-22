import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";

/**
 * Geeft het brandId terug waaraan de gebruiker gekoppeld is, of null als
 * de gebruiker onbeperkt is (admins + gebruikers zonder brand).
 * Brand-gekoppelde gebruikers (members) zien alleen content van hun brand.
 */
export async function userBrandScope(user: { id: string; role: string }): Promise<string | null> {
  if (isAdminRole(user.role)) return null;
  const u = await db.user.findUnique({ where: { id: user.id }, select: { brandId: true } });
  return u?.brandId ?? null;
}

/**
 * Where-clause voor resources met zowel een eigenaar (userId) als een brand:
 * admins zien alles, brand-members hun eigen items plus die van hun brand,
 * overige members alleen hun eigen items.
 */
export async function visibleOwnedWhere(user: { id: string; role: string }) {
  if (isAdminRole(user.role)) return {};
  const u = await db.user.findUnique({ where: { id: user.id }, select: { brandId: true } });
  return u?.brandId
    ? { OR: [{ userId: user.id }, { brandId: u.brandId }] }
    : { userId: user.id };
}

/** Mag deze gebruiker het gegeven item (userId + brandId) zien/bewerken? */
export async function ownsOrShares(
  rec: { userId: string; brandId: string | null },
  user: { id: string; role: string },
): Promise<boolean> {
  if (isAdminRole(user.role) || rec.userId === user.id) return true;
  if (!rec.brandId) return false;
  const u = await db.user.findUnique({ where: { id: user.id }, select: { brandId: true } });
  return u?.brandId === rec.brandId;
}
