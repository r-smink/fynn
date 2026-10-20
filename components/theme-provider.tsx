"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { DefaultTheme } from "@/lib/branding";

export function ThemeProvider({
  children,
  defaultTheme,
}: {
  children: React.ReactNode;
  defaultTheme: DefaultTheme;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
