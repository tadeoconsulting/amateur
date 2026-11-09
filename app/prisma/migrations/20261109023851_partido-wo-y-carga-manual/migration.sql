-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "manualEntry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "walkover" TEXT;
