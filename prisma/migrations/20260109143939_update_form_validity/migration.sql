/*
  Warnings:

  - You are about to drop the column `validForDays` on the `Form` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FormValidityUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS');

-- AlterTable
ALTER TABLE "Form" DROP COLUMN "validForDays",
ADD COLUMN     "validForUnit" "FormValidityUnit",
ADD COLUMN     "validForValue" INTEGER,
ADD COLUMN     "validUntil" TIMESTAMP(3);
