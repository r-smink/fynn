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
  siteTitle: string;
  appName: string;
  appIcon: string;
  favicon: string;
}> {
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: ["logo.light", "logo.dark", "theme.default", "site.title", "app.name", "app.icon", "app.favicon"] } },
    });
    const values = new Map(settings.map(({ key, value }) => [key, value]));
    const lightKey = values.get("logo.light");
    const darkKey = values.get("logo.dark");
    const theme = values.get("theme.default");
    const iconKey = values.get("app.icon");
    const faviconKey = values.get("app.favicon");

    return {
      logoLight: lightKey
        ? `/api/branding/logo/light?v=${encodeURIComponent(lightKey)}`
        : DEFAULT_LOGOS.light,
      logoDark: darkKey
        ? `/api/branding/logo/dark?v=${encodeURIComponent(darkKey)}`
        : DEFAULT_LOGOS.dark,
      defaultTheme: theme === "light" || theme === "dark" ? theme : "system",
      siteTitle: values.get("site.title")?.trim() || values.get("app.name")?.trim() || "FYNN",
      appName: values.get("app.name")?.trim() || "FYNN",
      appIcon: iconKey
        ? `/api/branding/app-icon?v=${encodeURIComponent(iconKey)}`
        : "/icon.png",
      favicon: faviconKey
        ? `/api/branding/favicon?v=${encodeURIComponent(faviconKey)}`
        : "/api/branding/favicon",
    };
  } catch {
    return {
      logoLight: DEFAULT_LOGOS.light,
      logoDark: DEFAULT_LOGOS.dark,
      defaultTheme: "system",
      siteTitle: "FYNN",
      appName: "FYNN",
      appIcon: "/icon.png",
      favicon: "/api/branding/favicon",
    };
  }
}

export function defaultLogo(variant: "light" | "dark") {
  return DEFAULT_LOGOS[variant];
}
