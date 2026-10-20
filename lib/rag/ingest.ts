import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { iterFiles } from "@/lib/fsx";
import { chunkText } from "@/lib/rag/chunk";
import { embedBatch, toBuffer } from "@/lib/rag/embed";
import { extractLinks, htmlToText, parseSitemap } from "@/lib/rag/html";
import { syncRepo, type GitConfig } from "@/lib/rag/git";
import { getFile } from "@/lib/storage";
import { describeImage } from "@/lib/rag/vision";
import { env } from "@/lib/env";

export const TEXT_EXT = new Set([
  ".md", ".markdown", ".mdx", ".txt", ".html", ".htm", ".json", ".xml",
  ".yml", ".yaml", ".toml", ".csv", ".css", ".ts", ".tsx", ".js", ".jsx",
  ".php", ".py", ".sql", ".sh", ".ps1", ".svg", ".env.example",
]);
const MAX_FILE_BYTES = 400_000;
const MAX_SITE_PAGES = 80;
const REPO_SKIP = /node_modules|\.git\/|vendor|dist|build|\.next|package-lock|composer\.lock/i;
const BATCH = 200;

/** Postgres text columns reject NUL bytes. */
const clean = (t: string) => t.replace(/\u0000/g, "");

type SourceConfig = Record<string, unknown> & Partial<GitConfig>;
type Doc = { path: string; text: string; meta?: Record<string, unknown> };

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
    const raw = clean(await fs.readFile(fp, "utf8"));
    return path.extname(fp).match(/\.html?$/i) ? htmlToText(raw) : raw;
  } catch {
    return null;
  }
}

const HEADERS = { "User-Agent": "FYNN-KnowledgeBot/1.0" };
const ASSET_EXT = /\.(css|js|json|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|pdf|zip|mp4|xml)$/i;

/** Accept "docs.example.com" as well as full URLs. */
const withScheme = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch ${url} → ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  const body = await res.text();
  return ct.includes("html") ? htmlToText(body) : body;
}

/** Page urls from `<url>/sitemap.xml` (or the given .xml), else from the origin sitemap limited to the url's path. */
async function sitemapUrls(start: string): Promise<string[]> {
  const base = start.replace(/\/$/, "");
  const candidates = base.endsWith(".xml")
    ? [base]
    : [...new Set([`${base}/sitemap.xml`, `${new URL(base).origin}/sitemap.xml`])];
  for (const smUrl of candidates) {
    const res = await fetch(smUrl, { headers: HEADERS, redirect: "follow" }).catch(() => null);
    if (!res?.ok) continue;
    let urls = parseSitemap(await res.text());
    const nested = urls.filter((u) => u.endsWith(".xml"));
    if (nested.length && urls.length === nested.length) {
      urls = [];
      for (const n of nested.slice(0, 10)) {
        const r = await fetch(n, { headers: HEADERS }).catch(() => null);
        if (r?.ok) urls.push(...parseSitemap(await r.text()));
      }
    }
    if (!base.endsWith(".xml")) urls = urls.filter((u) => u.startsWith(base));
    if (urls.length) return urls;
  }
  return [];
}

/** Breadth-first crawl of same-origin links below the start url's directory (for sites without sitemap). */
async function crawlSite(start: string, limit: number): Promise<{ path: string; text: string }[]> {
  const docs: { path: string; text: string }[] = [];
  const seen = new Set<string>();
  const queue = [start];
  let scope = "";
  while (queue.length && docs.length < limit && seen.size < limit * 3) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await fetch(url, { headers: HEADERS, redirect: "follow" }).catch(() => null);
    if (!res?.ok || !(res.headers.get("content-type") ?? "").includes("html")) continue;
    const finalUrl = res.url || url;
    seen.add(finalUrl);
    if (!scope) {
      const u = new URL(finalUrl);
      scope = u.origin + u.pathname.replace(/[^/]*$/, "");
    }
    const html = await res.text();
    docs.push({ path: finalUrl, text: htmlToText(clean(html)) });
    for (const link of extractLinks(html, finalUrl)) {
      if (link.startsWith(scope) && !ASSET_EXT.test(new URL(link).pathname) && !seen.has(link)) queue.push(link);
    }
  }
  return docs;
}

/** Local paths only exist on the machine that created the source, not on the server. */
async function assertLocalPath(p: string, kind: "file" | "folder") {
  const stat = await fs.stat(p).catch(() => null);
  if (!stat || (kind === "folder" ? !stat.isDirectory() : !stat.isFile())) {
    throw new Error(
      `Lokaal pad bestaat niet op de server: ${p}. Upload het bestand via "Upload bestand" of gebruik een git-bron.`
    );
  }
}

/** Snapshot all text files of a clone into RepoFile, so repo_search/repo_file work without a clone on disk. */
async function storeRepoFiles(sourceId: string, dir: string, exclude?: string[]) {
  const files: { sourceId: string; path: string; content: string }[] = [];
  for await (const fp of iterTextFiles(dir, undefined, exclude)) {
    const rel = path.relative(dir, fp);
    if (REPO_SKIP.test(rel)) continue;
    const content = await readDoc(fp);
    if (content) files.push({ sourceId, path: rel, content });
  }
  await db.$transaction(async (tx) => {
    await tx.repoFile.deleteMany({ where: { sourceId } });
    for (let i = 0; i < files.length; i += BATCH) {
      await tx.repoFile.createMany({ data: files.slice(i, i + BATCH) });
    }
  }, { timeout: 120_000 });
}

/** Collect (path, text) docs for a source. */
export async function collectDocs(
  source: { id: string; type: string; config: string },
  imageDescriber: typeof describeImage = describeImage,
): Promise<{ docs: Doc[]; warnings: string[] }> {
  const cfg = JSON.parse(source.config || "{}") as SourceConfig;
  const docs: Doc[] = [];
  const warnings: string[] = [];

  if (source.type === "file" && cfg.storageKey) {
    const buf = await getFile(String(cfg.storageKey));
    if (!buf) throw new Error("Geüpload bestand niet gevonden in opslag");
    const name = String(cfg.filename ?? cfg.storageKey);
    const raw = clean(new TextDecoder().decode(buf));
    docs.push({ path: name, text: /\.html?$/i.test(name) ? htmlToText(raw) : raw });
  } else if (source.type === "file") {
    const fp = String(cfg.localPath ?? "");
    await assertLocalPath(fp, "file");
    const text = await readDoc(fp);
    if (text) docs.push({ path: fp, text });
  } else if (source.type === "upload") {
    const assets = await db.knowledgeAsset.findMany({
      where: { sourceId: source.id },
      orderBy: { createdAt: "asc" },
    });
    for (const asset of assets) {
      const bytes = await getFile(asset.storageKey);
      if (!bytes) throw new Error(`Geüpload bestand niet gevonden in opslag: ${asset.filename}`);

      if (asset.contentType.startsWith("image/")) {
        let caption = asset.caption;
        if (!caption) {
          try {
            caption = (await imageDescriber(bytes, asset.contentType, asset.filename)).trim();
            if (!caption) throw new Error("Het vision-model gaf geen beschrijving terug");
            await db.knowledgeAsset.update({ where: { id: asset.id }, data: { caption } });
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            warnings.push(message.slice(0, 300));
            caption = "";
          }
        }
        docs.push({
          path: asset.filename,
          text: `Afbeelding: ${asset.filename}${caption ? `\n${caption}` : ""}`,
          meta: { kind: "image", assetId: asset.id },
        });
      } else {
        const raw = clean(new TextDecoder().decode(bytes));
        docs.push({
          path: asset.filename,
          text: /\.html?$/i.test(asset.filename) ? htmlToText(raw) : raw,
        });
      }
    }
  } else if (source.type === "folder") {
    const root = String(cfg.localPath ?? "");
    await assertLocalPath(root, "folder");
    for await (const fp of iterTextFiles(root, cfg.include as string[], cfg.exclude as string[])) {
      const text = await readDoc(fp);
      if (text) docs.push({ path: path.relative(root, fp), text });
    }
  } else if (source.type === "url") {
    const url = withScheme(String(cfg.url ?? ""));
    docs.push({ path: url, text: await fetchText(url) });
  } else if (source.type === "sitemap") {
    const start = withScheme(String(cfg.url ?? ""));
    const limit = Number(cfg.maxPages ?? MAX_SITE_PAGES);
    const urls = await sitemapUrls(start);
    if (urls.length) {
      for (const u of urls.slice(0, limit)) {
        try {
          docs.push({ path: u, text: await fetchText(u) });
        } catch { /* skip broken pages */ }
      }
    } else {
      docs.push(...(await crawlSite(start, limit)));
    }
  } else if (source.type === "git") {
    if (!cfg.repoUrl) throw new Error("repoUrl ontbreekt in source-config");
    const { dir, sha } = await syncRepo(source.id, cfg as GitConfig);
    try {
      const include = (cfg.include as string[])?.length
        ? (cfg.include as string[])
        : ["**/*.md", "**/*.txt", "**/*.mdx", "docs/**", "**/README*", "**/AGENTS.md"];
      for await (const fp of iterTextFiles(dir, include, cfg.exclude as string[])) {
        const text = await readDoc(fp);
        if (text) docs.push({ path: `${path.relative(dir, fp)} @${sha.slice(0, 8)}`, text });
      }
      await storeRepoFiles(source.id, dir, cfg.exclude as string[]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
  const unique = new Set<string>();
  return {
    docs: docs.filter((d) =>
      d.text.trim() && (d.meta?.kind === "image" || (!unique.has(d.text) && unique.add(d.text)))
    ),
    warnings,
  };
}

/** Sync a knowledge source: collect docs → chunk → embed → replace chunks. */
export async function syncSource(sourceId: string): Promise<{ chunks: number; error?: string }> {
  const source = await db.knowledgeSource.findUnique({ where: { id: sourceId } });
  if (!source) return { chunks: 0, error: "Bron niet gevonden" };

  await db.knowledgeSource.update({
    where: { id: sourceId },
    data: { status: "syncing", statusMsg: "" },
  });

  try {
    if (!env.openRouterKey) {
      throw new Error("De OpenRouter API-sleutel ontbreekt. Stel OPENROUTER_API_KEY in en probeer opnieuw.");
    }
    const { docs, warnings } = await collectDocs(source);
    if (!docs.length) throw new Error("Geen inhoud gevonden — controleer de URL, het pad of de include-patronen.");
    const items = docs.flatMap((d) =>
      (d.meta?.kind === "image" ? [d.text] : chunkText(d.text))
        .map((text) => ({ text, path: d.path, meta: d.meta }))
    );

    const vectors = await embedBatch(items.map((i) => i.text));
    const rows = items.map((it, i) => ({
      sourceId,
      path: it.path,
      text: it.text,
      embedding: toBuffer(vectors[i]),
      meta: JSON.stringify(it.meta ?? {}),
    }));
    await db.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { sourceId } });
      for (let i = 0; i < rows.length; i += BATCH) {
        await tx.knowledgeChunk.createMany({ data: rows.slice(i, i + BATCH) });
      }
    }, { timeout: 120_000 });

    await db.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        status: "ready",
        statusMsg: warnings.length
          ? `${warnings.length} afbeelding(en) zonder beschrijving: ${warnings[0]}`
          : "",
        lastSyncAt: new Date(),
        chunkCount: items.length,
      },
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
