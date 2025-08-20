CREATE SEQUENCE "public"."visitor_counter_sequence" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "activity_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"ip_address" text,
	"user_agent" text,
	"referrer" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "experiment_levels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" varchar NOT NULL,
	"level_number" integer NOT NULL,
	"video_url" text NOT NULL,
	"background_video_url" text,
	"completion_video_url" text,
	"post_submission_video_url" text,
	"video_thumbnail" text,
	"questions" jsonb NOT NULL,
	"branching_rules" jsonb
);
--> statement-breakpoint
CREATE TABLE "experiment_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar,
	"user_id" varchar,
	"level_id" varchar NOT NULL,
	"question_id" text NOT NULL,
	"response_type" text NOT NULL,
	"response_data" jsonb NOT NULL,
	"file_url" text,
	"file_id" text,
	"metadata" jsonb,
	"is_scanned" boolean DEFAULT false,
	"scan_result" text,
	"visitor_number" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "experiment_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"experiment_id" varchar NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"branching_path" text DEFAULT 'default' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"session_data" jsonb,
	"visitor_number" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"total_levels" integer DEFAULT 5 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "participation_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"participation_type" varchar NOT NULL,
	"show_name" boolean DEFAULT true,
	"share_responses" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"is_anonymous" boolean DEFAULT false,
	"visitor_number" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_visitor_number_unique" UNIQUE("visitor_number")
);
--> statement-breakpoint
ALTER TABLE "activity_tracking" ADD CONSTRAINT "activity_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_tracking" ADD CONSTRAINT "activity_tracking_session_id_experiment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."experiment_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_responses" ADD CONSTRAINT "experiment_responses_session_id_experiment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."experiment_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_responses" ADD CONSTRAINT "experiment_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_sessions" ADD CONSTRAINT "experiment_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participation_settings" ADD CONSTRAINT "participation_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;