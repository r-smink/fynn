import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FusionsAdmin } from "@/components/fusions-admin";
import { isAdminRole } from "@/lib/roles";
import { visibleOwnedWhere } from "@/lib/scope";

export default async function FusionsPage() {
  const user = await requireUser();
  const isAdmin = isAdminRole(user!.role);
  const [fusions, brands] = await Promise.all([
    db.fusionTemplate.findMany({
      where: await visibleOwnedWhere(user!),
      orderBy: { name: "asc" },
      include: { brand: { select: { id: true, name: true } } },
    }),
    isAdmin ? db.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Fusion-templates</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Combineer een lead-model met 1–2 sidekick-modellen: sidekicks leveren input, het lead-model
        schrijft één coherent antwoord. Kies ze daarna in de model-picker van een gesprek.
      </p>
      <FusionsAdmin fusions={fusions} brands={brands} isAdmin={isAdmin} />
    </div>
  );
}
