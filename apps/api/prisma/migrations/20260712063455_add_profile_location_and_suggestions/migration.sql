-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "district" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mandal" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ownerSurname" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pincode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "village" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "district" TEXT,
ADD COLUMN     "mandal" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "surname" TEXT,
ADD COLUMN     "village" TEXT;

-- CreateTable
CREATE TABLE "MandalSuggestion" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MandalSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageSuggestion" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VillageSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MandalSuggestion_state_district_idx" ON "MandalSuggestion"("state", "district");

-- CreateIndex
CREATE UNIQUE INDEX "MandalSuggestion_state_district_mandal_key" ON "MandalSuggestion"("state", "district", "mandal");

-- CreateIndex
CREATE INDEX "VillageSuggestion_state_district_mandal_idx" ON "VillageSuggestion"("state", "district", "mandal");

-- CreateIndex
CREATE UNIQUE INDEX "VillageSuggestion_state_district_mandal_village_key" ON "VillageSuggestion"("state", "district", "mandal", "village");
