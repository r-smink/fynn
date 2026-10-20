import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { getBranding } from "@/lib/branding";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const branding = await getBranding();
  const brand = await db.brand.findFirst({ where: { isDefault: true } }).catch(() => null);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2A1533] to-[#132A38] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <Logo
            logoLight={branding.logoLight}
            logoDark={branding.logoDark}
            className="mx-auto mb-3 h-10 max-w-full object-contain"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {brand ? `${brand.name} AI-platform` : "AI chatplatform"}
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
