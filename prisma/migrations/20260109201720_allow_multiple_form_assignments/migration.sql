-- CreateEnum
CREATE TYPE "FormCategory" AS ENUM ('GENERAL', 'RELEASE', 'EVENT', 'MEDICAL');

-- AlterEnum
ALTER TYPE "FormFieldType" ADD VALUE 'SECTION';

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "category" "FormCategory" NOT NULL DEFAULT 'GENERAL';
