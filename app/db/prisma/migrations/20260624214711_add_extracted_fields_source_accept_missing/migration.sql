-- AlterTable
ALTER TABLE "extracted_fields" ADD COLUMN     "acceptMissing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT;
