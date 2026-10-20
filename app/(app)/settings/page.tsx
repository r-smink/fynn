import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBranding } from "@/lib/branding";
import { env } from "@/lib/env";
import { SettingsAdmin } from "@/components/admin/settings-admin";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/chat");

  const [modelCount, chunkCount, sourceCount, branding] = await Promise.all([
    db.modelEntry.count(),
    db.knowledgeChunk.count(),
    db.knowledgeSource.count(),
    getBranding(),
  ]);

  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Instellingen</h1>
      <p className="mb-6 text-sm text-muted-foreground">Platform-configuratie en OpenRouter-catalogus.</p>
      <SettingsAdmin
        modelCount={modelCount}
        chunkCount={chunkCount}
        sourceCount={sourceCount}
        openRouterConfigured={!!process.env.OPENROUTER_API_KEY}
        portalConfigured={!!(process.env.FYNDABLE_WP_USER && process.env.FYNDABLE_WP_APP_PASSWORD)}
        imageModel={env.imageModel}
        imageModelIsDefault={!process.env.IMAGE_MODEL}
        embeddingModel={env.embeddingModel}
        embeddingModelIsDefault={!process.env.EMBEDDING_MODEL}
        branding={branding}
      />
    </div>
  );
}
