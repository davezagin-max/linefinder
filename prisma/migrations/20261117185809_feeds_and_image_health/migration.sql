-- AlterTable
ALTER TABLE "images" ADD COLUMN     "brokenSince" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "feed_runs" (
    "id" TEXT NOT NULL,
    "network" "AffiliateNetwork" NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "offers" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "unmatched" INTEGER NOT NULL DEFAULT 0,
    "pricesUpserted" INTEGER NOT NULL DEFAULT 0,
    "imagesUpserted" INTEGER NOT NULL DEFAULT 0,
    "unmatchedSample" TEXT[],
    "error" TEXT,

    CONSTRAINT "feed_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feed_runs_network_startedAt_idx" ON "feed_runs"("network", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "images_productId_url_key" ON "images"("productId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "retailers_network_advertiserId_key" ON "retailers"("network", "advertiserId");

