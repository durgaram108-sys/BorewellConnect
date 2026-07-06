/*
  Warnings:

  - Added the required column `state` to the `BorewellRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BorewellRequest" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'India',
ADD COLUMN     "state" TEXT NOT NULL;
