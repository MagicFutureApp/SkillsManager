import { getVercelOidcToken } from "@vercel/oidc";

import { createTokenApp } from "../src/token-app.js";

const app = createTokenApp({
  expectedSecret: process.env.SKILLS_SH_TOKEN_SECRET,
  getOidcToken: getVercelOidcToken
});

export function POST(request: Request): Response | Promise<Response> {
  return app.fetch(request);
}
