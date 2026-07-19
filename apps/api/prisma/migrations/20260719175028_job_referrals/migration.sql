-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- DropIndex
DROP INDEX "jobs_embedding_hnsw_idx";

-- CreateTable
CREATE TABLE "job_referrals" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rawUrl" TEXT,
    "rawText" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "resultingJobId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_referrals_userId_idx" ON "job_referrals"("userId");

-- AddForeignKey
ALTER TABLE "job_referrals" ADD CONSTRAINT "job_referrals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
