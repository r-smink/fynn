import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { appName, appIcon } = await getBranding();
  return {
    name: appName,
    short_name: appName,
    description: "FYNN — whitelabel AI chatplatform",
    start_url: "/chat",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1117",
    theme_color: "#132A38",
    icons: [
      { src: appIcon, sizes: "any", type: "image/png", purpose: "any" },
      { src: appIcon, sizes: "any", type: "image/png", purpose: "maskable" },
    ],
  };
}
