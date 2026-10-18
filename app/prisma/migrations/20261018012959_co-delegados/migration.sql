-- CreateTable
CREATE TABLE "ClubDelegate" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubDelegate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoDelegateInvitation" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoDelegateInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubDelegate_clubId_idx" ON "ClubDelegate"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubDelegate_clubId_userId_key" ON "ClubDelegate"("clubId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubDelegate_userId_key" ON "ClubDelegate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoDelegateInvitation_token_key" ON "CoDelegateInvitation"("token");

-- CreateIndex
CREATE INDEX "CoDelegateInvitation_clubId_idx" ON "CoDelegateInvitation"("clubId");

-- AddForeignKey
ALTER TABLE "ClubDelegate" ADD CONSTRAINT "ClubDelegate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubDelegate" ADD CONSTRAINT "ClubDelegate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubDelegate" ADD CONSTRAINT "ClubDelegate_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoDelegateInvitation" ADD CONSTRAINT "CoDelegateInvitation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoDelegateInvitation" ADD CONSTRAINT "CoDelegateInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoDelegateInvitation" ADD CONSTRAINT "CoDelegateInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
