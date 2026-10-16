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
export async function syncRepo(sourceId: string, config: GitConfig): Promise<{ dir: string; sha: string }> {
  const dir = repoDir(sourceId);
  const url = authedUrl(config);
  const exists = await fs.stat(path.join(dir, ".git")).then(() => true).catch(() => false);

  if (exists) {
    const git = simpleGit(dir);
    await git.fetch(["--depth", "1", "origin", config.branch || "HEAD"]).catch(() => git.fetch());
    const branch = config.branch || (await git.revparse(["--abbrev-ref", "HEAD"])).trim();
    await git.reset(["--hard", `origin/${branch}`]);
  } else {
    await fs.mkdir(dir, { recursive: true });
    await simpleGit().clone(url, dir, [
      "--depth", "1",
      ...(config.branch ? ["--branch", config.branch] : []),
    ]);
  }

  const sha = (await simpleGit(dir).revparse(["HEAD"])).trim();
  return { dir, sha };
}
