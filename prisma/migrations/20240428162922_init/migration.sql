-- CreateEnum
CREATE TYPE "AccountProvider" AS ENUM ('LOCAL', 'GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "WeekStart" AS ENUM ('SUNDAY', 'MONDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "AttendenceType" AS ENUM ('VALIDATE', 'WAITING');

-- CreateEnum
CREATE TYPE "DanceRole" AS ENUM ('LEADER', 'FOLLOWER');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'TEACHER', 'STUDENT');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "fullName" TEXT,
    "token" TEXT,
    "isSuperAdmin" BOOLEAN,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "provider" "AccountProvider" NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaceConfig" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "weekStart" "WeekStart" NOT NULL,
    "workspaceId" INTEGER NOT NULL,

    CONSTRAINT "workspaceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "userId" INTEGER NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "roles" "WorkspaceRole"[],

    CONSTRAINT "members_pkey" PRIMARY KEY ("userId","workspaceId")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dateStart" TIMESTAMPTZ(3) NOT NULL,
    "dateEnd" TIMESTAMPTZ(3),
    "location" TEXT,
    "capacityMin" INTEGER,
    "capacityMax" INTEGER,
    "leaderOffset" INTEGER DEFAULT 0,
    "followerOffset" INTEGER DEFAULT 0,
    "rule" TEXT[],
    "organizerId" INTEGER NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendees" (
    "role" "DanceRole" NOT NULL,
    "type" "AttendenceType" NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,

    CONSTRAINT "attendees_pkey" PRIMARY KEY ("userId","eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaceConfig_workspaceId_key" ON "workspaceConfig"("workspaceId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaceConfig" ADD CONSTRAINT "workspaceConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
