import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { iterFiles } from "@/lib/fsx";
import { chunkText } from "@/lib/rag/chunk";
import { embedBatch, toBuffer } from "@/lib/rag/embed";
import { htmlToText, parseSitemap } from "@/lib/rag/html";
import { syncRepo, type GitConfig } from "@/lib/rag/git";

const TEXT_EXT = new Set([
  ".md", ".markdown", ".mdx", ".txt", ".html", ".htm", ".json", ".xml",
  ".yml", ".yaml", ".toml", ".csv", ".css", ".ts", ".tsx", ".js", ".jsx",
  ".php", ".py", ".sql", ".sh", ".ps1", ".svg", ".env.example",
]);
const MAX_FILE_BYTES = 400_000;
const MAX_SITE_PAGES = 80;

type SourceConfig = Record<string, unknown> & Partial<GitConfig>;

function isTextFile(p: string): boolean {
  const base = path.basename(p).toLowerCase();
  if (["license", "readme", "changelog", "contributing", "authors", "notice"].some((n) => base.startsWith(n))) return true;
  return TEXT_EXT.has(path.extname(p).toLowerCase());
}

async function* iterTextFiles(root: string, include?: string[], exclude?: string[]) {
  for await (const fp of iterFiles(root, include, exclude)) {
    if (isTextFile(fp)) yield fp;
  }
}

async function readDoc(fp: string): Promise<string | null> {
  try {
    const stat = await fs.stat(fp);
    if (stat.size > MAX_FILE_BYTES) return null;
    const raw = await fs.readFile(fp, "utf8");
    return path.extname(fp).match(/\.html?$/i) ? htmlToText(raw) : raw;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "FYNN-KnowledgeBot/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch ${url} → ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  const body = await res.text();
  return ct.includes("html") ? htmlToText(body) : body;
}

/** Collect (path, text) docs for a source. */
async function collectDocs(source: { id: string; type: string; config: string }): Promise<{ path: string; text: string }[]> {
  const cfg = JSON.parse(source.config || "{}") as SourceConfig;
  const docs: { path: string; text: string }[] = [];

  if (source.type === "file") {
    const fp = String(cfg.localPath ?? "");
    const text = await readDoc(fp);
    if (text) docs.push({ path: fp, text });
  } else if (source.type === "folder") {
    const root = String(cfg.localPath ?? "");
    for await (const fp of iterTextFiles(root, cfg.include as string[], cfg.exclude as string[])) {
      const text = await readDoc(fp);
      if (text) docs.push({ path: path.relative(root, fp), text });
    }
  } else if (source.type === "url") {
    docs.push({ path: String(cfg.url), text: await fetchText(String(cfg.url)) });
  } else if (source.type === "sitemap") {
    const smUrl = String(cfg.url ?? "").replace(/\/$/, "");
    const xml = await fetch(smUrl.endsWith(".xml") ? smUrl : `${smUrl}/sitemap.xml`).then((r) => r.text());
    let urls = parseSitemap(xml);
    // nested sitemaps → fetch one level deep
    const nested = urls.filter((u) => u.endsWith(".xml"));
    if (nested.length && urls.length === nested.length) {
      urls = [];
      for (const n of nested.slice(0, 10)) {
        urls.push(...parseSitemap(await fetch(n).then((r) => r.text())));
      }
    }
    const limit = Number(cfg.maxPages ?? MAX_SITE_PAGES);
    for (const u of urls.slice(0, limit)) {
      try {
        docs.push({ path: u, text: await fetchText(u) });
      } catch { /* skip broken pages */ }
    }
  } else if (source.type === "git") {
    if (!cfg.repoUrl) throw new Error("repoUrl ontbreekt in source-config");
    const { dir, sha } = await syncRepo(source.id, cfg as GitConfig);
    const include = (cfg.include as string[])?.length
      ? (cfg.include as string[])
      : ["**/*.md", "**/*.txt", "**/*.mdx", "docs/**", "**/README*", "**/AGENTS.md"];
    for await (const fp of iterTextFiles(dir, include, cfg.exclude as string[])) {
      const text = await readDoc(fp);
      if (text) docs.push({ path: `${path.relative(dir, fp)} @${sha.slice(0, 8)}`, text });
    }
  }
  return docs;
}

/** Sync a knowledge source: collect docs → chunk → embed → replace chunks. */
export async function syncSource(sourceId: string): Promise<{ chunks: number; error?: string }> {
  const source = await db.knowledgeSource.findUnique({ where: { id: sourceId } });
  if (!source) return { chunks: 0, error: "source not found" };

  await db.knowledgeSource.update({
    where: { id: sourceId },
    data: { status: "syncing", statusMsg: "" },
  });

  try {
    const docs = await collectDocs(source);
    const items = docs.flatMap((d) =>
      chunkText(d.text).map((t) => ({ text: t, path: d.path }))
    );

    // replace all chunks for this source
    await db.knowledgeChunk.deleteMany({ where: { sourceId } });

    const vectors = await embedBatch(items.map((i) => i.text));
    for (let i = 0; i < items.length; i++) {
      await db.knowledgeChunk.create({
        data: {
          sourceId,
          path: items[i].path,
          text: items[i].text,
          embedding: toBuffer(vectors[i]),
        },
      });
    }

    await db.knowledgeSource.update({
      where: { id: sourceId },
      data: { status: "ready", statusMsg: "", lastSyncAt: new Date(), chunkCount: items.length },
    });
    return { chunks: items.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.knowledgeSource.update({
      where: { id: sourceId },
      data: { status: "error", statusMsg: msg.slice(0, 500) },
    });
    return { chunks: 0, error: msg };
  }
}
