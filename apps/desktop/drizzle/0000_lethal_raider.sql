CREATE TABLE `agent_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`normalized_path` text NOT NULL,
	`default_install_strategy` text NOT NULL,
	`detection_status` text,
	`scan_message` text,
	`enabled` integer DEFAULT true NOT NULL,
	`scope` text DEFAULT 'global' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_targets_type_normalized_path_uq` ON `agent_targets` (`type`,`normalized_path`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `distribution_plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`distribution_plan_id` text NOT NULL,
	`skill_version_id` text NOT NULL,
	`agent_target_id` text NOT NULL,
	`action` text NOT NULL,
	`source_path` text NOT NULL,
	`target_path` text NOT NULL,
	`install_strategy` text NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	`error_message` text,
	`result_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `distribution_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`trigger_source` text NOT NULL,
	`operation_type` text NOT NULL,
	`status` text NOT NULL,
	`summary_json` text NOT NULL,
	`confirmations_json` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`confirmed_at` integer,
	`executed_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `install_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_version_id` text NOT NULL,
	`agent_target_id` text NOT NULL,
	`target_snapshot_json` text NOT NULL,
	`installed_path` text NOT NULL,
	`install_strategy` text NOT NULL,
	`installed_commit_sha` text NOT NULL,
	`status` text NOT NULL,
	`installed_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`name` text NOT NULL,
	`remote_url` text NOT NULL,
	`local_cache_path` text NOT NULL,
	`default_branch` text,
	`last_scanned_commit_sha` text,
	`config_json` text DEFAULT '{}' NOT NULL,
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
	`description` text DEFAULT '' NOT NULL,
	`license` text DEFAULT '' NOT NULL,
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
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`repository_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`start_commit_sha` text,
	`end_commit_sha` text,
	`summary_json` text NOT NULL,
	`error_message` text,
	`log_path` text
);
