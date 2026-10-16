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
  get imageModel() {
    return process.env.IMAGE_MODEL || "google/gemini-2.5-flash-image-preview";
  },
  get embeddingModel() {
    return process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small";
  },
};

/** Scratch dir for git clones; only lives for the duration of a sync. */
export function repoDir(sourceId: string) {
  return path.join(os.tmpdir(), "fynn-repos", sourceId);
}
