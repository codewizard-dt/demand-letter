-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "outputS3Key" TEXT;

-- CreateTable
CREATE TABLE "refinements" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'all',
    "beforeText" TEXT NOT NULL,
    "afterText" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refinements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refinements_jobId_idx" ON "refinements"("jobId");

-- CreateIndex
CREATE INDEX "refinements_createdAt_idx" ON "refinements"("createdAt");

-- AddForeignKey
ALTER TABLE "refinements" ADD CONSTRAINT "refinements_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
