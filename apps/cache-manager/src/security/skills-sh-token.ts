import { parseJwtExpiration } from "./jwt";
import type { WorkerBindings } from "../worker-env";

export interface SkillsShTokenProvider {
  getToken(bindings: WorkerBindings): Promise<string>;
  invalidate(token: string): void;
}

type TokenProviderDependencies = {
  fetchImpl: typeof fetch;
  now: () => Date;
};

type CachedToken = {
  expiresAt: number;
  value: string;
};

const expirySkewSeconds = 60;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class TokenBrokerError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null
  ) {
    super(
      `Token broker returned ${status}${retryAfter ? ` (retry after ${retryAfter} seconds)` : ""}`
    );
    this.name = "TokenBrokerError";
  }
}

export const createSkillsShTokenProvider = (
  dependencies: TokenProviderDependencies
): SkillsShTokenProvider => {
  let cachedToken: CachedToken | undefined;
  let refreshPromise: Promise<string> | undefined;

  const hasUsableToken = (): boolean =>
    cachedToken !== undefined &&
    cachedToken.expiresAt - expirySkewSeconds > dependencies.now().getTime() / 1_000;

  const fetchToken = async (bindings: WorkerBindings): Promise<string> => {
    if (!bindings.SKILLS_SH_TOKEN_URL || !bindings.SKILLS_SH_TOKEN_SECRET) {
      throw new Error("Token broker configuration is missing");
    }

    const response = await dependencies.fetchImpl(bindings.SKILLS_SH_TOKEN_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${bindings.SKILLS_SH_TOKEN_SECRET}` }
    });
    if (!response.ok) {
      throw new TokenBrokerError(response.status, response.headers.get("retry-after"));
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    if (
      !isRecord(parsed) ||
      typeof parsed.token !== "string" ||
      !Number.isSafeInteger(parsed.expiresAt)
    ) {
      throw new Error("Token broker returned an invalid response");
    }

    const tokenExpiration = parseJwtExpiration(parsed.token);
    if (
      tokenExpiration === null ||
      tokenExpiration !== parsed.expiresAt ||
      tokenExpiration - expirySkewSeconds <= dependencies.now().getTime() / 1_000
    ) {
      throw new Error("Token broker returned an unusable OIDC token");
    }

    cachedToken = { value: parsed.token, expiresAt: tokenExpiration };
    return parsed.token;
  };

  return {
    async getToken(bindings) {
      if (hasUsableToken()) {
        return cachedToken!.value;
      }
      if (!refreshPromise) {
        refreshPromise = fetchToken(bindings).finally(() => {
          refreshPromise = undefined;
        });
      }
      return refreshPromise;
    },
    invalidate(token) {
      if (cachedToken?.value === token) {
        cachedToken = undefined;
      }
    }
  };
};
