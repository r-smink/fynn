import { requireUser } from "@/lib/auth";
import { getFile } from "@/lib/storage";

type Ctx = { params: Promise<{ name: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await ctx.params;
  if (!/^[a-z0-9\-_.]+\.png$/i.test(name)) {
    return Response.json({ error: "Ongeldige naam" }, { status: 400 });
  }
  const buf = await getFile(`images/${name}`);
  if (!buf) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=31536000" },
  });
}
