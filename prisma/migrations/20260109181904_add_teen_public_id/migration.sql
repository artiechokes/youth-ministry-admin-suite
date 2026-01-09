/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `Teen` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Teen" ADD COLUMN     "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Teen_publicId_key" ON "Teen"("publicId");
