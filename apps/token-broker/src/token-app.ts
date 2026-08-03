import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

import { Hono, type Context } from "hono";

type TokenAppDependencies = {
  expectedSecret: string | undefined;
  getOidcToken: () => Promise<string>;
  now?: () => Date;
};

const parseJwtExpiration = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("exp" in payload) ||
      !Number.isSafeInteger(payload.exp) ||
      Number(payload.exp) <= 0
    ) {
      return null;
    }
    return Number(payload.exp);
  } catch {
    return null;
  }
};

const matchesBearerToken = (authorization: string | undefined, expected: string): boolean => {
  if (!authorization?.startsWith("Bearer ") || expected.length === 0) {
    return false;
  }

  const actualBytes = Buffer.from(authorization.slice("Bearer ".length));
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
};

const setNoStoreHeaders = (context: Context): void => {
  context.header("Cache-Control", "no-store");
  context.header("Pragma", "no-cache");
};

export const createTokenApp = (dependencies: TokenAppDependencies) => {
  const app = new Hono();
  const now = dependencies.now ?? (() => new Date());

  const handler = async (context: Context) => {
    setNoStoreHeaders(context);
    if (!dependencies.expectedSecret) {
      return context.json(
        { error: "token_broker_not_configured", message: "The token broker is not configured." },
        503
      );
    }
    if (!matchesBearerToken(context.req.header("authorization"), dependencies.expectedSecret)) {
      return context.json(
        { error: "unauthorized", message: "A valid token broker secret is required." },
        401
      );
    }

    let token: string;
    try {
      token = await dependencies.getOidcToken();
    } catch {
      return context.json(
        {
          error: "oidc_unavailable",
          message: "A valid request-scoped OIDC token is unavailable."
        },
        502
      );
    }

    const expiresAt = parseJwtExpiration(token);
    if (expiresAt === null || expiresAt <= now().getTime() / 1_000) {
      return context.json(
        {
          error: "oidc_unavailable",
          message: "A valid request-scoped OIDC token is unavailable."
        },
        502
      );
    }

    return context.json({ token, expiresAt });
  };

  app.post("/", (context) => handler(context));
  app.post("/api/token", (context) => handler(context));
  return app;
};
