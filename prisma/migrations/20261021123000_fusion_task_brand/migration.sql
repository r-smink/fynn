-- AlterTable
ALTER TABLE "FusionTemplate" ADD COLUMN     "brandId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "brandId" TEXT;

-- CreateIndex
CREATE INDEX "FusionTemplate_brandId_idx" ON "FusionTemplate"("brandId");

-- CreateIndex
CREATE INDEX "Task_brandId_idx" ON "Task"("brandId");

-- AddForeignKey
ALTER TABLE "FusionTemplate" ADD CONSTRAINT "FusionTemplate_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
