-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "pricePerFt",
ADD COLUMN     "bandRates" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "rateCard" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "pricePerFt",
ADD COLUMN     "bandRates" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

