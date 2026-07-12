-- Company.city already served as "District" in the owner UI (display-only,
-- never used for matching/filtering) — this column was a redundant duplicate
-- added in the prior migration and is dropped here before real data accumulates.
ALTER TABLE "Company" DROP COLUMN "district";
