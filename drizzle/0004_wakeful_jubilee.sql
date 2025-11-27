ALTER TABLE "stall_items" ADD COLUMN "category" varchar(100) DEFAULT 'Other' NOT NULL;--> statement-breakpoint
CREATE INDEX "stall_items_category_idx" ON "stall_items" USING btree ("category");