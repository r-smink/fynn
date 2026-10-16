import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandedHtml } from "@/lib/export";

/** POST { markdown, brandId?, title? } → standalone branded HTML document. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { markdown, brandId, title } = (await req.json()) as {
    markdown: string; brandId?: string; title?: string;
  };
  if (!markdown) return Response.json({ error: "markdown is vereist" }, { status: 400 });

  const brand = brandId ? await db.brand.findUnique({ where: { id: brandId } }) : null;
  const html = brandedHtml(markdown, brand, title ?? "FYNN export");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="fynn-export-${Date.now()}.html"`,
    },
  });
}
