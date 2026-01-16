-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "accrualMethod" TEXT NOT NULL DEFAULT 'amortizing',
ADD COLUMN     "balloonAmount" DECIMAL(19,4),
ADD COLUMN     "dayCountConvention" TEXT NOT NULL DEFAULT 'actual_365',
ADD COLUMN     "interestOnlyMonths" INTEGER,
ADD COLUMN     "paymentStructure" TEXT NOT NULL DEFAULT 'level',
ADD COLUMN     "productCategory" TEXT NOT NULL DEFAULT 'personal';
