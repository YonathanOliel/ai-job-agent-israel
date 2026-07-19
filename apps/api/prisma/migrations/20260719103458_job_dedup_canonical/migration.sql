-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'DUPLICATE';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "canonicalId" UUID;
