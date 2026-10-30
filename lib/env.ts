import os from "os";
import path from "path";

export const env = {
  get dataDir() {
    return path.resolve(/* turbopackIgnore: true */ process.env.FYNN_DATA_DIR || "./data");
  },
  get openRouterKey() {
    return process.env.OPENROUTER_API_KEY || "";
  },
  get portalUrl() {
    return process.env.FYNDABLE_PORTAL_URL || "https://portal.fyndable.ai";
  },
  get portalUser() {
    return process.env.FYNDABLE_WP_USER || "";
  },
  get portalPassword() {
    return process.env.FYNDABLE_WP_APP_PASSWORD || "";
  },
  get wpSiteUrl() {
    return (process.env.WP_SITE_URL || "https://fyndable.ai").replace(/\/$/, "");
  },
  get wpUser() {
    return process.env.WP_USER || process.env.FYNDABLE_WP_USER || "";
  },
  get wpPassword() {
    return process.env.WP_APP_PASSWORD || process.env.FYNDABLE_WP_APP_PASSWORD || "";
  },
  get cronSecret() {
    return process.env.CRON_SECRET || "";
  },
  get imageModel() {
    return process.env.IMAGE_MODEL || "google/gemini-2.5-flash-image";
  },
  /** Denkt mee in de beeldstudio (beeld-agents): moet afbeeldingen kunnen lezen én tools kunnen aanroepen. */
  get imageAgentModel() {
    return process.env.IMAGE_AGENT_MODEL || process.env.VISION_MODEL || "google/gemini-2.5-flash";
  },
  get visionModel() {
    return process.env.VISION_MODEL || "google/gemini-2.5-flash-lite";
  },
  get embeddingModel() {
    return process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small";
  },
};

/** Scratch dir for git clones; only lives for the duration of a sync. */
export function repoDir(sourceId: string) {
  return path.join(os.tmpdir(), "fynn-repos", sourceId);
}
