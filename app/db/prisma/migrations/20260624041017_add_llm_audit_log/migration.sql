-- CreateEnum
CREATE TYPE "LlmFeature" AS ENUM ('zone_classification', 'case_extraction', 'medical_narrative', 'refinement', 'skeleton_generation');

-- CreateTable
CREATE TABLE "LlmAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "LlmFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmAuditLog_userId_idx" ON "LlmAuditLog"("userId");

-- CreateIndex
CREATE INDEX "LlmAuditLog_feature_createdAt_idx" ON "LlmAuditLog"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "LlmAuditLog_createdAt_idx" ON "LlmAuditLog"("createdAt");
