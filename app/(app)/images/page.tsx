import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isAdminRole } from "@/lib/roles";
import { referenceSourceWhere, visibleOwnedWhere } from "@/lib/scope";
import { imageAgentSelect } from "@/lib/image-agent";
import { libraryView } from "@/lib/image-library";
import { ImageStudio } from "@/components/image-studio";

export default async function ImagesPage() {
  const user = await requireUser();
  const isAdmin = isAdminRole(user!.role);
  const [styles, library, brands, agents, sources] = await Promise.all([
    db.imageStyle.findMany({ where: await visibleOwnedWhere(user!), orderBy: { name: "asc" } }),
    libraryView(user!, null),
    isAdmin ? db.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    db.imageAgent.findMany({ where: await visibleOwnedWhere(user!), select: imageAgentSelect, orderBy: { name: "asc" } }),
    db.knowledgeSource.findMany({ where: await referenceSourceWhere(user!), select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="h-full overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
      <h1 className="mb-1 text-2xl font-bold">Beeldstudio</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Beschrijf je beeld, kies een stijl en upload eventueel een eigen afbeelding of kies er een uit de kennisbank
        om te bewerken of als referentie. Kies een beeld-agent om je prompt eerst met de kennisbank te laten uitwerken. Open een beeld om erop door te prompten. Orden je beelden in mappen;
        brand-mappen zijn gedeeld met de hele brand.
      </p>
      <ImageStudio
        customStyles={styles.map(({ id, name, emoji, prompt }) => ({ id, name, emoji, prompt }))}
        initialLibrary={{
          ...library!,
          images: library!.images.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
        }}
        defaultModel={env.imageModel}
        isAdmin={isAdmin}
        brands={brands}
        initialAgents={agents.map(({ id, name, emoji, instructions, sources: s }) => ({ id, name, emoji, instructions, sources: s }))}
        knowledgeSources={sources}
      />
    </div>
  );
}
