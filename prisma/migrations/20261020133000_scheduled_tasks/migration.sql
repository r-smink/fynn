-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentId" TEXT,
    "model" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL,
    "schedule" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT 'chat_run',
    "actionConfig" TEXT NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "output" TEXT NOT NULL DEFAULT '',
    "resultUrl" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE INDEX "Task_enabled_lastRunAt_idx" ON "Task"("enabled", "lastRunAt");

-- CreateIndex
CREATE INDEX "TaskRun_taskId_createdAt_idx" ON "TaskRun"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRun" ADD CONSTRAINT "TaskRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

