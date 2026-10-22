import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isSuperadmin, type Role } from "@/lib/roles";

/** PATCH: naam, rol, wachtwoord-reset en/of brand-koppeling (brandId alleen voor superadmin). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { name, role, password, brandId } = (await req.json()) as {
    name?: string;
    role?: string;
    password?: string;
    brandId?: string | null;
  };

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return Response.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof password === "string" && password) {
    if (password.length < 8) {
      return Response.json({ error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(password, 12);
  }
  if (role === "member" || role === "admin" || role === "superadmin") {
    if (role === "superadmin" && !isSuperadmin(admin.role)) {
      return Response.json({ error: "Alleen een superadmin kan superadmins aanmaken" }, { status: 403 });
    }
    data.role = role satisfies Role;
  }
  if (brandId !== undefined) {
    if (!isSuperadmin(admin.role)) {
      return Response.json({ error: "Alleen een superadmin kan gebruikers aan een brand koppelen" }, { status: 403 });
    }
    if (brandId) {
      const brand = await db.brand.findUnique({ where: { id: brandId } });
      if (!brand) return Response.json({ error: "Brand niet gevonden" }, { status: 404 });
    }
    data.brandId = brandId || null;
  }

  const user = await db.user.update({
    where: { id },
    data,
    select: {
      id: true, email: true, name: true, role: true,
      brandId: true, brand: { select: { id: true, name: true } },
    },
  });
  return Response.json({ user });
}

/** DELETE: gebruiker verwijderen (niet jezelf; superadmin alleen door een superadmin). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  if (id === admin.id) {
    return Response.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 400 });
  }
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return Response.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
  if (isSuperadmin(target.role) && !isSuperadmin(admin.role)) {
    return Response.json({ error: "Alleen een superadmin kan een superadmin verwijderen" }, { status: 403 });
  }

  await db.user.delete({ where: { id } });
  return Response.json({ success: true });
}
