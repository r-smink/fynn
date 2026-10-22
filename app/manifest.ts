import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { appName } = await getBranding();
  // N.B.: icon-src zonder ?v= — launchers (vooral iOS) negeren icons met querystring.
  const icon = "/api/branding/app-icon";
  return {
    id: "/",
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
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
