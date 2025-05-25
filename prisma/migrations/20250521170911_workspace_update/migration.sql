/*
  Warnings:

  - The primary key for the `attendees` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `attendees` table. All the data in the column will be lost.
  - The primary key for the `members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[memberId,eventId]` on the table `attendees` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `memberId` to the `attendees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `attendees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `workspaces` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InviteType" AS ENUM ('WORKSPACE', 'EVENT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVITATION_RECEIVED', 'WORKSPACE_MEMBER_JOINED');

-- DropForeignKey
ALTER TABLE "attendees" DROP CONSTRAINT "attendees_userId_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_userId_fkey";

-- AlterTable
ALTER TABLE "attendees" DROP CONSTRAINT "attendees_pkey",
DROP COLUMN "userId",
ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "memberId" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL,
ALTER COLUMN "role" DROP NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'WAITING',
ADD CONSTRAINT "attendees_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "members" DROP CONSTRAINT "members_pkey",
ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" INTEGER NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "preferedDanceRole" "DanceRole",
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "createdById" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "metadata" JSONB NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "type" "InviteType" NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "token" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "workspaceId" INTEGER,
    "inviterId" INTEGER NOT NULL,
    "inviteeId" INTEGER,
    "memberSeatId" INTEGER,
    "eventId" INTEGER,
    "attendeeSeatId" INTEGER,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_memberSeatId_key" ON "invitations"("memberSeatId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_attendeeSeatId_key" ON "invitations"("attendeeSeatId");

-- CreateIndex
CREATE UNIQUE INDEX "attendees_memberId_eventId_key" ON "attendees"("memberId", "eventId");

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_memberSeatId_fkey" FOREIGN KEY ("memberSeatId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_attendeeSeatId_fkey" FOREIGN KEY ("attendeeSeatId") REFERENCES "attendees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
