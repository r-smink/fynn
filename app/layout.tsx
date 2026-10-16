import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { db } from "@/lib/db";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
    if (t.primary) vars["--primary"] = t.primary;
    if (t.secondary) vars["--accent"] = t.secondary;
    if (t.primary) vars["--sidebar-primary"] = t.primary;
    if (t.gradient) vars["--brand-gradient"] = t.gradient;
    return vars;
  } catch {
    return {};
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const vars = await brandVars();
  return (
    <html lang="nl">
      <body className={`${inter.variable} antialiased`} style={vars as React.CSSProperties}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
