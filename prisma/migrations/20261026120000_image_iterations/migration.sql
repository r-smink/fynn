-- AlterTable
ALTER TABLE "ImageGeneration" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "ImageGeneration_parentId_idx" ON "ImageGeneration"("parentId");

-- AddForeignKey
ALTER TABLE "ImageGeneration" ADD CONSTRAINT "ImageGeneration_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ImageGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
