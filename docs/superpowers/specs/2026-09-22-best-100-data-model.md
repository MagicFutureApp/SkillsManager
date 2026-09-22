# Best-100 推荐榜单数据模型说明

本文档说明 SkillsManager desktop 中 best-100 推荐榜单功能引入的本地数据库表 `best_100_skills`，用于记录从 cache-manager Worker 同步到的技能榜单快照。

> 事实来源（以代码为准）：
> - Drizzle schema（TS 单一事实来源）：`apps/desktop/src/db/schema.ts:122` 的 `best100Skills`
> - 运行时建表 bootstrap SQL：`apps/desktop/src/db/client.ts:121` 的 `CREATE TABLE IF NOT EXISTS best_100_skills`
> - 解析与字段映射：`apps/desktop/src/core/best-100/parse-csv.ts` 的 `toBest100SkillRecords`
> - 读写入口：`apps/desktop/src/db/repositories/best100Repository.ts`

## 1. 表定位

- 表名：`best_100_skills`
- 引擎：SQLite（better-sqlite3，经 Drizzle ORM）
- 角色：本地缓存。每次同步由 desktop 从 cache-manager Worker 的 `/api/best-100.csv` 拉取全量 CSV，解析后整表覆盖写入。
- 主键：`skill_key`（TEXT），不是 `rank`。

## 2. 字段总表

| # | TS 字段 | DB 列名 | 类型 | 可空 | CSV 来源表头 | 含义 | 备注 |
|---|---------|---------|------|------|--------------|------|------|
| 1 | `rank` | `rank` | INTEGER | 否 | `rank` | 榜单排名（1 起） | 唯一数值列；默认排序键 |
| 2 | `skill` | `skill` | TEXT | 否 | `skill` | 技能显示名 | 按 name 排序的键 |
| 3 | `skillKey` | `skill_key` | TEXT | 否 | `skill_key` | 技能稳定标识 | **主键**；解析为 `ss:<owner>/<repo>/<path>` 形式 |
| 4 | `platform` | `platform` | TEXT | 可 | `platform` | 来源平台 | 如 `skills.sh` |
| 5 | `vendor` | `vendor` | TEXT | 可 | `vendor` | 提供方/作者 | 搜索命中字段之一 |
| 6 | `sourceSkillssh` | `source_skillssh` | TEXT | 可 | `source_skillssh` | 来源页 URL | ⚠️ 列名疑似上游 `skills.sh` 缩写/笔误，原样保留 |
| 7 | `slugClawhub` | `slug_clawhub` | TEXT | 可 | `slug_clawhub` | ClawHub slug | |
| 8 | `url` | `url` | TEXT | 可 | `url` | 技能主页 URL | |
| 9 | `repoUrl` | `repo_url` | TEXT | 可 | `repo_url` | 仓库 URL | |
| 10 | `install` | `install` | TEXT | 可 | `install` | 安装命令/方式 | |
| 11 | `match` | `match` | TEXT | 可 | `match` | 匹配说明 | |
| 12 | `description` | `description` | TEXT | 可 | `description` | 英文描述 | 搜索命中字段之一 |
| 13 | `descriptionZh` | `description_zh` | TEXT | 可 | `description_zh` | 中文描述 | 搜索命中字段之一 |
| 14 | `installsSkillssh` | `installs_skillssh` | TEXT | 可 | `installs_skillssh` | skills.sh 安装量 | ⚠️ 数值但**存为 TEXT** |
| 15 | `downloadsClawhub` | `downloads_clawhub` | TEXT | 可 | `downloads_clawhub` | ClawHub 下载量 | 数值但**存为 TEXT** |
| 16 | `downloadsSkillhubCn` | `downloads_skillhub_cn` | TEXT | 可 | `downloads_skillhub_cn` | SkillHub CN 下载量 | 数值但**存为 TEXT** |
| 17 | `wis` | `wis` | TEXT | 可 | `wis` | 综合评分（WIS） | 数值但**存为 TEXT**；按 wis 排序时 `CAST(... AS REAL)` |
| 18 | `popularity` | `popularity` | TEXT | 可 | `popularity` | 热度分 | 数值但**存为 TEXT** |
| 19 | `momentum` | `momentum` | TEXT | 可 | `momentum` | 增长势头分 | 数值但**存为 TEXT** |
| 20 | `buzz` | `buzz` | TEXT | 可 | `buzz` | 讨论热度分 | 数值但**存为 TEXT** |
| 21 | `maintenance` | `maintenance` | TEXT | 可 | `maintenance` | 维护分 | 数值但**存为 TEXT** |
| 22 | `trust` | `trust` | TEXT | 可 | `trust` | 可信度分 | 数值但**存为 TEXT** |
| 23 | `coverage` | `coverage` | TEXT | 可 | `coverage` | 覆盖度分 | 数值但**存为 TEXT** |
| 24 | `anomaly` | `anomaly` | TEXT | 可 | `anomaly` | 异常分 | 数值但**存为 TEXT** |
| 25 | `updatedAt` | `updated_at` | INTEGER(timestamp) | 否 | — | 本地同步时间 | **非 CSV 字段**；由 desktop 在 `parseBest100Csv(text, now)` 写入 `now`，存为毫秒整数，读取还原为 `Date` |

## 3. 关键设计点

1. **主键是 `skill_key`，不是 `rank`**：`rank` 会随榜单刷新变化，`skill_key` 才是稳定标识。同步时是整表替换（见下）。

2. **`upsertAll` 实为「全删全插」**：`best100Repository.ts:59` 先 `db.delete(best100Skills)` 再 `db.insert(...)`。每次同步整批覆盖，没有按 key 的 merge。

3. **评分列全部存 TEXT，不是 REAL/INTEGER**：`wis` / `popularity` / `momentum` / `buzz` / `maintenance` / `trust` / `coverage` / `anomaly` 及三个下载量列均为 `text`。`search` 按 `wis` 排序时用 `CAST(${wis} AS REAL)`（`best100Repository.ts:46`）做运行时转换——若上游给空串或脏值，CAST 会落为 `0`/`NULL`，排序须留意识别。

4. **`updated_at` 不在 CSV 里**：来自代码 `new Date()`，代表「本机何时拉到这批数据」，用于判断缓存新鲜度，而非榜单本身的发布时间。

5. **解析按表头名映射**：`toBest100SkillRecords` 用 `row.skill_key` 等表头名取值，上游增列或换列序都不会挂，缺列自动补 `null`。已加 BOM strip 防护首列表头被 `\uFEFF` 污染导致所有 `rank` 静默为 0（`parse-csv.ts` 的 `parseCsvRecords` 入口）。

6. **建表两处同步**：改字段必须同时改 `schema.ts` 的 `sqliteTable` 和 `client.ts` 的 `CREATE TABLE` bootstrap SQL（本项目铁律，否则 migration 与实际表结构漂移）。当前表用 `IF NOT EXISTS` 幂等建表，无独立 drizzle-kit migration 文件。

## 4. 读写接口

`best100Repository` 暴露：

- `clear()`：清空整表（delete all）。
- `upsertAll(records)`：全删全插，返回写入行数。
- `search({ query, sort, page, pageSize })`：分页 + 模糊搜索 + 排序。
  - 搜索命中字段：`skill` / `vendor` / `description` / `description_zh`（`LIKE %query%`）。
  - 排序 `sort`：`rank`（默认，升序）/ `name`（skill 升序）/ `wis`（CAST 为 REAL 降序）。
  - 默认分页：`page=1`、`pageSize=50`。
- `getSyncableCount()`：返回当前表内总行数（用于同步前计数/状态展示）。

## 5. 数据来源链路

cache-manager Worker（`apps/cache-manager`）从 `data/${utcDate}/rankings/best-100.csv` 拉取源 CSV 存入 Workers KV（`Best100Skills` key），desktop 经带 sync token 的 `/api/best-100.csv` 接口拉取原始 CSV 文本，在本地用 `parseBest100Csv` 解析后写入本表。评分/下载量类字段在 Worker 端**不做解析**，原样以字符串存 KV，解析与类型转换下沉到 desktop 端（契合免费档 Worker 的 CPU 预算约束）。
