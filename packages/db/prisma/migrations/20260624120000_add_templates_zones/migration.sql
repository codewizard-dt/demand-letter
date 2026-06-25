-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('boilerplate_verbatim', 'variable_populated');

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "s3KeyOriginal" TEXT NOT NULL,
    "s3KeyTagged" TEXT,
    "slotCount" INTEGER,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "zoneIndex" INTEGER NOT NULL,
    "type" "ZoneType",
    "runPath" JSONB NOT NULL,
    "textContent" TEXT NOT NULL,
    "suggestedFieldName" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "templates_jobId_idx" ON "templates"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "zones_templateId_zoneIndex_key" ON "zones"("templateId", "zoneIndex");

-- CreateIndex
CREATE INDEX "zones_templateId_idx" ON "zones"("templateId");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
