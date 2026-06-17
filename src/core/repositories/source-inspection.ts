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
  githubToken?: string;
  isDevelopment?: boolean;
  logger?: Pick<Console, "warn">;
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

const defaultFetchJson = async (url: string, githubToken?: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
      "User-Agent": "skills-manager"
    }
  });

  if (!response.ok) {
    throw new GitHubApiHttpError({
      acceptedPermissions: response.headers.get("x-accepted-github-permissions") ?? undefined,
      message: await readGitHubErrorMessage(response),
      rateLimitRemaining: response.headers.get("x-ratelimit-remaining") ?? undefined,
      rateLimitReset: response.headers.get("x-ratelimit-reset") ?? undefined,
      retryAfter: response.headers.get("retry-after") ?? undefined,
      status: response.status
    });
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
    provider: parsedUrl.provider
  };

  if (parsedUrl.provider !== "GitHub") {
    return fallback;
  }

  const fetchJson =
    options.fetchJson ?? ((url: string) => defaultFetchJson(url, options.githubToken));

  let repository: { about?: string; branch?: string };

  try {
    repository = parseGitHubRepositoryResponse(
      await fetchJson(`https://api.github.com/repos/${parsedUrl.owner}/${parsedUrl.repo}`)
    );
  } catch (error) {
    logDevelopmentInspectionError({
      error,
      message: "Failed to inspect GitHub repository metadata.",
      options,
      remoteUrl
    });

    throw toRepositorySourceInspectionError(error);
  }

  const branch = repository.branch ?? "main";

  try {
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
  } catch (error) {
    logDevelopmentInspectionError({
      error,
      message: "Failed to inspect GitHub repository tree.",
      options,
      remoteUrl
    });

    throw toRepositorySourceInspectionError(error);
  }
};

class RepositorySourceInspectionNetworkError extends Error {
  constructor(
    message = "网络连接中断，暂时无法解析这个 GitHub 来源。请稍后重试，或检查代理/VPN 后再新增。"
  ) {
    super(message);
    this.name = "RepositorySourceInspectionNetworkError";
  }
}

class GitHubApiHttpError extends Error {
  readonly acceptedPermissions?: string;
  readonly rateLimitRemaining?: string;
  readonly rateLimitReset?: string;
  readonly retryAfter?: string;
  readonly status: number;

  constructor({
    acceptedPermissions,
    message,
    rateLimitRemaining,
    rateLimitReset,
    retryAfter,
    status
  }: {
    acceptedPermissions?: string;
    message?: string;
    rateLimitRemaining?: string;
    rateLimitReset?: string;
    retryAfter?: string;
    status: number;
  }) {
    super(message || `GitHub API request failed with status ${status}.`);
    this.acceptedPermissions = acceptedPermissions;
    this.name = "GitHubApiHttpError";
    this.rateLimitRemaining = rateLimitRemaining;
    this.rateLimitReset = rateLimitReset;
    this.retryAfter = retryAfter;
    this.status = status;
  }
}

const readGitHubErrorMessage = async (response: Response): Promise<string | undefined> => {
  try {
    const body = (await response.json()) as unknown;

    if (
      body &&
      typeof body === "object" &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const toRepositorySourceInspectionError = (
  error: unknown
): RepositorySourceInspectionNetworkError => {
  if (error instanceof GitHubApiHttpError) {
    return new RepositorySourceInspectionNetworkError(toGitHubApiUserMessage(error));
  }

  return new RepositorySourceInspectionNetworkError();
};

const toGitHubApiUserMessage = (error: GitHubApiHttpError): string => {
  if (error.retryAfter) {
    return `GitHub API 暂时限流，请约 ${error.retryAfter} 秒后重试。`;
  }

  if (isGitHubPrimaryRateLimitError(error)) {
    if (error.rateLimitReset) {
      return `GitHub API 访问频率已达上限，请在 ${new Date(Number(error.rateLimitReset) * 1000).toISOString()} 后重试。`;
    }

    return "GitHub API 访问频率已达上限，请稍后重试。";
  }

  if (isGitHubSecondaryRateLimitError(error)) {
    return "GitHub API 暂时限流，请稍后重试。";
  }

  if (isGitHubPermissionError(error)) {
    return "GitHub token 权限不足，需要 Metadata read 权限后才能解析这个来源。";
  }

  if (error.status === 403) {
    return "GitHub 拒绝访问该仓库，请确认仓库是否可访问或认证配置是否正确。";
  }

  return "网络连接中断，暂时无法解析这个 GitHub 来源。请稍后重试，或检查代理/VPN 后再新增。";
};

const isGitHubPrimaryRateLimitError = (error: GitHubApiHttpError): boolean => {
  return error.rateLimitRemaining === "0";
};

const isGitHubSecondaryRateLimitError = (error: GitHubApiHttpError): boolean => {
  return error.status === 429 || /rate limit/i.test(error.message);
};

const isGitHubPermissionError = (error: GitHubApiHttpError): boolean => {
  return /resource not accessible/i.test(error.message);
};

const logDevelopmentInspectionError = ({
  error,
  message,
  options,
  remoteUrl
}: {
  error: unknown;
  message: string;
  options: InspectOptions;
  remoteUrl: string;
}): void => {
  if (!options.isDevelopment) {
    return;
  }

  (options.logger ?? console).warn(message, { error, remoteUrl });
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

export const deriveSkillPatterns = (paths: string[]): string[] => {
  const skillPaths = Array.from(
    new Set(paths.filter((path) => path === "SKILL.md" || path.endsWith("/SKILL.md")))
  ).sort();

  if (skillPaths.length === 0) {
    return [];
  }

  const rootSkillPatterns = skillPaths.filter((path) => path === "SKILL.md");
  const topLevelSkillPaths = skillPaths.filter((path) => path.split("/").length === 2);
  const nestedSkillPatterns = Array.from(
    new Set(
      skillPaths
        .filter((path) => path.split("/").length > 2)
        .map((path) => `${path.split("/").slice(0, -2).join("/")}/*/SKILL.md`)
    )
  );

  if (!rootSkillPatterns.length && !nestedSkillPatterns.length && topLevelSkillPaths.length > 1) {
    return ["*/SKILL.md"];
  }

  return [...rootSkillPatterns, ...nestedSkillPatterns, ...topLevelSkillPaths].sort();
};
