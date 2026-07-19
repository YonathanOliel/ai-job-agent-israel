-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "atsType" TEXT NOT NULL,
    "atsToken" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "origin" TEXT NOT NULL DEFAULT 'discovered',
    "lastJobCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_atsType_enabled_idx" ON "companies"("atsType", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "companies_atsType_atsToken_key" ON "companies"("atsType", "atsToken");
