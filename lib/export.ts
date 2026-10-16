import { marked } from "marked";
import type { Brand } from "@/generated/prisma/client";

type Theme = {
  primary?: string;
  secondary?: string;
  gradient?: string;
  headingFont?: string;
  bodyFont?: string;
};

function parseTheme(brand: Brand | null): Theme {
  try {
    return brand ? (JSON.parse(brand.theme || "{}") as Theme) : {};
  } catch {
    return {};
  }
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Render markdown into a standalone, on-brand HTML document (white-label). */
export function brandedHtml(markdown: string, brand: Brand | null, title: string): string {
  const t = parseTheme(brand);
  const primary = t.primary || "#6366f1";
  const secondary = t.secondary || "#0ea5e9";
  const gradient = t.gradient || `linear-gradient(135deg,${primary},${secondary})`;
  const headingFont = t.headingFont || "Inter, system-ui, sans-serif";
  const bodyFont = t.bodyFont || "system-ui, sans-serif";
  const body = marked.parse(markdown, { async: false }) as string;

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --primary:${primary}; --secondary:${secondary}; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:${bodyFont}; color:#1f2937; background:#f9fafb; }
  .bar { height:6px; background:${gradient}; }
  .page { max-width:760px; margin:0 auto; padding:48px 24px 80px; }
  .brand { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
  .brand img { height:32px; }
  .brand span { font-weight:700; font-size:18px; font-family:${headingFont}; }
  h1,h2,h3,h4 { font-family:${headingFont}; color:#111827; line-height:1.25; }
  h1 { border-bottom:3px solid var(--primary); padding-bottom:.35em; }
  a { color:var(--primary); }
  code { background:#f3f4f6; padding:.15em .4em; border-radius:4px; font-size:.9em; }
  pre { background:#111827; color:#f9fafb; padding:16px; border-radius:8px; overflow:auto; }
  pre code { background:none; padding:0; }
  blockquote { border-left:4px solid var(--secondary); margin:1em 0; padding:.5em 1em; background:#fff; color:#4b5563; }
  table { border-collapse:collapse; width:100%; } td,th { border:1px solid #e5e7eb; padding:8px 12px; text-align:left; }
  th { background:#f3f4f6; }
  img { max-width:100%; border-radius:8px; }
  .footer { margin-top:64px; padding-top:16px; border-top:1px solid #e5e7eb; color:#9ca3af; font-size:12px; }
</style>
</head>
<body>
<div class="bar"></div>
<div class="page">
  ${brand?.logoUrl || brand?.name ? `<div class="brand">${brand.logoUrl ? `<img src="${esc(brand.logoUrl)}" alt="">` : ""}<span>${esc(brand.name)}</span></div>` : ""}
  ${body}
  <div class="footer">Gegenereerd met FYNN${brand ? ` · ${esc(brand.name)}` : ""}</div>
</div>
</body>
</html>`;
}
