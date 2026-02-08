-- AlterTable
ALTER TABLE "members" ADD COLUMN     "removedById" TEXT;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
