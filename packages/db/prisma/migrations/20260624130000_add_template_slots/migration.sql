-- CreateTable
CREATE TABLE "template_slots" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "slotName" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "template_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_slots_templateId_slotName_key" ON "template_slots"("templateId", "slotName");

-- CreateIndex
CREATE INDEX "template_slots_templateId_idx" ON "template_slots"("templateId");

-- AddForeignKey
ALTER TABLE "template_slots" ADD CONSTRAINT "template_slots_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
