-- CreateTable
CREATE TABLE "extracted_fields" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT,
    "blockIds" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isNull" BOOLEAN NOT NULL DEFAULT false,
    "nullReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extracted_fields_jobId_idx" ON "extracted_fields"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_fields_jobId_fieldName_key" ON "extracted_fields"("jobId", "fieldName");

-- AddForeignKey
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
