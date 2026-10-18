import path from "path";
import fs from "fs/promises";
import { simpleGit } from "simple-git";
import { repoDir } from "@/lib/env";

export type GitConfig = {
  repoUrl: string;
  branch?: string;
  /** include globs, e.g. ["**\/*.md", "src/**"] — empty = all text files */
  include?: string[];
  exclude?: string[];
  /** Personal access token (inserted into https URL) */
  token?: string;
};

function authedUrl(config: GitConfig): string {
  if (!config.token) return config.repoUrl;
  try {
    const u = new URL(config.repoUrl);
    if (u.protocol === "https:" && !u.username) {
      u.username = config.token.startsWith("ghp_") || config.token.startsWith("github_pat_")
        ? config.token
        : "oauth2";
      if (!u.password) u.password = config.token.startsWith("ghp_") || config.token.startsWith("github_pat_") ? "" : config.token;
    }
    return u.toString();
  } catch {
    return config.repoUrl;
  }
}

/** Clone (shallow) or pull a repo into data/repos/<sourceId>. Returns commit sha. */
/** Fresh shallow clone into a scratch dir (serverless filesystems are ephemeral). Caller removes `dir`. */
export async function syncRepo(sourceId: string, config: GitConfig): Promise<{ dir: string; sha: string }> {
  const dir = repoDir(sourceId);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(dir), { recursive: true });
  await simpleGit().clone(authedUrl(config), dir, [
    "--depth", "1",
    ...(config.branch ? ["--branch", config.branch] : []),
  ]);
  const sha = (await simpleGit(dir).revparse(["HEAD"])).trim();
  return { dir, sha };
}
