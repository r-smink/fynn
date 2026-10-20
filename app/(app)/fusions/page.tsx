import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FusionsAdmin } from "@/components/fusions-admin";

export default async function FusionsPage() {
  const user = await requireUser();
  const fusions = await db.fusionTemplate.findMany({
    where: { userId: user!.id },
    orderBy: { name: "asc" },
  });
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Fusion-templates</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Combineer een lead-model met 1–2 sidekick-modellen: sidekicks leveren input, het lead-model
        schrijft één coherent antwoord. Kies ze daarna in de model-picker van een gesprek.
      </p>
      <FusionsAdmin fusions={fusions} />
    </div>
  );
}
