CREATE TYPE "public"."stall_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "stalls" ADD COLUMN "status" "stall_status" DEFAULT 'pending' NOT NULL;