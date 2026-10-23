
-- AlterTable
ALTER TABLE "ImageGeneration" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "ImageFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImageFolder_userId_idx" ON "ImageFolder"("userId");

-- CreateIndex
CREATE INDEX "ImageFolder_brandId_idx" ON "ImageFolder"("brandId");

-- CreateIndex
CREATE INDEX "ImageFolder_parentId_idx" ON "ImageFolder"("parentId");

-- CreateIndex
CREATE INDEX "ImageGeneration_folderId_createdAt_idx" ON "ImageGeneration"("folderId", "createdAt");

-- AddForeignKey
ALTER TABLE "ImageGeneration" ADD CONSTRAINT "ImageGeneration_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageGeneration" ADD CONSTRAINT "ImageGeneration_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ImageFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageFolder" ADD CONSTRAINT "ImageFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageFolder" ADD CONSTRAINT "ImageFolder_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageFolder" ADD CONSTRAINT "ImageFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ImageFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

