CREATE TABLE `favorites` (
	`media_id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`external_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text NOT NULL,
	`description` text,
	`category` text,
	`artwork` text,
	`year` integer,
	`parent_id` text,
	`season` integer,
	`episode` integer,
	`extension` text,
	`source_url` text,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_provider_external_type` ON `media` (`provider_id`,`external_id`,`type`);--> statement-breakpoint
CREATE INDEX `media_type_title` ON `media` (`type`,`title`);--> statement-breakpoint
CREATE INDEX `media_parent` ON `media` (`parent_id`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`media_id` text PRIMARY KEY NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`watched_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`encrypted_config` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`synced_at` integer,
	`status` text DEFAULT 'ready' NOT NULL
);
