import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isAdminRole } from "@/lib/roles";
import { visibleOwnedWhere } from "@/lib/scope";
import { ImageStudio } from "@/components/image-studio";

export default async function ImagesPage() {
  const user = await requireUser();
  const [styles, images] = await Promise.all([
    db.imageStyle.findMany({ where: await visibleOwnedWhere(user!), orderBy: { name: "asc" } }),
    db.imageGeneration.findMany({ where: { userId: user!.id }, orderBy: { createdAt: "desc" }, take: 60 }),
  ]);
  return (
    <div className="h-full overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
      <h1 className="mb-1 text-2xl font-bold">Beeldstudio</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Beschrijf je beeld, kies een stijl en gebruik eventueel afbeeldingen uit de kennisbank als referentie.
      </p>
      <ImageStudio
        customStyles={styles.map(({ id, name, emoji, prompt }) => ({ id, name, emoji, prompt }))}
        initialImages={images.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))}
        defaultModel={env.imageModel}
        isAdmin={isAdminRole(user!.role)}
      />
    </div>
  );
}
