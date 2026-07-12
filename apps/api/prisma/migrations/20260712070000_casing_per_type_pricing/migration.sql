-- Casing pricing moves from a single flat charge to per-type, per-foot rates
-- (6kg/8kg/10kg PVC, Iron/GI). The actual type + footage used is only known
-- once drilling is done, so it's captured on Booking at job completion instead
-- of being baked into the quote/booking total up front.

ALTER TABLE "Company" ADD COLUMN "casingRate6kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "casingRate8kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "casingRate10kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "casingRateIron" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" DROP COLUMN "casingRate";

ALTER TABLE "Quote" ADD COLUMN "casingRate6kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "casingRate8kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "casingRate10kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "casingRateIron" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" DROP COLUMN "casingRate";

ALTER TABLE "Booking" ADD COLUMN "casingRate6kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "casingRate8kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "casingRate10kg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "casingRateIron" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "casingType" TEXT;
ALTER TABLE "Booking" ADD COLUMN "casingFeet" INTEGER;
ALTER TABLE "Booking" DROP COLUMN "casingRate";
