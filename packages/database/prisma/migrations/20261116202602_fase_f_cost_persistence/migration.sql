-- AlterTable
ALTER TABLE "UsageRecord" ADD COLUMN     "imagesGenerated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requests" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "websiteProjectId" TEXT;
