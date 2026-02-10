-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ONREPRO', 'GRAFIKER', 'KALITE', 'KOLAJ');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('AWAITING_ASSIGNMENT', 'ASSIGNED', 'IN_REPRO', 'APPROVAL_PREP', 'CUSTOMER_APPROVAL', 'REVISION_REQUIRED', 'IN_QUALITY', 'IN_KOLAJ', 'SENT_TO_PRODUCTION');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CREATE', 'ASSIGN', 'TAKEOVER', 'TRANSFER', 'CUSTOMER_SENT', 'CUSTOMER_OK', 'CUSTOMER_NOK', 'QUALITY_OK', 'QUALITY_NOK', 'RESTART_MG', 'CLOSE', 'OVERRIDE', 'LOCATION_UPDATE', 'NOTE_ADDED', 'STATUS_CHANGE', 'PRE_REPRO_CLAIMED', 'PRE_REPRO_HANDED_OFF', 'PRE_REPRO_RETURNED_TO_QUEUE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LocationArea" AS ENUM ('WAITING', 'REPRO', 'QUALITY', 'KOLAJ', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('PRE_REPRO', 'REPRO', 'PLOTTER_KONTROL', 'COLLAGE', 'DONE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "role" "Role" NOT NULL,
    "department_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "is_virtual" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "work_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_slots" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "area" "LocationArea" NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "file_no" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_no" VARCHAR(50),
    "sap_number" VARCHAR(50),
    "order_name" VARCHAR(200),
    "design_no" VARCHAR(50),
    "revision_no" VARCHAR(50),
    "due_date" TIMESTAMP(3),
    "ksm_data" JSONB,
    "ksm_technical_data" JSONB,
    "status" "FileStatus" NOT NULL DEFAULT 'AWAITING_ASSIGNMENT',
    "stage" "Stage",
    "target_assignee_id" TEXT,
    "assigned_designer_id" TEXT,
    "current_department_id" TEXT NOT NULL,
    "current_location_slot_id" TEXT,
    "file_type_id" TEXT,
    "difficulty_level" INTEGER NOT NULL DEFAULT 3,
    "difficulty_weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "iteration_number" INTEGER NOT NULL DEFAULT 1,
    "iteration_label" VARCHAR(20) NOT NULL DEFAULT 'MG1',
    "pending_takeover" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "timers" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "user_id" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "reason_code" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "action_type" "ActionType" NOT NULL,
    "from_department_id" TEXT,
    "to_department_id" TEXT,
    "by_user_id" TEXT NOT NULL,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_targets" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "warning_hours" INTEGER NOT NULL,
    "critical_hours" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "file_types_name_key" ON "file_types"("name");

-- CreateIndex
CREATE INDEX "work_sessions_user_id_idx" ON "work_sessions"("user_id");

-- CreateIndex
CREATE INDEX "work_sessions_file_id_idx" ON "work_sessions"("file_id");

-- CreateIndex
CREATE INDEX "work_sessions_department_id_idx" ON "work_sessions"("department_id");

-- CreateIndex
CREATE INDEX "work_sessions_start_time_idx" ON "work_sessions"("start_time");

-- CreateIndex
CREATE INDEX "work_sessions_end_time_idx" ON "work_sessions"("end_time");

-- CreateIndex
CREATE UNIQUE INDEX "location_slots_code_key" ON "location_slots"("code");

-- CreateIndex
CREATE INDEX "location_slots_area_idx" ON "location_slots"("area");

-- CreateIndex
CREATE INDEX "location_slots_is_active_idx" ON "location_slots"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "files_file_no_key" ON "files"("file_no");

-- CreateIndex
CREATE INDEX "files_file_no_idx" ON "files"("file_no");

-- CreateIndex
CREATE INDEX "files_status_idx" ON "files"("status");

-- CreateIndex
CREATE INDEX "files_stage_idx" ON "files"("stage");

-- CreateIndex
CREATE INDEX "files_target_assignee_id_idx" ON "files"("target_assignee_id");

-- CreateIndex
CREATE INDEX "files_assigned_designer_id_idx" ON "files"("assigned_designer_id");

-- CreateIndex
CREATE INDEX "files_current_department_id_idx" ON "files"("current_department_id");

-- CreateIndex
CREATE INDEX "files_file_type_id_idx" ON "files"("file_type_id");

-- CreateIndex
CREATE INDEX "files_created_at_idx" ON "files"("created_at");

-- CreateIndex
CREATE INDEX "files_pending_takeover_idx" ON "files"("pending_takeover");

-- CreateIndex
CREATE INDEX "files_customer_name_idx" ON "files"("customer_name");

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
CREATE INDEX "timers_file_id_idx" ON "timers"("file_id");

-- CreateIndex
CREATE INDEX "timers_department_id_idx" ON "timers"("department_id");

-- CreateIndex
CREATE INDEX "timers_user_id_idx" ON "timers"("user_id");

-- CreateIndex
CREATE INDEX "timers_start_time_idx" ON "timers"("start_time");

-- CreateIndex
CREATE INDEX "timers_end_time_idx" ON "timers"("end_time");

-- CreateIndex
CREATE INDEX "notes_file_id_idx" ON "notes"("file_id");

-- CreateIndex
CREATE INDEX "notes_created_at_idx" ON "notes"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_file_id_idx" ON "audit_logs"("file_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_by_user_id_idx" ON "audit_logs"("by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sla_targets_department_id_key" ON "sla_targets"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_assigned_designer_id_fkey" FOREIGN KEY ("assigned_designer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_target_assignee_id_fkey" FOREIGN KEY ("target_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_current_department_id_fkey" FOREIGN KEY ("current_department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_current_location_slot_id_fkey" FOREIGN KEY ("current_location_slot_id") REFERENCES "location_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_file_type_id_fkey" FOREIGN KEY ("file_type_id") REFERENCES "file_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timers" ADD CONSTRAINT "timers_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timers" ADD CONSTRAINT "timers_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timers" ADD CONSTRAINT "timers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_from_department_id_fkey" FOREIGN KEY ("from_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_to_department_id_fkey" FOREIGN KEY ("to_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_by_user_id_fkey" FOREIGN KEY ("by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_targets" ADD CONSTRAINT "sla_targets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

