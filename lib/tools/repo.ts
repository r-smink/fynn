import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";

const MAX_RESULTS = 40;
const PAGE = 200;

async function grepRepo(sourceId: string, pattern: RegExp, literal: string | null, maxResults: number) {
  const hits: { file: string; line: number; text: string }[] = [];
  let cursor: string | undefined;
  for (;;) {
    const files = await db.repoFile.findMany({
      where: { sourceId, ...(literal ? { content: { contains: literal, mode: "insensitive" } } : {}) },
      select: { id: true, path: true, content: true },
      orderBy: { id: "asc" },
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    for (const f of files) {
      const lines = f.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          hits.push({ file: f.path, line: i + 1, text: lines[i].trim().slice(0, 200) });
          if (hits.length >= maxResults) return hits;
        }
      }
    }
    if (files.length < PAGE) return hits;
    cursor = files[files.length - 1].id;
  }
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
        const isRegex = query.startsWith("/") && query.endsWith("/") && query.length > 1;
        const pattern = isRegex
          ? new RegExp(query.slice(1, -1), "i")
          : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const out: Record<string, unknown>[] = [];
        for (const s of sources) {
          const hits = await grepRepo(s.id, pattern, isRegex ? null : query, MAX_RESULTS);
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
        const file = await db.repoFile.findUnique({
          where: { sourceId_path: { sourceId, path: filePath.replace(/^\.?\//, "") } },
          select: { content: true },
        });
        if (!file) return { error: "Bestand niet gevonden" };
        return { file: filePath, content: file.content.slice(0, 15000) };
      },
    }),
  };
}
