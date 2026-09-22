export type CsvRecord = Record<string, string>;

const parseCsvRecords = (text: string): string[][] => {
  const normalized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }

        inQuotes = false;
        i += 1;
        continue;
      }

      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      record.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (char === "\r") {
      i += 1;
      continue;
    }

    if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
};

export const parseCsv = (text: string): { headers: string[]; rows: CsvRecord[] } => {
  const records = parseCsvRecords(text);

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map((header) => header.trim());

  const rows: CsvRecord[] = records.slice(1).map((record) => {
    const row: CsvRecord = {};

    headers.forEach((header, index) => {
      row[header] = (record[index] ?? "").trim();
    });

    return row;
  });

  return { headers, rows };
};

export type Best100SkillRecord = {
  rank: number;
  skill: string;
  skillKey: string;
  platform: string | null;
  vendor: string | null;
  sourceSkillssh: string | null;
  slugClawhub: string | null;
  url: string | null;
  repoUrl: string | null;
  install: string | null;
  match: string | null;
  description: string | null;
  descriptionZh: string | null;
  installsSkillssh: string | null;
  downloadsClawhub: string | null;
  downloadsSkillhubCn: string | null;
  wis: string | null;
  popularity: string | null;
  momentum: string | null;
  buzz: string | null;
  maintenance: string | null;
  trust: string | null;
  coverage: string | null;
  anomaly: string | null;
  updatedAt: Date;
};

const toNullable = (value: string | undefined): string | null => {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
};

export const toBest100SkillRecords = (rows: CsvRecord[], now: Date): Best100SkillRecord[] => {
  return rows.map((row) => ({
    rank: Number(row.rank) || 0,
    skill: row.skill?.trim() ?? "",
    skillKey: row.skill_key?.trim() ?? "",
    platform: toNullable(row.platform),
    vendor: toNullable(row.vendor),
    sourceSkillssh: toNullable(row.source_skillssh),
    slugClawhub: toNullable(row.slug_clawhub),
    url: toNullable(row.url),
    repoUrl: toNullable(row.repo_url),
    install: toNullable(row.install),
    match: toNullable(row.match),
    description: toNullable(row.description),
    descriptionZh: toNullable(row.description_zh),
    installsSkillssh: toNullable(row.installs_skillssh),
    downloadsClawhub: toNullable(row.downloads_clawhub),
    downloadsSkillhubCn: toNullable(row.downloads_skillhub_cn),
    wis: toNullable(row.wis),
    popularity: toNullable(row.popularity),
    momentum: toNullable(row.momentum),
    buzz: toNullable(row.buzz),
    maintenance: toNullable(row.maintenance),
    trust: toNullable(row.trust),
    coverage: toNullable(row.coverage),
    anomaly: toNullable(row.anomaly),
    updatedAt: now
  }));
};

export const parseBest100Csv = (text: string, now: Date = new Date()): Best100SkillRecord[] => {
  const { rows } = parseCsv(text);

  return toBest100SkillRecords(rows, now);
};
