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
  appName: string;
  appIcon: string;
}> {
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: ["logo.light", "logo.dark", "theme.default", "app.name", "app.icon"] } },
    });
    const values = new Map(settings.map(({ key, value }) => [key, value]));
    const lightKey = values.get("logo.light");
    const darkKey = values.get("logo.dark");
    const theme = values.get("theme.default");
    const iconKey = values.get("app.icon");

    return {
      logoLight: lightKey
        ? `/api/branding/logo/light?v=${encodeURIComponent(lightKey)}`
        : DEFAULT_LOGOS.light,
      logoDark: darkKey
        ? `/api/branding/logo/dark?v=${encodeURIComponent(darkKey)}`
        : DEFAULT_LOGOS.dark,
      defaultTheme: theme === "light" || theme === "dark" ? theme : "system",
      appName: values.get("app.name")?.trim() || "FYNN",
      appIcon: iconKey
        ? `/api/branding/app-icon?v=${encodeURIComponent(iconKey)}`
        : "/icon.png",
    };
  } catch {
    return {
      logoLight: DEFAULT_LOGOS.light,
      logoDark: DEFAULT_LOGOS.dark,
      defaultTheme: "system",
      appName: "FYNN",
      appIcon: "/icon.png",
    };
  }
}

export function defaultLogo(variant: "light" | "dark") {
  return DEFAULT_LOGOS[variant];
}
