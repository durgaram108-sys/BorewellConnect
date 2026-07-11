-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "casingRate" INTEGER NOT NULL DEFAULT 11500;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "availableDates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
ADD COLUMN     "casingRate" INTEGER NOT NULL DEFAULT 11500,
ADD COLUMN     "estimatedCompletion" TEXT NOT NULL DEFAULT '3–4 days';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "casingRate" INTEGER NOT NULL DEFAULT 11500;

