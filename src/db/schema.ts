import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  configJson: text("config_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  remoteUrl: text("remote_url").notNull(),
  localCachePath: text("local_cache_path").notNull(),
  defaultBranch: text("default_branch"),
  lastScannedCommitSha: text("last_scanned_commit_sha"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const skillUnits = sqliteTable("skill_units", {
  id: text("id").primaryKey(),
  repositoryId: text("repository_id").notNull(),
  name: text("name").notNull(),
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

export const agentTargets = sqliteTable("agent_targets", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  defaultInstallStrategy: text("default_install_strategy").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

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

export const installInstances = sqliteTable("install_instances", {
  id: text("id").primaryKey(),
  skillVersionId: text("skill_version_id").notNull(),
  agentTargetId: text("agent_target_id").notNull(),
  installedPath: text("installed_path").notNull(),
  installStrategy: text("install_strategy").notNull(),
  installedCommitSha: text("installed_commit_sha").notNull(),
  status: text("status").notNull(),
  installedAt: integer("installed_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
