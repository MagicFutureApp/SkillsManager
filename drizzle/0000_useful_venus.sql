CREATE TABLE `agent_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`default_install_strategy` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `install_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_version_id` text NOT NULL,
	`agent_target_id` text NOT NULL,
	`installed_path` text NOT NULL,
	`install_strategy` text NOT NULL,
	`installed_commit_sha` text NOT NULL,
	`status` text NOT NULL,
	`installed_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`remote_url` text NOT NULL,
	`local_cache_path` text NOT NULL,
	`default_branch` text,
	`last_scanned_commit_sha` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_target_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_unit_id` text NOT NULL,
	`agent_target_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`desired_version_mode` text DEFAULT 'latest' NOT NULL,
	`desired_commit_sha` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_target_preferences_skill_target_uq` ON `skill_target_preferences` (`skill_unit_id`,`agent_target_id`);--> statement-breakpoint
CREATE TABLE `skill_units` (
	`id` text PRIMARY KEY NOT NULL,
	`repository_id` text NOT NULL,
	`name` text NOT NULL,
	`entry_path` text NOT NULL,
	`root_path` text NOT NULL,
	`discovery_method` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_unit_id` text NOT NULL,
	`commit_sha` text NOT NULL,
	`metadata_snapshot_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
