import { tool } from "ai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { walkDir } from "@/lib/fsx";
import { repoDir } from "@/lib/env";

const SKIP = /node_modules|\.git|vendor|dist|build|\.next|package-lock|composer\.lock/i;
const MAX_RESULTS = 40;
const MAX_FILE = 400_000;

async function grepRepo(sourceId: string, pattern: RegExp, maxResults: number) {
  const dir = repoDir(sourceId);
  const hits: { file: string; line: number; text: string }[] = [];
  for await (const fp of walkDir(dir)) {
    if (SKIP.test(fp)) continue;
    const stat = await fs.stat(fp).catch(() => null);
    if (!stat || stat.size > MAX_FILE) continue;
    const text = await fs.readFile(fp, "utf8").catch(() => "");
    if (!text) continue;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        hits.push({
          file: path.relative(dir, fp),
          line: i + 1,
          text: lines[i].trim().slice(0, 200),
        });
        if (hits.length >= maxResults) return hits;
      }
    }
  }
  return hits;
}

export function repoTools() {
  return {
    repo_search: tool({
      description:
        "Zoek (substring of regex) in de gesyncede git-repositories — voor vragen over code, features, implementaties.",
      inputSchema: z.object({
        query: z.string().describe("zoekterm (plain text of /regex/)"),
        sourceId: z.string().optional().describe("specifieke repo-source, anders alle git-sources"),
      }),
      execute: async ({ query, sourceId }) => {
        const sources = await db.knowledgeSource.findMany({
          where: { type: "git", ...(sourceId ? { id: sourceId } : {}) },
          select: { id: true, name: true },
        });
        if (!sources.length) return { error: "Geen git-repositories geconfigureerd/gesynced." };
        const pattern = query.startsWith("/") && query.endsWith("/")
          ? new RegExp(query.slice(1, -1), "i")
          : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const out: Record<string, unknown>[] = [];
        for (const s of sources) {
          const hits = await grepRepo(s.id, pattern, MAX_RESULTS);
          if (hits.length) out.push({ repo: s.name, matches: hits });
        }
        return out.length ? { results: out } : { results: [], note: "Niets gevonden." };
      },
    }),
    repo_file: tool({
      description: "Lees een bestand uit een gesyncede git-repo (pad relatief aan repo-root).",
      inputSchema: z.object({
        sourceId: z.string(),
        filePath: z.string(),
      }),
      execute: async ({ sourceId, filePath }) => {
        const dir = repoDir(sourceId);
        const fp = path.join(dir, filePath);
        if (!fp.startsWith(dir)) return { error: "Ongeldig pad" };
        try {
          const text = await fs.readFile(fp, "utf8");
          return { file: filePath, content: text.slice(0, 15000) };
        } catch {
          return { error: "Bestand niet gevonden" };
        }
      },
    }),
  };
}
