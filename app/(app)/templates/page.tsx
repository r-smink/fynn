import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { TemplatesAdmin } from "@/components/admin/templates-admin";

export default async function TemplatesPage() {
  const admin = await requireAdmin();
  const [templates, brands] = await Promise.all([
    db.promptTemplate.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }],
      include: { brand: { select: { name: true } } },
    }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Prompt-templates</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Herbruikbare prompts voor marketingmateriaal — klik om in een nieuw gesprek te gebruiken.
      </p>
      <TemplatesAdmin templates={templates} brands={brands} canEdit={!!admin} />
    </div>
  );
}
