import { ExecutionContext, Hono } from "hono";

import { readStore } from "./lib/kv";
import { runScheduledFetch, type WorkerEnv } from "./lib/scheduler";
import { createDefaultMeta, getBest100SourceUrl } from "./lib/source";
import { renderAdminPage } from "./lib/admin-page";

type Bindings = WorkerEnv & {
  SKILLS_MANAGER_CACHE_ADMIN_TOKEN?: string;
  SKILLS_MANAGER_CACHE_SYNC_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization"
};

app.use("*", async (context, next) => {
  if (context.req.method === "OPTIONS") {
    return context.body(null, 204, CORS_HEADERS);
  }

  await next();
  context.header("access-control-allow-origin", "*");
});

// 同步/读取接口统一用 SKILLS_MANAGER_CACHE_SYNC_TOKEN 鉴权；
// 手动刷新接口 POST /api/refresh 走 admin token（在其 handler 内单独校验），此处跳过。
app.use("/api/*", async (context, next) => {
  if (context.req.method === "OPTIONS") {
    return next();
  }

  if (context.req.path === "/api/refresh") {
    return next();
  }

  if (!isSyncAuthorized(context)) {
    return context.json({ error: "unauthorized" }, 401);
  }

  await next();
});

app.get("/", (context) => {
  return context.json({ ok: true, service: "skills-cache-manager" });
});

app.get("/api/best-100", async (context) => {
  const store = await readStore(context.env);

  if (!store || !store.csv) {
    return context.json({ error: "not_found", message: "Data has not been fetched yet." }, 404);
  }

  return context.json(store);
});

app.get("/api/best-100.csv", async (context) => {
  const store = await readStore(context.env);

  if (!store || !store.csv) {
    return context.body("not found", 404, CORS_HEADERS);
  }

  return context.body(store.csv, 200, {
    ...CORS_HEADERS,
    "content-type": "text/csv; charset=utf-8"
  });
});

app.get("/api/status", async (context) => {
  const store = await readStore(context.env);

  return context.json(store?.meta ?? { status: "idle" });
});

const isAdminAuthorized = (context: import("hono").Context<{ Bindings: Bindings }>): boolean => {
  const expectedToken = context.env.SKILLS_MANAGER_CACHE_ADMIN_TOKEN;

  if (!expectedToken) {
    return false;
  }

  const authorization = context.req.header("authorization");
  const provided =
    authorization?.startsWith("Bearer ") ? authorization.slice(7) : context.req.header("x-admin-token");

  return provided === expectedToken;
};

const isSyncAuthorized = (
  context: import("hono").Context<{ Bindings: Bindings }>
): boolean => {
  const expectedToken = context.env.SKILLS_MANAGER_CACHE_SYNC_TOKEN;

  if (!expectedToken) {
    return false;
  }

  const authorization = context.req.header("authorization");
  const provided = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : context.req.header("x-sync-token");

  return provided === expectedToken;
};

app.post("/api/refresh", async (context) => {
  if (!isAdminAuthorized(context)) {
    return context.json({ error: "unauthorized" }, 401);
  }

  const meta = await runScheduledFetch(context.env, { force: true });

  return context.json({ meta });
});

// ---------------------------------------------------------------------------
// Admin dashboard: controls the *overall* cache (not a single consumer app).
// The HTML shell is public; every /admin/api/* call requires the admin token.
// ---------------------------------------------------------------------------

app.get("/admin", (context) => {
  return context.html(renderAdminPage());
});

app.use("/admin/api/*", async (context, next) => {
  if (context.req.method === "OPTIONS") {
    return next();
  }

  if (!isAdminAuthorized(context)) {
    return context.json({ error: "unauthorized" }, 401);
  }

  await next();
});

app.get("/admin/api/status", async (context) => {
  const store = await readStore(context.env);

  return context.json(store?.meta ?? createDefaultMeta(getBest100SourceUrl()));
});

app.get("/admin/api/best-100", async (context) => {
  const store = await readStore(context.env);

  if (!store || !store.csv) {
    return context.json({ error: "not_found", message: "Data has not been fetched yet." }, 404);
  }

  return context.json(store);
});

app.post("/admin/api/refresh", async (context) => {
  const meta = await runScheduledFetch(context.env, { force: true });

  return context.json({ meta });
});

export default {
  fetch: app.fetch,
  async scheduled(
    controller: ScheduledController,
    env: Bindings,
    context: ExecutionContext
  ): Promise<void> {
    context.waitUntil(
      runScheduledFetch(env).then((meta) => {
        console.log(`[best-100] scheduled run finished with status=${meta.status}.`);
      })
    );
    // Avoid unused-variable lint on the controller param (no cancellation handling needed).
    void controller;
  }
} satisfies ExportedHandler<Bindings>;
