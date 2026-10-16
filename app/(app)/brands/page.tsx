import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { BrandsAdmin } from "@/components/admin/brands-admin";

export default async function BrandsPage() {
  const admin = await requireAdmin();
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { agents: true, sources: true, templates: true } } },
  });
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Brands</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Whitelabel-laag: per brand CVI-kleuren, fonts, logo en tone-of-voice. Agents en exports nemen dit over.
      </p>
      <BrandsAdmin brands={brands} canEdit={!!admin} />
    </div>
  );
}
