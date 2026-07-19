-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "firstSeenAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "jobs_dedupeKey_idx" ON "jobs"("dedupeKey");
