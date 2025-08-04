CREATE TABLE "socium-contango-aulia-test_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"pdf_path" text NOT NULL,
	"status" text DEFAULT 'PENDING',
	"mismatches" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socium-contango-aulia-test_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"skills" jsonb NOT NULL,
	"experience" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "socium-contango-aulia-test_submission" ADD CONSTRAINT "socium-contango-aulia-test_submission_user_id_socium-contango-aulia-test_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."socium-contango-aulia-test_user"("id") ON DELETE no action ON UPDATE no action;