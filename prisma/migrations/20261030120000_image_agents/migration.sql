-- CreateTable
CREATE TABLE "ImageAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🤖',
    "instructions" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ImageAgentToKnowledgeSource" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ImageAgentToKnowledgeSource_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "ImageAgent_userId_idx" ON "ImageAgent"("userId");

-- CreateIndex
CREATE INDEX "ImageAgent_brandId_idx" ON "ImageAgent"("brandId");

-- CreateIndex
CREATE INDEX "_ImageAgentToKnowledgeSource_B_index" ON "_ImageAgentToKnowledgeSource"("B");

-- AddForeignKey
ALTER TABLE "ImageAgent" ADD CONSTRAINT "ImageAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAgent" ADD CONSTRAINT "ImageAgent_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImageAgentToKnowledgeSource" ADD CONSTRAINT "_ImageAgentToKnowledgeSource_A_fkey" FOREIGN KEY ("A") REFERENCES "ImageAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImageAgentToKnowledgeSource" ADD CONSTRAINT "_ImageAgentToKnowledgeSource_B_fkey" FOREIGN KEY ("B") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
