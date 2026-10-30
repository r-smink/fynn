import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { referenceSourceWhere } from "@/lib/scope";

/** Galerij-afbeeldingen uit de kennisbank, te gebruiken als referentie in de beeldstudio. */
export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const assets = await db.knowledgeAsset.findMany({
    where: { contentType: { startsWith: "image/" }, source: await referenceSourceWhere(user) },
    select: { id: true, filename: true, caption: true, editPolicy: true, source: { select: { id: true, name: true } } },
    // Gegroepeerd per kennisbank-map (bron), daarbinnen op bestandsnaam
    orderBy: [{ source: { name: "asc" } }, { filename: "asc" }],
    take: 500,
  });
  return Response.json({ assets });
}
