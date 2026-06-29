-- CreateTable
CREATE TABLE "SourceFile" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "textractJobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "bbox" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "phiOffsets" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceFile_jobId_idx" ON "SourceFile"("jobId");

-- CreateIndex
CREATE INDEX "SourceFile_textractJobId_idx" ON "SourceFile"("textractJobId");

-- CreateIndex
CREATE INDEX "Block_sourceFileId_idx" ON "Block"("sourceFileId");

-- CreateIndex
CREATE INDEX "Block_page_idx" ON "Block"("page");

-- AddForeignKey
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
