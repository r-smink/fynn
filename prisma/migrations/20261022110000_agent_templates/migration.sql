-- CreateTable
CREATE TABLE "_AgentToPromptTemplate" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgentToPromptTemplate_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AgentToPromptTemplate_B_index" ON "_AgentToPromptTemplate"("B");

-- AddForeignKey
ALTER TABLE "_AgentToPromptTemplate" ADD CONSTRAINT "_AgentToPromptTemplate_A_fkey" FOREIGN KEY ("A") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgentToPromptTemplate" ADD CONSTRAINT "_AgentToPromptTemplate_B_fkey" FOREIGN KEY ("B") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
