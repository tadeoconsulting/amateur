-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "seasonId" TEXT,
ADD COLUMN     "seasonStage" TEXT;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "finalFormat" TEXT NOT NULL,
    "finalTeams" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Season_organizerId_idx" ON "Season"("organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_organizerId_slug_key" ON "Season"("organizerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_seasonId_seasonStage_key" ON "Tournament"("seasonId", "seasonStage");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
