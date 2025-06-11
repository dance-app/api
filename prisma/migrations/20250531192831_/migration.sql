/*
  Warnings:

  - The values [INVITED,STATUS_CHANGED] on the enum `AttendanceAction` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `newStatus` on the `attendance_history` table. All the data in the column will be lost.
  - You are about to drop the column `previousStatus` on the `attendance_history` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `attendees` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventId,userId,guestEmail]` on the table `attendees` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AttendanceAction_new" AS ENUM ('REGISTERED', 'CANCELLED', 'DECLINED', 'REMOVED');
ALTER TABLE "attendance_history" ALTER COLUMN "action" TYPE "AttendanceAction_new" USING ("action"::text::"AttendanceAction_new");
ALTER TYPE "AttendanceAction" RENAME TO "AttendanceAction_old";
ALTER TYPE "AttendanceAction_new" RENAME TO "AttendanceAction";
DROP TYPE "AttendanceAction_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "attendance_history" DROP CONSTRAINT "attendance_history_attendeeId_fkey";

-- DropForeignKey
ALTER TABLE "attendees" DROP CONSTRAINT "attendees_userId_fkey";

-- DropForeignKey
ALTER TABLE "workspaceConfig" DROP CONSTRAINT "workspaceConfig_workspaceId_fkey";

-- AlterTable
ALTER TABLE "attendance_history" DROP COLUMN "newStatus",
DROP COLUMN "previousStatus";

-- AlterTable
ALTER TABLE "attendees" DROP COLUMN "status",
ALTER COLUMN "userId" DROP NOT NULL;

-- DropEnum
DROP TYPE "AttendanceStatus";

-- CreateIndex
CREATE UNIQUE INDEX "attendees_eventId_userId_guestEmail_key" ON "attendees"("eventId", "userId", "guestEmail");

-- AddForeignKey
ALTER TABLE "workspaceConfig" ADD CONSTRAINT "workspaceConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_history" ADD CONSTRAINT "attendance_history_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
