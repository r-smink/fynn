import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, branding] = await Promise.all([requireUser(), getBranding()]);
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        userName={user.name || user.email}
        userRole={user.role}
        logoLight={branding.logoLight}
        logoDark={branding.logoDark}
      />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
