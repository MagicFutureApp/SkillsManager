import type { RepositoryProviderName } from "./repository-api";

export type RepositorySourceInspection = {
  about?: string;
  branch?: string;
  name?: string;
  patterns?: string[];
  provider?: RepositoryProviderName;
};

type InspectOptions = {
  fetchJson?: (url: string) => Promise<unknown>;
};

type ParsedSourceUrl = {
  name: string;
  owner: string;
  provider: RepositoryProviderName;
  repo: string;
};

type GitHubRepositoryResponse = {
  default_branch?: unknown;
  description?: unknown;
};

type GitHubTreeResponse = {
  tree?: Array<{
    path?: unknown;
    type?: unknown;
  }>;
};

const defaultFetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "skills-manager"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to inspect source: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
};

export const inspectRepositorySource = async (
  remoteUrl: string,
  options: InspectOptions = {}
): Promise<RepositorySourceInspection> => {
  const parsedUrl = parseSourceUrl(remoteUrl);

  if (!parsedUrl) {
    return {};
  }

  const fallback: RepositorySourceInspection = {
    name: parsedUrl.name,
    patterns: ["skills/*/SKILL.md"],
    provider: parsedUrl.provider
  };

  if (parsedUrl.provider !== "GitHub") {
    return fallback;
  }

  const fetchJson = options.fetchJson ?? defaultFetchJson;

  try {
    const repository = parseGitHubRepositoryResponse(
      await fetchJson(`https://api.github.com/repos/${parsedUrl.owner}/${parsedUrl.repo}`)
    );
    const branch = repository.branch ?? "main";
    const tree = parseGitHubTreeResponse(
      await fetchJson(
        `https://api.github.com/repos/${parsedUrl.owner}/${parsedUrl.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
      )
    );

    return {
      ...fallback,
      about: repository.about,
      branch,
      patterns: deriveSkillPatterns(tree)
    };
  } catch {
    return fallback;
  }
};

const parseSourceUrl = (remoteUrl: string): ParsedSourceUrl | null => {
  const trimmedUrl = normalizeSourceInput(remoteUrl);
  const sshMatch = /^git@(?<host>[^:]+):(?<owner>[^/]+)\/(?<repo>.+?)(?:\.git)?$/i.exec(trimmedUrl);

  if (sshMatch?.groups) {
    return buildParsedSourceUrl(sshMatch.groups.host, sshMatch.groups.owner, sshMatch.groups.repo);
  }

  try {
    const url = new URL(trimmedUrl);
    const [owner, repo] = url.pathname.replace(/^\/+/, "").split("/");

    if (!owner || !repo) {
      return null;
    }

    return buildParsedSourceUrl(url.hostname, owner, repo.replace(/\.git$/i, ""));
  } catch {
    return null;
  }
};

const normalizeSourceInput = (remoteUrl: string): string => {
  const trimmedUrl = remoteUrl.trim();
  const markdownMatch = /^\[[^\]]+\]\((?<url>[^)]+)\)$/.exec(trimmedUrl);
  const extractedUrl = markdownMatch?.groups?.url ?? trimmedUrl;

  if (/^(github\.com|gitlab\.com|bitbucket\.org)\//i.test(extractedUrl)) {
    return `https://${extractedUrl}`;
  }

  return extractedUrl;
};

const buildParsedSourceUrl = (
  host: string,
  owner: string,
  repo: string
): ParsedSourceUrl | null => {
  const provider = providerByHost(host);

  if (!provider) {
    return null;
  }

  const normalizedRepo = repo.replace(/\.git$/i, "");

  return {
    name: `${owner}/${normalizedRepo}`,
    owner,
    provider,
    repo: normalizedRepo
  };
};

const providerByHost = (host: string): RepositoryProviderName | null => {
  const normalizedHost = host.toLowerCase();

  if (normalizedHost === "github.com") {
    return "GitHub";
  }

  if (normalizedHost === "gitlab.com") {
    return "GitLab";
  }

  if (normalizedHost === "bitbucket.org") {
    return "Bitbucket";
  }

  return null;
};

const parseGitHubRepositoryResponse = (response: unknown): { about?: string; branch?: string } => {
  if (!response || typeof response !== "object") {
    return {};
  }

  const repository = response as GitHubRepositoryResponse;

  return {
    about: typeof repository.description === "string" ? repository.description : undefined,
    branch: typeof repository.default_branch === "string" ? repository.default_branch : undefined
  };
};

const parseGitHubTreeResponse = (response: unknown): string[] => {
  if (!response || typeof response !== "object") {
    return [];
  }

  const tree = (response as GitHubTreeResponse).tree ?? [];

  return tree
    .filter((entry) => entry.type === "blob" && typeof entry.path === "string")
    .map((entry) => entry.path as string);
};

const deriveSkillPatterns = (paths: string[]): string[] => {
  const skillPaths = paths.filter((path) => path.endsWith("SKILL.md"));

  if (skillPaths.length === 0) {
    return ["skills/*/SKILL.md"];
  }

  if (skillPaths.includes("SKILL.md")) {
    return ["SKILL.md"];
  }

  if (skillPaths.length === 1) {
    return skillPaths;
  }

  return Array.from(new Set(skillPaths.map(toSkillPattern))).sort();
};

const toSkillPattern = (path: string): string => {
  const segments = path.split("/");

  if (segments.length === 2) {
    return "*/SKILL.md";
  }

  return `${segments[0]}/*/SKILL.md`;
};
