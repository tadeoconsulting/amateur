-- CreateTable
CREATE TABLE "TrainingPlace" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSchedule" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "categoryId" TEXT,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "placeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "categoryId" TEXT,
    "scheduleId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "placeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'programada',
    "movedManually" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingPlace_clubId_idx" ON "TrainingPlace"("clubId");

-- CreateIndex
CREATE INDEX "TrainingSchedule_clubId_idx" ON "TrainingSchedule"("clubId");

-- CreateIndex
CREATE INDEX "TrainingSession_clubId_startsAt_idx" ON "TrainingSession"("clubId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSession_scheduleId_startsAt_key" ON "TrainingSession"("scheduleId", "startsAt");

-- CreateIndex
CREATE INDEX "Attendance_playerId_idx" ON "Attendance"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sessionId_playerId_key" ON "Attendance"("sessionId", "playerId");

-- AddForeignKey
ALTER TABLE "TrainingPlace" ADD CONSTRAINT "TrainingPlace_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSchedule" ADD CONSTRAINT "TrainingSchedule_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSchedule" ADD CONSTRAINT "TrainingSchedule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TeamCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSchedule" ADD CONSTRAINT "TrainingSchedule_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "TrainingPlace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TeamCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TrainingSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "TrainingPlace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
