ALTER TYPE "public"."api_usage_purpose" ADD VALUE 'linkedin_post';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'linkedin_post_failed';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "linkedin_post_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "linkedin_posted_at" timestamp with time zone;