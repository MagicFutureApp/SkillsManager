import { describe, expect, it } from "vitest";

import { parseBest100Csv, parseCsv, toBest100SkillRecords } from "./parse-csv";

describe("parseCsv", () => {
  it("parses header and rows with trimmed headers", () => {
    const text = "rank,skill,skill_key\n1,find-skills,ss:a/b/c\n2,other,ss:d/e/f";
    const { headers, rows } = parseCsv(text);

    expect(headers).toEqual(["rank", "skill", "skill_key"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ rank: "1", skill: "find-skills", skill_key: "ss:a/b/c" });
    expect(rows[1]).toEqual({ rank: "2", skill: "other", skill_key: "ss:d/e/f" });
  });

  it("handles quoted fields with embedded commas and escaped quotes", () => {
    const text = 'a,b,c\n"x,y","he said ""hi""",z';
    const { rows } = parseCsv(text);

    expect(rows[0]).toEqual({ a: "x,y", b: 'he said "hi"', c: "z" });
  });

  it("trims cell values and tolerates trailing whitespace", () => {
    const text = "skill, vendor\n hello ,  \n";
    const { headers, rows } = parseCsv(text);

    expect(headers).toEqual(["skill", "vendor"]);
    expect(rows[0]).toEqual({ skill: "hello", vendor: "" });
  });

  it("returns empty structures for an empty document", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });
});

describe("toBest100SkillRecords / parseBest100Csv", () => {
  it("maps columns to the record shape and coerces rank to a number", () => {
    const text =
      "rank,skill,skill_key,platform,vendor,url,repo_url,install,description,description_zh,wis\n" +
      "1,find-skills,ss:a/b/c,skills.sh,vercel-labs,https://x,https://github.com/a,cmd,desc,描述,79.5";
    const records = parseBest100Csv(text);

    expect(records).toHaveLength(1);

    const record = records[0];

    expect(record.rank).toBe(1);
    expect(record.skill).toBe("find-skills");
    expect(record.skillKey).toBe("ss:a/b/c");
    expect(record.platform).toBe("skills.sh");
    expect(record.vendor).toBe("vercel-labs");
    expect(record.url).toBe("https://x");
    expect(record.repoUrl).toBe("https://github.com/a");
    expect(record.install).toBe("cmd");
    expect(record.description).toBe("desc");
    expect(record.descriptionZh).toBe("描述");
    expect(record.wis).toBe("79.5");
    expect(record.updatedAt).toBeInstanceOf(Date);
    // Omitted trailing columns are normalized to null.
    expect(record.anomaly).toBeNull();
    expect(record.trust).toBeNull();
  });

  it("normalizes empty optional columns to null", () => {
    const text = "rank,skill,skill_key\n1,find-skills,";
    const [record] = toBest100SkillRecords(parseCsv(text).rows, new Date());

    expect(record.skillKey).toBe("");
    expect(record.platform).toBeNull();
    expect(record.vendor).toBeNull();
    expect(record.url).toBeNull();
  });
});
