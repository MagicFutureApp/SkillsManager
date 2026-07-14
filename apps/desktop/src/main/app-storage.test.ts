import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { appSettings } from "../db/schema";
import { buildAppStoragePaths, createAppDbRuntime } from "./app-storage";

describe("app storage runtime", () => {
  it("builds the displayed local storage paths from app data and home directories", () => {
    expect(
      buildAppStoragePaths({
        dataDirectory: "/Users/andrew/Library/Application Support/Skills Manager",
        homeDirectory: "/Users/andrew"
      })
    ).toEqual({
      dataDirectory: "/Users/andrew/Library/Application Support/Skills Manager",
      databasePath: "/Users/andrew/Library/Application Support/Skills Manager/skills-manager.sqlite",
      repositoryCachePath: "/Users/andrew/.skills-manager/cache"
    });
  });

  it("resets the SQLite database by closing it, deleting database files, and recreating schema", async () => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "skills-manager-app-storage-"));
    const runtime = createAppDbRuntime({
      dataDirectory,
      homeDirectory: path.join(dataDirectory, "home")
    });
    const paths = runtime.getStoragePaths();

    await runtime
      .getDb()
      .insert(appSettings)
      .values({
        key: "githubToken",
        updatedAt: new Date("2026-06-20T00:00:00.000Z"),
        valueJson: JSON.stringify("github_pat_saved")
      });
    await writeFile(`${paths.databasePath}-wal`, "stale wal", "utf8");
    await writeFile(`${paths.databasePath}-shm`, "stale shm", "utf8");

    await runtime.resetDatabase();

    await expect(readFileIfExists(`${paths.databasePath}-wal`)).resolves.not.toEqual(
      Buffer.from("stale wal")
    );
    await expect(readFileIfExists(`${paths.databasePath}-shm`)).resolves.not.toEqual(
      Buffer.from("stale shm")
    );
    await expect(runtime.getDb().select().from(appSettings)).resolves.toEqual([]);

    runtime.close();
  });
});

const readFileIfExists = async (filePath: string): Promise<Buffer> => {
  if (!existsSync(filePath)) {
    return Buffer.alloc(0);
  }

  return readFile(filePath);
};
