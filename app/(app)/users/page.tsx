import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { UsersAdmin } from "@/components/admin/users-admin";

export default async function UsersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/chat");
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Gebruikers</h1>
      <p className="mb-6 text-sm text-muted-foreground">Interne accounts — geen self-signup.</p>
      <UsersAdmin users={users} />
    </div>
  );
}
