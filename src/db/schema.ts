import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  configJson: text("config_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  name: text("name").notNull(),
  remoteUrl: text("remote_url").notNull(),
  localCachePath: text("local_cache_path").notNull(),
  defaultBranch: text("default_branch"),
  lastScannedCommitSha: text("last_scanned_commit_sha"),
  lastSyncStatus: text("last_sync_status").notNull().default("idle"),
  lastSyncStartedAt: integer("last_sync_started_at", { mode: "timestamp" }),
  lastSyncFinishedAt: integer("last_sync_finished_at", { mode: "timestamp" }),
  lastSyncStartCommitSha: text("last_sync_start_commit_sha"),
  lastSyncEndCommitSha: text("last_sync_end_commit_sha"),
  lastSyncSummaryJson: text("last_sync_summary_json").notNull().default("{}"),
  lastSyncErrorMessage: text("last_sync_error_message"),
  lastSyncLogPath: text("last_sync_log_path"),
  configJson: text("config_json").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const skillUnits = sqliteTable("skill_units", {
  id: text("id").primaryKey(),
  repositoryId: text("repository_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  license: text("license").notNull().default(""),
  entryPath: text("entry_path").notNull(),
  rootPath: text("root_path").notNull(),
  discoveryMethod: text("discovery_method").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const skillVersions = sqliteTable("skill_versions", {
  id: text("id").primaryKey(),
  skillUnitId: text("skill_unit_id").notNull(),
  commitSha: text("commit_sha").notNull(),
  metadataSnapshotJson: text("metadata_snapshot_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const agentTargets = sqliteTable(
  "agent_targets",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    path: text("path").notNull(),
    normalizedPath: text("normalized_path").notNull(),
    detectionStatus: text("detection_status"),
    scanMessage: text("scan_message"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    scope: text("scope").notNull().default("global"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (table) => [
    uniqueIndex("agent_targets_type_normalized_path_uq").on(table.type, table.normalizedPath)
  ]
);

export const skillTargetPreferences = sqliteTable(
  "skill_target_preferences",
  {
    id: text("id").primaryKey(),
    skillUnitId: text("skill_unit_id").notNull(),
    agentTargetId: text("agent_target_id").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    desiredVersionMode: text("desired_version_mode").notNull().default("latest"),
    desiredCommitSha: text("desired_commit_sha"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (table) => [
    uniqueIndex("skill_target_preferences_skill_target_uq").on(
      table.skillUnitId,
      table.agentTargetId
    )
  ]
);

export const installInstances = sqliteTable(
  "install_instances",
  {
    id: text("id").primaryKey(),
    skillUnitId: text("skill_unit_id").notNull(),
    skillVersionId: text("skill_version_id").notNull(),
    agentTargetId: text("agent_target_id").notNull(),
    targetSnapshotJson: text("target_snapshot_json").notNull(),
    installedPath: text("installed_path").notNull(),
    installedCommitSha: text("installed_commit_sha").notNull(),
    status: text("status").notNull(),
    installedAt: integer("installed_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    lastError: text("last_error")
  },
  (table) => [
    uniqueIndex("install_instances_skill_target_uq").on(table.skillUnitId, table.agentTargetId)
  ]
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
