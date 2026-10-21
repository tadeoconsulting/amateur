-- CreateTable
CREATE TABLE "ClubFeeSettings" (
    "clubId" TEXT NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueDay" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubFeeSettings_pkey" PRIMARY KEY ("clubId")
);

-- CreateTable
CREATE TABLE "PlayerFeeSetting" (
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "monthlyFeeOverride" DECIMAL(10,2),
    "startMonth" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerFeeSetting_pkey" PRIMARY KEY ("playerId")
);

-- CreateTable
CREATE TABLE "MemberFee" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amountDue" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "feeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberFee_clubId_month_idx" ON "MemberFee"("clubId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MemberFee_playerId_clubId_month_key" ON "MemberFee"("playerId", "clubId", "month");

-- CreateIndex
CREATE INDEX "FeePayment_feeId_idx" ON "FeePayment"("feeId");

-- AddForeignKey
ALTER TABLE "ClubFeeSettings" ADD CONSTRAINT "ClubFeeSettings_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerFeeSetting" ADD CONSTRAINT "PlayerFeeSetting_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFee" ADD CONSTRAINT "MemberFee_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFee" ADD CONSTRAINT "MemberFee_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "MemberFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
