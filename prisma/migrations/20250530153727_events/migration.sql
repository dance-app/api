/*
  Warnings:

  - You are about to drop the column `memberId` on the `attendees` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `attendees` table. All the data in the column will be lost.
  - You are about to drop the column `organizerId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `rule` on the `events` table. All the data in the column will be lost.
  - Added the required column `userId` to the `attendees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'WORKSPACE_ONLY', 'INVITATION_ONLY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'PENDING', 'DECLINED');

-- CreateEnum
CREATE TYPE "AttendanceAction" AS ENUM ('REGISTERED', 'CANCELLED', 'DECLINED', 'INVITED', 'REMOVED', 'STATUS_CHANGED');

-- DropForeignKey
ALTER TABLE "attendees" DROP CONSTRAINT "attendees_memberId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_organizerId_fkey";

-- DropIndex
DROP INDEX "attendees_memberId_eventId_key";

-- AlterTable
ALTER TABLE "attendees" DROP COLUMN "memberId",
DROP COLUMN "type",
ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "organizerId",
DROP COLUMN "rule",
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "createdById" INTEGER NOT NULL,
ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentEventId" INTEGER,
ADD COLUMN     "rrule" TEXT,
ADD COLUMN     "visibility" "EventVisibility" NOT NULL DEFAULT 'WORKSPACE_ONLY',
ADD COLUMN     "workspaceId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "event_organizers" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "event_organizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_history" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attendeeId" INTEGER NOT NULL,
    "action" "AttendanceAction" NOT NULL,
    "previousStatus" "AttendanceStatus",
    "newStatus" "AttendanceStatus",
    "performedById" INTEGER NOT NULL,

    CONSTRAINT "attendance_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_organizers_eventId_userId_key" ON "event_organizers"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_history_attendeeId_key" ON "attendance_history"("attendeeId");

-- AddForeignKey
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_history" ADD CONSTRAINT "attendance_history_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_history" ADD CONSTRAINT "attendance_history_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
