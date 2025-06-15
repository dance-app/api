-- CreateEnum
CREATE TYPE "DanceCategory" AS ENUM ('LATIN', 'BALLROOM', 'SWING', 'FOLK', 'COUNTRY', 'CONTEMPORARY', 'OTHER');

-- CreateEnum
CREATE TYPE "DanceTypeEnum" AS ENUM ('SALSA', 'BACHATA', 'KIZOMBA', 'MERENGUE', 'CHA_CHA', 'RUMBA', 'SAMBA', 'WALTZ', 'TANGO', 'QUICKSTEP', 'VIENNESE_WALTZ', 'LINDY_HOP', 'EAST_COAST_SWING', 'WEST_COAST_SWING', 'BALBOA', 'CHARLESTON', 'ARGENTINE_TANGO', 'MILONGA', 'VALS', 'BLUES', 'ZOUK', 'LAMBADA', 'MAMBO', 'CASINO', 'RUEDA', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialVisibility" AS ENUM ('PRIVATE', 'WORKSPACE', 'PUBLIC');

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
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "videoUrls" TEXT[],
    "imageUrls" TEXT[],
    "visibility" "MaterialVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdById" INTEGER NOT NULL,
    "workspaceId" INTEGER,
    "parentMaterialId" INTEGER,
    "danceTypeId" INTEGER,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_student_shares" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "materialId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "sharedById" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "canDownload" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "material_student_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_eventMaterials" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_eventMaterials_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_eventDanceTypes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_eventDanceTypes_AB_pkey" PRIMARY KEY ("A","B")
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
CREATE UNIQUE INDEX "material_student_shares_materialId_studentId_key" ON "material_student_shares"("materialId", "studentId");

-- CreateIndex
CREATE INDEX "_eventMaterials_B_index" ON "_eventMaterials"("B");

-- CreateIndex
CREATE INDEX "_eventDanceTypes_B_index" ON "_eventDanceTypes"("B");

-- CreateIndex
CREATE INDEX "_workspaceDanceTypes_B_index" ON "_workspaceDanceTypes"("B");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_parentMaterialId_fkey" FOREIGN KEY ("parentMaterialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_danceTypeId_fkey" FOREIGN KEY ("danceTypeId") REFERENCES "dance_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_student_shares" ADD CONSTRAINT "material_student_shares_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_student_shares" ADD CONSTRAINT "material_student_shares_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_student_shares" ADD CONSTRAINT "material_student_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_eventMaterials" ADD CONSTRAINT "_eventMaterials_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_eventMaterials" ADD CONSTRAINT "_eventMaterials_B_fkey" FOREIGN KEY ("B") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_eventDanceTypes" ADD CONSTRAINT "_eventDanceTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "dance_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_eventDanceTypes" ADD CONSTRAINT "_eventDanceTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_workspaceDanceTypes" ADD CONSTRAINT "_workspaceDanceTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "dance_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_workspaceDanceTypes" ADD CONSTRAINT "_workspaceDanceTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "workspaceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
