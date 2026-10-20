-- CreateTable
CREATE TABLE "FusionTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "leadModel" TEXT NOT NULL,
    "leadEffort" TEXT NOT NULL DEFAULT '',
    "sidekick1" TEXT NOT NULL DEFAULT '',
    "sidekick2" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FusionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FusionTemplate_userId_idx" ON "FusionTemplate"("userId");

-- AddForeignKey
ALTER TABLE "FusionTemplate" ADD CONSTRAINT "FusionTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
