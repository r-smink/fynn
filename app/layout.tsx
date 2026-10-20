import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { getBranding } from "@/lib/branding";
import { db } from "@/lib/db";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FYNN",
  description: "FYNN — whitelabel AI chatplatform",
};

async function brandVars(): Promise<Record<string, string>> {
  try {
    const brand = await db.brand.findFirst({ where: { isDefault: true } });
    if (!brand) return {};
    const t = JSON.parse(brand.theme || "{}") as Record<string, string>;
    const vars: Record<string, string> = {};
    const safeValue = (value: unknown) =>
      typeof value === "string" && /^[#a-zA-Z0-9(),.%\s-]+$/.test(value) ? value : undefined;
    const primary = safeValue(t.primary);
    const secondary = safeValue(t.secondary);
    const gradient = safeValue(t.gradient);
    if (primary) vars["--primary"] = primary;
    if (secondary) vars["--accent"] = secondary;
    if (primary) vars["--sidebar-primary"] = primary;
    if (gradient) vars["--brand-gradient"] = gradient;
    return vars;
  } catch {
    return {};
  }
}

function brandCss(vars: Record<string, string>) {
  const root = Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  const dark = ["--primary", "--sidebar-primary", "--brand-gradient"]
    .filter((name) => vars[name])
    .map((name) => `${name}:${vars[name]}`)
    .join(";");
  return `${root ? `:root{${root}}` : ""}${dark ? `.dark{${dark}}` : ""}`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [vars, branding] = await Promise.all([brandVars(), getBranding()]);
  return (
    <html lang="nl" className={outfit.variable} suppressHydrationWarning>
      <body className="antialiased">
        <style>{brandCss(vars)}</style>
        <ThemeProvider defaultTheme={branding.defaultTheme}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
