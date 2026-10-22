-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Conversation_archived_pinned_updatedAt_idx" ON "Conversation"("archived", "pinned", "updatedAt");
