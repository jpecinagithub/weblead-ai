-- AlterTable
ALTER TABLE "CRMActivity" ADD COLUMN     "dueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EmailDraft" ADD COLUMN     "legalBasis" TEXT,
ADD COLUMN     "legalReason" TEXT;
