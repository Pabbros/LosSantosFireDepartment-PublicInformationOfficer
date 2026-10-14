CREATE TABLE "cms_admin_login_attempts" (
	"id" text PRIMARY KEY,
	"attempts" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_admin_sessions" (
	"token_hash" text PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL
);
