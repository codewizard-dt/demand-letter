/*
  Warnings:

  - You are about to drop the column `name` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `files` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FileRole" AS ENUM ('template', 'case_doc');

-- AlterTable
ALTER TABLE "files" DROP COLUMN "name",
DROP COLUMN "type",
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "role" "FileRole" NOT NULL;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "output" TEXT;
