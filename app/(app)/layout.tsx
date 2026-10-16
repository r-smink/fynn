import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar userName={user.name || user.email} userRole={user.role} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
