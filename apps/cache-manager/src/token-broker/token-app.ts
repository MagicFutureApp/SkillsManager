import { Hono, type Context } from "hono";

import { parseJwtExpiration } from "../security/jwt";
import { matchesBearerToken } from "../security/shared-secret";

type TokenAppDependencies = {
  expectedSecret: string | undefined;
  getOidcToken: () => Promise<string>;
  now?: () => Date;
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
