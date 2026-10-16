import * as cheerio from "cheerio";

/** Extract readable text from HTML. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg, nav, footer, header, form").remove();
  const title = $("title").first().text().trim();
  const body = $("body").text().replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  return title ? `# ${title}\n\n${body}` : body;
}

/** Collect same-origin links from a page (for sitemap/site crawling). */
export function extractLinks(html: string, base: string): string[] {
  const $ = cheerio.load(html);
  const out = new Set<string>();
  $("a[href]").each((_, el) => {
    try {
      const u = new URL($(el).attr("href") ?? "", base);
      u.hash = "";
      if (u.origin === new URL(base).origin) out.add(u.toString());
    } catch {
      /* ignore */
    }
  });
  return [...out];
}

/** Parse sitemap XML into a list of urls. */
export function parseSitemap(xml: string): string[] {
  const $ = cheerio.load(xml, { xml: true });
  const urls: string[] = [];
  $("url > loc, sitemap > loc").each((_, el) => {
    const t = $(el).text().trim();
    if (t) urls.push(t);
  });
  return urls;
}
