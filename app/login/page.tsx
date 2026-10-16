import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const brand = await db.brand.findFirst({ where: { isDefault: true } });
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2A1533] to-[#132A38] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            F
          </div>
          <h1 className="text-2xl font-bold">FYNN</h1>
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
