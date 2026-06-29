-- CreateTable
CREATE TABLE "CollaborativeChange" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "contentDelta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollaborativeChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollaborativeChange_jobId_idx" ON "CollaborativeChange"("jobId");

-- CreateIndex
CREATE INDEX "CollaborativeChange_jobId_createdAt_idx" ON "CollaborativeChange"("jobId", "createdAt");

-- AddForeignKey
ALTER TABLE "CollaborativeChange" ADD CONSTRAINT "CollaborativeChange_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
