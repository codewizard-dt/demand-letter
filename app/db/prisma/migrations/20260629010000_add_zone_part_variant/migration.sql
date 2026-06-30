-- CreateEnum
CREATE TYPE "ZonePart" AS ENUM ('header', 'body', 'footer');

-- AlterTable
ALTER TABLE "zones" ADD COLUMN "part" "ZonePart";
ALTER TABLE "zones" ADD COLUMN "stationaryVariant" TEXT;
