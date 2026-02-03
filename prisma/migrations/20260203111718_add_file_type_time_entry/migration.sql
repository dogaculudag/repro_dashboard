-- AlterTable
ALTER TABLE "files" ADD COLUMN     "difficulty_level" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "difficulty_weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "file_type_id" TEXT;

-- CreateTable
CREATE TABLE "file_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "default_difficulty_level" INTEGER,
    "default_difficulty_weight" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_types_name_key" ON "file_types"("name");

-- CreateIndex
CREATE INDEX "time_entries_file_id_idx" ON "time_entries"("file_id");

-- CreateIndex
CREATE INDEX "time_entries_user_id_idx" ON "time_entries"("user_id");

-- CreateIndex
CREATE INDEX "time_entries_department_id_idx" ON "time_entries"("department_id");

-- CreateIndex
CREATE INDEX "time_entries_start_at_idx" ON "time_entries"("start_at");

-- CreateIndex
CREATE INDEX "time_entries_end_at_idx" ON "time_entries"("end_at");

-- CreateIndex
CREATE INDEX "files_file_type_id_idx" ON "files"("file_type_id");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_file_type_id_fkey" FOREIGN KEY ("file_type_id") REFERENCES "file_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
