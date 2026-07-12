-- Customers now pick a drilling machine type (4 1/2" / 6 1/2") at request time,
-- and owners can support more than one type, so Company.machineType (single
-- string) becomes Company.machineTypes (array) and requests carry their own
-- required machineType so auto-quote matching can filter on it.

ALTER TABLE "BorewellRequest" ADD COLUMN "machineType" TEXT NOT NULL DEFAULT '4 1/2"';
ALTER TABLE "BorewellRequest" ALTER COLUMN "machineType" DROP DEFAULT;

ALTER TABLE "Company" ADD COLUMN "machineTypes" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "Company" SET "machineTypes" = ARRAY["machineType"] WHERE "machineType" IS NOT NULL AND "machineType" != '';
ALTER TABLE "Company" DROP COLUMN "machineType";
