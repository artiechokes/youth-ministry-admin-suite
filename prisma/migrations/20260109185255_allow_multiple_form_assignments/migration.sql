-- DropIndex
DROP INDEX "FormAssignment_formId_teenId_key";

-- AlterTable
ALTER TABLE "FormAssignment" ADD COLUMN     "completedAt" TIMESTAMP(3);
