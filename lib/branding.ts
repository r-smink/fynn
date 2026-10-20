import { db } from "@/lib/db";

const DEFAULT_LOGOS = {
  light: "/brand/fyndable-logo.png",
  dark: "/brand/fyndable-logo-dark.png",
};

export type DefaultTheme = "light" | "dark" | "system";

export async function getBranding(): Promise<{
  logoLight: string;
  logoDark: string;
  defaultTheme: DefaultTheme;
}> {
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: ["logo.light", "logo.dark", "theme.default"] } },
    });
    const values = new Map(settings.map(({ key, value }) => [key, value]));
    const lightKey = values.get("logo.light");
    const darkKey = values.get("logo.dark");
    const theme = values.get("theme.default");

    return {
      logoLight: lightKey
        ? `/api/branding/logo/light?v=${encodeURIComponent(lightKey)}`
        : DEFAULT_LOGOS.light,
      logoDark: darkKey
        ? `/api/branding/logo/dark?v=${encodeURIComponent(darkKey)}`
        : DEFAULT_LOGOS.dark,
      defaultTheme: theme === "light" || theme === "dark" ? theme : "system",
    };
  } catch {
    return {
      logoLight: DEFAULT_LOGOS.light,
      logoDark: DEFAULT_LOGOS.dark,
      defaultTheme: "system",
    };
  }
}

export function defaultLogo(variant: "light" | "dark") {
  return DEFAULT_LOGOS[variant];
}
