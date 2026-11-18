-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('SKI', 'SNOWBOARD');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('SKI', 'SNOWBOARD', 'SKI_BINDING', 'SNOWBOARD_BINDING', 'SKI_BOOT', 'SNOWBOARD_BOOT');

-- CreateEnum
CREATE TYPE "Ability" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "SkiCategory" AS ENUM ('FRONTSIDE', 'ALL_MOUNTAIN', 'ALL_MOUNTAIN_WIDE', 'POWDER', 'FREESTYLE_PARK', 'FREERIDE_BIG_MOUNTAIN', 'TOURING');

-- CreateEnum
CREATE TYPE "SnowboardCategory" AS ENUM ('ALL_MOUNTAIN', 'FREESTYLE_PARK', 'FREERIDE', 'POWDER_SURF', 'SPLITBOARD');

-- CreateEnum
CREATE TYPE "SkiRocker" AS ENUM ('FULL_CAMBER', 'TIP_ROCKER_CAMBER', 'TIP_TAIL_ROCKER_CAMBER', 'FULL_ROCKER', 'FLAT_ROCKER');

-- CreateEnum
CREATE TYPE "BoardProfile" AS ENUM ('CAMBER', 'HYBRID_CAMBER', 'HYBRID_ROCKER', 'FLAT_ROCKER', 'FULL_ROCKER', 'FLAT');

-- CreateEnum
CREATE TYPE "BoardShape" AS ENUM ('TRUE_TWIN', 'DIRECTIONAL_TWIN', 'DIRECTIONAL', 'TAPERED_DIRECTIONAL');

-- CreateEnum
CREATE TYPE "TwinTip" AS ENUM ('NONE', 'EARLY_RISE_TAIL', 'FULL_TWIN');

-- CreateEnum
CREATE TYPE "Laminate" AS ENUM ('NONE', 'PARTIAL_METAL', 'FULL_METAL', 'CARBON_FIBERGLASS', 'FIBERGLASS');

-- CreateEnum
CREATE TYPE "MountStyle" AS ENUM ('TRADITIONAL', 'PROGRESSIVE', 'CENTERED');

-- CreateEnum
CREATE TYPE "SoleNorm" AS ENUM ('ALPINE_ISO5355', 'GRIPWALK', 'WTR', 'TOURING_ISO9523', 'TECH_INSERTS');

-- CreateEnum
CREATE TYPE "SkiBindingType" AS ENUM ('ALPINE', 'HYBRID_TOURING', 'TECH', 'FRAME');

-- CreateEnum
CREATE TYPE "InsertPattern" AS ENUM ('FOUR_X_FOUR', 'TWO_X_FOUR', 'CHANNEL');

-- CreateEnum
CREATE TYPE "BoardBindingEntry" AS ENUM ('STRAP', 'REAR_ENTRY', 'STEP_ON');

-- CreateEnum
CREATE TYPE "BootLacing" AS ENUM ('TRADITIONAL', 'SPEED_LACE', 'SINGLE_BOA', 'DOUBLE_BOA', 'HYBRID');

-- CreateEnum
CREATE TYPE "ImageView" AS ENUM ('BASE', 'TOPSHEET', 'PROFILE', 'DETAIL', 'LIFESTYLE');

-- CreateEnum
CREATE TYPE "ImageSource" AS ENUM ('MANUFACTURER_PRESS_KIT', 'AFFILIATE_FEED');

-- CreateEnum
CREATE TYPE "AffiliateNetwork" AS ENUM ('AVANTLINK', 'CJ', 'IMPACT', 'RAKUTEN', 'MOCK');

-- CreateEnum
CREATE TYPE "GearCondition" AS ENUM ('LIKE_NEW', 'GOOD', 'WORN', 'NEEDS_REPLACING');

-- CreateEnum
CREATE TYPE "GearIntent" AS ENUM ('KEEP', 'REPLACE', 'UNSURE');

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "durabilityScore" INTEGER NOT NULL,
    "warrantyScore" INTEGER NOT NULL,
    "reviewConsensusScore" INTEGER NOT NULL,
    "reputationScore" INTEGER NOT NULL,
    "warrantyYears" INTEGER,
    "reputationIsEstimate" BOOLEAN NOT NULL DEFAULT true,
    "reputationNotes" TEXT,
    "reputationReviewedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "brandId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelYear" INTEGER NOT NULL,
    "lineageKey" TEXT,
    "msrpCents" INTEGER NOT NULL,
    "womensSpecific" BOOLEAN NOT NULL DEFAULT false,
    "abilityMin" "Ability" NOT NULL,
    "abilityMax" "Ability" NOT NULL,
    "overview" TEXT NOT NULL,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "discontinued" BOOLEAN NOT NULL DEFAULT false,
    "specsSource" TEXT NOT NULL DEFAULT 'seed:unverified',
    "specsVerifiedAt" TIMESTAMP(3),
    "reviewScoreAgg" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skis" (
    "productId" TEXT NOT NULL,
    "category" "SkiCategory" NOT NULL,
    "rocker" "SkiRocker" NOT NULL,
    "flex" DOUBLE PRECISION NOT NULL,
    "core" TEXT NOT NULL,
    "laminate" "Laminate" NOT NULL,
    "twinTip" "TwinTip" NOT NULL,
    "mountPointCm" DOUBLE PRECISION,
    "mountStyle" "MountStyle" NOT NULL,
    "refTipMm" INTEGER NOT NULL,
    "refWaistMm" INTEGER NOT NULL,
    "refTailMm" INTEGER NOT NULL,
    "refRadiusM" DOUBLE PRECISION NOT NULL,
    "refLengthCm" INTEGER NOT NULL,

    CONSTRAINT "skis_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "ski_sizes" (
    "id" TEXT NOT NULL,
    "skiId" TEXT NOT NULL,
    "lengthCm" INTEGER NOT NULL,
    "tipMm" INTEGER,
    "waistMm" INTEGER NOT NULL,
    "tailMm" INTEGER,
    "radiusM" DOUBLE PRECISION,
    "weightG" INTEGER,

    CONSTRAINT "ski_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snowboards" (
    "productId" TEXT NOT NULL,
    "category" "SnowboardCategory" NOT NULL,
    "profile" "BoardProfile" NOT NULL,
    "shape" "BoardShape" NOT NULL,
    "flex" DOUBLE PRECISION NOT NULL,
    "core" TEXT NOT NULL,
    "laminate" "Laminate" NOT NULL,
    "setbackMm" INTEGER NOT NULL DEFAULT 0,
    "taperMm" INTEGER NOT NULL DEFAULT 0,
    "insertPattern" "InsertPattern" NOT NULL,
    "baseType" TEXT,

    CONSTRAINT "snowboards_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "board_sizes" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lengthCm" DOUBLE PRECISION NOT NULL,
    "waistWidthMm" INTEGER NOT NULL,
    "isWide" BOOLEAN NOT NULL DEFAULT false,
    "effectiveEdgeMm" INTEGER,
    "sidecutRadiusM" DOUBLE PRECISION,
    "riderWeightMinKg" INTEGER,
    "riderWeightMaxKg" INTEGER,
    "weightG" INTEGER,

    CONSTRAINT "board_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ski_bindings" (
    "productId" TEXT NOT NULL,
    "type" "SkiBindingType" NOT NULL,
    "dinMin" DOUBLE PRECISION NOT NULL,
    "dinMax" DOUBLE PRECISION NOT NULL,
    "brakeWidthsMm" INTEGER[],
    "soleCompat" "SoleNorm"[],
    "hasWalkMode" BOOLEAN NOT NULL DEFAULT false,
    "stackHeightMm" INTEGER,
    "weightG" INTEGER,

    CONSTRAINT "ski_bindings_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "snowboard_bindings" (
    "productId" TEXT NOT NULL,
    "flex" DOUBLE PRECISION NOT NULL,
    "responsiveness" DOUBLE PRECISION NOT NULL,
    "entry" "BoardBindingEntry" NOT NULL,
    "mountCompat" "InsertPattern"[],
    "sizeRanges" JSONB NOT NULL,
    "stepOnSystem" TEXT,

    CONSTRAINT "snowboard_bindings_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "ski_boots" (
    "productId" TEXT NOT NULL,
    "flex" INTEGER NOT NULL,
    "lastWidthMm" INTEGER NOT NULL,
    "soleNorm" "SoleNorm" NOT NULL,
    "mondoMin" DOUBLE PRECISION NOT NULL,
    "mondoMax" DOUBLE PRECISION NOT NULL,
    "hasWalkMode" BOOLEAN NOT NULL DEFAULT false,
    "heatMoldable" BOOLEAN NOT NULL DEFAULT true,
    "weightG" INTEGER,

    CONSTRAINT "ski_boots_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "snowboard_boots" (
    "productId" TEXT NOT NULL,
    "flex" DOUBLE PRECISION NOT NULL,
    "lacing" "BootLacing" NOT NULL,
    "usSizeMin" DOUBLE PRECISION NOT NULL,
    "usSizeMax" DOUBLE PRECISION NOT NULL,
    "wideAvailable" BOOLEAN NOT NULL DEFAULT false,
    "stepOnSystem" TEXT,
    "reducedFootprint" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "snowboard_boots_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "review_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homepage" TEXT NOT NULL,
    "credibility" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "review_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_scores" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rawScore" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "modelYearReviewed" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "pros" TEXT[],
    "cons" TEXT[],
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "view" "ImageView" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" "ImageSource" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "licenseNote" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "network" "AffiliateNetwork" NOT NULL,
    "advertiserId" TEXT,
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "retailers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailer_prices" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL DEFAULT '',
    "feedSku" TEXT,
    "priceCents" INTEGER NOT NULL,
    "listPriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "inStock" BOOLEAN NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailer_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "rider_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "surveyVersion" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "regionKey" TEXT NOT NULL,
    "ability" "Ability" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owned_gear" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "productId" TEXT,
    "brandText" TEXT,
    "modelText" TEXT,
    "modelYear" INTEGER,
    "sizeLabel" TEXT,
    "approxWaistMm" INTEGER,
    "approxFlex" DOUBLE PRECISION,
    "soleNorm" "SoleNorm",
    "brakeWidthMm" INTEGER,
    "purchasedYear" INTEGER,
    "condition" "GearCondition" NOT NULL DEFAULT 'GOOD',
    "intent" "GearIntent" NOT NULL DEFAULT 'KEEP',
    "likes" TEXT[],
    "dislikes" TEXT[],
    "fitIssues" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owned_gear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_runs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "inputSnapshot" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "weightsVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_items" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "recommendedSize" TEXT,
    "tags" TEXT[],

    CONSTRAINT "recommendation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_kind_discontinued_idx" ON "products"("kind", "discontinued");

-- CreateIndex
CREATE UNIQUE INDEX "products_brandId_model_modelYear_key" ON "products"("brandId", "model", "modelYear");

-- CreateIndex
CREATE INDEX "skis_category_idx" ON "skis"("category");

-- CreateIndex
CREATE INDEX "skis_refWaistMm_idx" ON "skis"("refWaistMm");

-- CreateIndex
CREATE UNIQUE INDEX "ski_sizes_skiId_lengthCm_key" ON "ski_sizes"("skiId", "lengthCm");

-- CreateIndex
CREATE INDEX "snowboards_category_idx" ON "snowboards"("category");

-- CreateIndex
CREATE UNIQUE INDEX "board_sizes_boardId_label_key" ON "board_sizes"("boardId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "review_sources_name_key" ON "review_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "review_scores_productId_sourceId_modelYearReviewed_key" ON "review_scores"("productId", "sourceId", "modelYearReviewed");

-- CreateIndex
CREATE INDEX "images_productId_isPrimary_idx" ON "images"("productId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "retailers_slug_key" ON "retailers"("slug");

-- CreateIndex
CREATE INDEX "retailer_prices_productId_checkedAt_idx" ON "retailer_prices"("productId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "retailer_prices_productId_retailerId_sizeLabel_key" ON "retailer_prices"("productId", "retailerId", "sizeLabel");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "rider_profiles_userId_idx" ON "rider_profiles"("userId");

-- CreateIndex
CREATE INDEX "owned_gear_userId_kind_idx" ON "owned_gear"("userId", "kind");

-- CreateIndex
CREATE INDEX "recommendation_runs_profileId_createdAt_idx" ON "recommendation_runs"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "recommendation_items_runId_slot_rank_idx" ON "recommendation_items"("runId", "slot", "rank");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skis" ADD CONSTRAINT "skis_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ski_sizes" ADD CONSTRAINT "ski_sizes_skiId_fkey" FOREIGN KEY ("skiId") REFERENCES "skis"("productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snowboards" ADD CONSTRAINT "snowboards_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_sizes" ADD CONSTRAINT "board_sizes_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "snowboards"("productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ski_bindings" ADD CONSTRAINT "ski_bindings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snowboard_bindings" ADD CONSTRAINT "snowboard_bindings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ski_boots" ADD CONSTRAINT "ski_boots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snowboard_boots" ADD CONSTRAINT "snowboard_boots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_scores" ADD CONSTRAINT "review_scores_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_scores" ADD CONSTRAINT "review_scores_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "review_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_prices" ADD CONSTRAINT "retailer_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailer_prices" ADD CONSTRAINT "retailer_prices_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_gear" ADD CONSTRAINT "owned_gear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_gear" ADD CONSTRAINT "owned_gear_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_runs" ADD CONSTRAINT "recommendation_runs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "rider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "recommendation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
