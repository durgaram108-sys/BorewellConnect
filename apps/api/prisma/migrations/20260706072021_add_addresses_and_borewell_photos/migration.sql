-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "address" TEXT;

-- CreateTable
CREATE TABLE "BorewellPhoto" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BorewellPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BorewellPhoto" ADD CONSTRAINT "BorewellPhoto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
