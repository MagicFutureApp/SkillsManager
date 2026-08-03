import { getVercelOidcToken } from "@vercel/oidc";
import { handle } from "hono/vercel";

import { createTokenApp } from "../src/token-app.js";

const app = createTokenApp({
  expectedSecret: process.env.SKILLS_SH_TOKEN_SECRET,
  getOidcToken: getVercelOidcToken
});

export default handle(app);
