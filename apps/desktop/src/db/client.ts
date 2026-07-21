import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const createDbClient = (databasePath: string) => {
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  ensureDbSchema(sqlite);

  return drizzle(sqlite, { schema });
};

const ensureDbSchema = (sqlite: Database.Database): void => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS agent_targets (
      id text PRIMARY KEY NOT NULL,
      type text NOT NULL,
      name text NOT NULL,
      path text NOT NULL,
      normalized_path text NOT NULL,
      detection_status text,
      scan_message text,
      enabled integer DEFAULT true NOT NULL,
      scope text DEFAULT 'global' NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS agent_targets_type_normalized_path_uq
      ON agent_targets (type, normalized_path);

    CREATE TABLE IF NOT EXISTS app_settings (
      key text PRIMARY KEY NOT NULL,
      value_json text NOT NULL,
      updated_at integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS install_instances (
      id text PRIMARY KEY NOT NULL,
      skill_unit_id text NOT NULL,
      skill_version_id text NOT NULL,
      agent_target_id text NOT NULL,
      target_snapshot_json text NOT NULL,
      installed_path text NOT NULL,
      installed_commit_sha text NOT NULL,
      status text NOT NULL,
      installed_at integer NOT NULL,
      updated_at integer NOT NULL,
      last_error text
    );

    CREATE UNIQUE INDEX IF NOT EXISTS install_instances_skill_target_uq
      ON install_instances (skill_unit_id, agent_target_id);

    CREATE TABLE IF NOT EXISTS providers (
      id text PRIMARY KEY NOT NULL,
      type text NOT NULL,
      name text NOT NULL,
      config_json text NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repositories (
      id text PRIMARY KEY NOT NULL,
      provider_id text NOT NULL,
      name text NOT NULL,
      remote_url text NOT NULL,
      local_cache_path text NOT NULL,
      default_branch text,
      last_scanned_commit_sha text,
      last_sync_status text DEFAULT 'idle' NOT NULL,
      last_sync_started_at integer,
      last_sync_finished_at integer,
      last_sync_start_commit_sha text,
      last_sync_end_commit_sha text,
      last_sync_summary_json text DEFAULT '{}' NOT NULL,
      last_sync_error_message text,
      last_sync_log_path text,
      config_json text DEFAULT '{}' NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_target_preferences (
      id text PRIMARY KEY NOT NULL,
      skill_unit_id text NOT NULL,
      agent_target_id text NOT NULL,
      enabled integer DEFAULT true NOT NULL,
      desired_version_mode text DEFAULT 'latest' NOT NULL,
      desired_commit_sha text,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS skill_target_preferences_skill_target_uq
      ON skill_target_preferences (skill_unit_id, agent_target_id);

    CREATE TABLE IF NOT EXISTS skill_units (
      id text PRIMARY KEY NOT NULL,
      repository_id text NOT NULL,
      name text NOT NULL,
      description text DEFAULT '' NOT NULL,
      license text DEFAULT '' NOT NULL,
      entry_path text NOT NULL,
      root_path text NOT NULL,
      discovery_method text NOT NULL,
      status text NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_versions (
      id text PRIMARY KEY NOT NULL,
      skill_unit_id text NOT NULL,
      commit_sha text NOT NULL,
      metadata_snapshot_json text NOT NULL,
      created_at integer NOT NULL
    );

  `);
};
