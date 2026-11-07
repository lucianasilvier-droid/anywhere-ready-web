CREATE TABLE "records" (
	"id" text PRIMARY KEY,
	"entity" text NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"created_by_id" text
);
--> statement-breakpoint
CREATE INDEX "records_entity_created_idx" ON "records" ("entity","created_date");--> statement-breakpoint
CREATE INDEX "records_data_gin_idx" ON "records" USING gin ("data");