-- AlterTable
ALTER TABLE "files" ADD COLUMN "contentHash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "files_jobId_contentHash_key" ON "files"("jobId", "contentHash");
