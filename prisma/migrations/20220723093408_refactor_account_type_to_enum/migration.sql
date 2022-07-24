/*
  Warnings:

  - Changed the type of `provider` on the `accounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AccountProvider" AS ENUM ('LOCAL', 'GOOGLE', 'FACEBOOK');

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "provider",
ADD COLUMN     "provider" "AccountProvider" NOT NULL;
