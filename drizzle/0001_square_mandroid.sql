ALTER TABLE `agent_targets` ADD `detection_status` text;--> statement-breakpoint
ALTER TABLE `agent_targets` ADD `scope` text DEFAULT 'global' NOT NULL;