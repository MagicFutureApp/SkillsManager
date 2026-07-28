#!/usr/bin/env node
'use strict';

/**
 * Release helper: bump the version field in apps/desktop and apps/landing.
 *
 * Usage:
 *   pnpm run release            # defaults to "patch"
 *   pnpm run release patch      # 1.2.3 -> 1.2.4
 *   pnpm run release minor      # 1.2.3 -> 1.3.0
 *   pnpm run release major      # 1.2.3 -> 2.0.0
 *
 * 采用标准 semver 进位：进位位 +1，低位归零。Override target root via
 * RELEASE_ROOT (used for testing only).
 */

import fs from 'node:fs';
import path from 'node:path';

type ReleaseType = 'major' | 'minor' | 'patch';

interface BumpResult {
  oldVersion: string;
  newVersion: string;
}

interface PkgJson {
  version?: string;
  [key: string]: unknown;
}

const ROOT: string = process.env.RELEASE_ROOT
  ? path.resolve(process.env.RELEASE_ROOT)
  : path.resolve(__dirname, '..');

const REL_TARGETS: ReadonlyArray<ReadonlyArray<string>> = [
  ['apps', 'desktop', 'package.json'],
  ['apps', 'landing', 'package.json'],
];

const TYPES: ReadonlyArray<ReleaseType> = ['major', 'minor', 'patch'];

// argv[2] is the bump type; default to "patch".
const rawArg: string = process.argv[2] ? process.argv[2].toLowerCase() : 'patch';
const bumpType: ReleaseType = (TYPES as ReadonlyArray<string>).includes(rawArg)
  ? (rawArg as ReleaseType)
  : 'patch';

if (rawArg !== bumpType) {
  console.warn(
    `[release] 未知的版本类型 "${rawArg}"，可选: ${TYPES.join(', ')}。` +
      `已回退为默认 "${bumpType}"。`
  );
}

function bump(version: string, type: ReleaseType): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) {
    throw new Error(`无法解析版本号: "${version}"（应为 x.y.z 形式）`);
  }
  let major = Number(m[1]);
  let minor = Number(m[2]);
  let patch = Number(m[3]);

  // 标准 semver 进位：进位位 +1，低位归零。
  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function updateVersion(file: string, type: ReleaseType): BumpResult {
  const content = fs.readFileSync(file, 'utf8');

  // Read the authoritative top-level version via JSON parse.
  const pkg = JSON.parse(content) as PkgJson;
  if (typeof pkg.version !== 'string') {
    throw new Error(`在 ${file} 中未找到顶层 version 字段`);
  }

  const oldVersion = pkg.version;
  const newVersion = bump(oldVersion, type);

  // Replace only the first top-level "version": "..." occurrence, keeping
  // file formatting / key order intact.
  const re = /("version"\s*:\s*")([^"]+)(")/;
  const match = re.exec(content);
  if (!match) {
    throw new Error(`在 ${file} 中未找到可替换的 version 字段`);
  }
  const replaced = content.replace(re, `$1${newVersion}$3`);
  fs.writeFileSync(file, replaced);

  return { oldVersion, newVersion };
}

console.log(`[release] 版本类型: ${bumpType}`);
let changed = 0;

for (const rel of REL_TARGETS) {
  const file = path.join(ROOT, ...rel);
  if (!fs.existsSync(file)) {
    console.warn(`[release] 跳过不存在的文件: ${path.relative(ROOT, file)}`);
    continue;
  }
  const { oldVersion, newVersion } = updateVersion(file, bumpType);
  console.log(
    `[release] ${path.relative(ROOT, file)}  ${oldVersion}  ->  ${newVersion}`
  );
  changed += 1;
}

console.log(`[release] 完成，共更新 ${changed} 个文件。`);
