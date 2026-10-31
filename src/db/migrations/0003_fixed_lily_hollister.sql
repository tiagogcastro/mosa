CREATE TABLE `provision_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`profile_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`encrypted_payload` text,
	`source_type` text,
	`source_name` text,
	`source_host` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provision_requests_token_hash_unique` ON `provision_requests` (`token_hash`);--> statement-breakpoint
CREATE INDEX `provision_profile_status` ON `provision_requests` (`profile_id`,`status`);