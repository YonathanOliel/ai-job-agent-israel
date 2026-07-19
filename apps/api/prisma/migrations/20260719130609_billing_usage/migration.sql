-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "metric" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_records_organizationId_period_idx" ON "usage_records"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_organizationId_metric_period_key" ON "usage_records"("organizationId", "metric", "period");
