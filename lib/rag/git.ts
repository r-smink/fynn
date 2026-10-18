import path from "path";
import fs from "fs/promises";
import nodeFs from "fs";
import git, { type GitAuth } from "isomorphic-git";
import http from "isomorphic-git/http/node";
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

function auth(token: string): GitAuth {
  if (token.startsWith("ghp_") || token.startsWith("github_pat_")) return { username: token };
  return { username: "oauth2", password: token };
}

/** Fresh shallow clone into a scratch dir (serverless filesystems are ephemeral). Caller removes `dir`. */
export async function syncRepo(sourceId: string, config: GitConfig): Promise<{ dir: string; sha: string }> {
  const dir = repoDir(sourceId);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(dir), { recursive: true });
  await git.clone({
    fs: nodeFs,
    http,
    dir,
    url: config.repoUrl,
    ref: config.branch || undefined,
    singleBranch: true,
    depth: 1,
    onAuth: config.token ? () => auth(config.token!) : undefined,
  });
  const sha = await git.resolveRef({ fs: nodeFs, dir, ref: "HEAD" });
  return { dir, sha };
}
