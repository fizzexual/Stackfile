ALTER TABLE "file" ADD COLUMN "taken_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "file" ADD COLUMN "metadata" jsonb;