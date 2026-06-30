ALTER TABLE "LlmAuditLog"
ADD COLUMN "jobId" TEXT,
ADD COLUMN "requestId" TEXT,
ADD COLUMN "traceId" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'success',
ADD COLUMN "error" TEXT;

CREATE INDEX "LlmAuditLog_jobId_idx" ON "LlmAuditLog"("jobId");
CREATE INDEX "LlmAuditLog_traceId_idx" ON "LlmAuditLog"("traceId");
