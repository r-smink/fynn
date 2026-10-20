import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { KnowledgeAdmin } from "@/components/admin/knowledge-admin";

export default async function KnowledgePage() {
  const admin = await requireAdmin();
  const [sources, brands] = await Promise.all([
    db.knowledgeSource.findMany({
      orderBy: { createdAt: "asc" },
      include: { brand: { select: { id: true, name: true } } },
    }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Kennisbank</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Bronnen die agents via RAG doorzoeken: geüploade bestanden en afbeeldingen, websites en git-repos.
      </p>
      <KnowledgeAdmin sources={sources} brands={brands} canEdit={!!admin} />
    </div>
  );
}
