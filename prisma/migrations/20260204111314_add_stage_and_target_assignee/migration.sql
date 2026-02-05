-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('PRE_REPRO', 'REPRO', 'PLOTTER_KONTROL', 'COLLAGE', 'DONE');

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "stage" "Stage",
ADD COLUMN     "target_assignee_id" TEXT;

-- CreateIndex
CREATE INDEX "files_stage_idx" ON "files"("stage");

-- CreateIndex
CREATE INDEX "files_target_assignee_id_idx" ON "files"("target_assignee_id");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_target_assignee_id_fkey" FOREIGN KEY ("target_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
