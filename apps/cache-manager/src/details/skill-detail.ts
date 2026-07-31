export type SkillReference = {
  source: string;
  skill: string;
};

const referenceSegmentPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseSkillReference = (
  sourceValue: string | undefined,
  skillValue: string | undefined
): SkillReference | null => {
  if (!sourceValue || !skillValue || sourceValue.length > 200 || skillValue.length > 100) {
    return null;
  }

  const sourceSegments = sourceValue.split("/");
  if (
    sourceSegments.length === 0 ||
    !sourceSegments.every((segment) => referenceSegmentPattern.test(segment)) ||
    !referenceSegmentPattern.test(skillValue)
  ) {
    return null;
  }

  return { source: sourceSegments.join("/"), skill: skillValue };
};

export const parseSkillReferencePath = (path: string, prefix: string): SkillReference | null => {
  if (!path.startsWith(prefix)) {
    return null;
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(path.slice(prefix.length));
  } catch {
    return null;
  }

  const segments = decodedPath.split("/");
  const skill = segments.pop();
  return parseSkillReference(segments.join("/"), skill);
};

export const buildSkillsShDetailUrl = (reference: SkillReference): string => {
  const path = [...reference.source.split("/"), reference.skill]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://skills.sh/api/v1/skills/${path}`;
};

export const projectSkillDetailBody = (body: string): string | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  if (
    !isRecord(parsed) ||
    typeof parsed.id !== "string" ||
    typeof parsed.source !== "string" ||
    typeof parsed.slug !== "string"
  ) {
    return null;
  }

  const { files: _files, ...projected } = parsed;
  return JSON.stringify(projected);
};
