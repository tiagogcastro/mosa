CREATE TABLE `content_restrictions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_restrictions_unique` ON `content_restrictions` (`profile_id`,`provider_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `content_restrictions_lookup` ON `content_restrictions` (`profile_id`,`provider_id`,`target_type`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`avatar_color` text DEFAULT 'blue' NOT NULL,
	`provider_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_provider_id_unique` ON `profiles` (`provider_id`);
--> statement-breakpoint
INSERT INTO `profiles` (`id`, `name`, `avatar_color`, `provider_id`, `created_at`, `updated_at`)
SELECT `id`, `name`, 'blue', `id`, unixepoch('now'), unixepoch('now') FROM `providers`;
--> statement-breakpoint
INSERT INTO `preferences` (`key`, `value`)
SELECT 'active_profile', `value` FROM `preferences` WHERE `key` = 'active_provider'
ON CONFLICT (`key`) DO NOTHING;
--> statement-breakpoint
INSERT INTO `preferences` (`key`, `value`)
SELECT 'profile:' || (SELECT `value` FROM `preferences` WHERE `key` = 'active_provider') || ':' || `key`, `value`
FROM `preferences`
WHERE `key` IN ('autoplay_next', 'restore_channel', 'playback_speed', 'theme', 'timezone')
  AND EXISTS (SELECT 1 FROM `preferences` WHERE `key` = 'active_provider');
--> statement-breakpoint
INSERT INTO `content_restrictions` (`id`, `profile_id`, `provider_id`, `target_type`, `target_id`, `created_at`)
SELECT lower(hex(randomblob(16))), `profiles`.`id`, `media`.`provider_id`,
  CASE `media`.`type` WHEN 'live' THEN 'live_category' WHEN 'movie' THEN 'movie_category' ELSE 'series_category' END,
  `media`.`category`, unixepoch('now')
FROM `profiles` INNER JOIN `media` ON `media`.`provider_id` = `profiles`.`provider_id`
WHERE `media`.`type` IN ('live', 'movie', 'series') AND `media`.`category` IS NOT NULL
  AND (lower(`media`.`category`) LIKE '%xxx%' OR lower(`media`.`category`) LIKE '%adult%' OR lower(`media`.`category`) LIKE '%porn%' OR lower(`media`.`category`) LIKE '%18+%' OR lower(`media`.`category`) LIKE '%explicit%')
GROUP BY `profiles`.`id`, `media`.`type`, `media`.`category`;
