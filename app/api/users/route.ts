import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isSuperadmin, type Role } from "@/lib/roles";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const users = await db.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, createdAt: true,
      brandId: true, brand: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ users });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { email, name, password, role, brandId } = (await req.json()) as {
    email: string; name: string; password: string; role?: string; brandId?: string | null;
  };
  if (!email || !password || !name) {
    return Response.json({ error: "email, naam en wachtwoord zijn vereist" }, { status: 400 });
  }
  const newRole: Role =
    role === "superadmin" && isSuperadmin(admin.role) ? "superadmin" : role === "admin" || role === "superadmin" ? "admin" : "member";

  const exists = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (exists) return Response.json({ error: "E-mail bestaat al" }, { status: 409 });

  const user = await db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name,
      passwordHash: await bcrypt.hash(password, 12),
      role: newRole,
      // Brand koppelen mag alleen een superadmin
      brandId: isSuperadmin(admin.role) && brandId ? brandId : null,
    },
    select: { id: true, email: true, name: true, role: true },
  });
  return Response.json({ user }, { status: 201 });
}
