-- CreateEnum
CREATE TYPE "DanceCategory" AS ENUM ('LATIN', 'BALLROOM', 'SWING', 'FOLK', 'COUNTRY', 'CONTEMPORARY', 'OTHER');

-- CreateEnum
CREATE TYPE "DanceTypeEnum" AS ENUM ('SALSA', 'BACHATA', 'KIZOMBA', 'MERENGUE', 'CHA_CHA', 'RUMBA', 'SAMBA', 'WALTZ', 'TANGO', 'QUICKSTEP', 'VIENNESE_WALTZ', 'LINDY_HOP', 'EAST_COAST_SWING', 'WEST_COAST_SWING', 'BALBOA', 'CHARLESTON', 'ARGENTINE_TANGO', 'MILONGA', 'VALS', 'BLUES', 'ZOUK', 'LAMBADA', 'MAMBO', 'CASINO', 'RUEDA', 'OTHER');

-- CreateTable
CREATE TABLE "dance_types" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DanceTypeEnum" NOT NULL,
    "category" "DanceCategory",
    "description" TEXT,

    CONSTRAINT "dance_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_eventDanceTypes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_eventDanceTypes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_memberDanceTypePreferences" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_memberDanceTypePreferences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_workspaceDanceTypes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_workspaceDanceTypes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "dance_types_name_key" ON "dance_types"("name");

-- CreateIndex
CREATE INDEX "_eventDanceTypes_B_index" ON "_eventDanceTypes"("B");

-- CreateIndex
CREATE INDEX "_memberDanceTypePreferences_B_index" ON "_memberDanceTypePreferences"("B");

-- CreateIndex
CREATE INDEX "_workspaceDanceTypes_B_index" ON "_workspaceDanceTypes"("B");

-- AddForeignKey
ALTER TABLE "_eventDanceTypes" ADD CONSTRAINT "_eventDanceTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "dance_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_eventDanceTypes" ADD CONSTRAINT "_eventDanceTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_memberDanceTypePreferences" ADD CONSTRAINT "_memberDanceTypePreferences_A_fkey" FOREIGN KEY ("A") REFERENCES "dance_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_memberDanceTypePreferences" ADD CONSTRAINT "_memberDanceTypePreferences_B_fkey" FOREIGN KEY ("B") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_workspaceDanceTypes" ADD CONSTRAINT "_workspaceDanceTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "dance_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_workspaceDanceTypes" ADD CONSTRAINT "_workspaceDanceTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "workspaceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
