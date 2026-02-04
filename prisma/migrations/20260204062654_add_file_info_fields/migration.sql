-- AlterTable
ALTER TABLE "files" ADD COLUMN     "design_no" VARCHAR(50),
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "order_name" VARCHAR(200),
ADD COLUMN     "revision_no" VARCHAR(50),
ADD COLUMN     "sap_number" VARCHAR(50);
