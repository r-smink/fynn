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
