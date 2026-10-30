-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('AYUDA', 'TERMINOS', 'POLITICAS');

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_kind_position_key" ON "ContentItem"("kind", "position");
