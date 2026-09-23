/**
 * Self-contained admin dashboard for the cache-manager Worker.
 *
 * Served as a single HTML document (inline CSS + vanilla JS, no build step)
 * from the `/admin` route. It reads the current global best-100 cache and
 * triggers a manual refresh via the admin-token-protected `/admin/api/*`
 * endpoints. This is the "control the overall cache" surface — distinct from
 * any single consumer app's local view.
 */
export const renderAdminPage = (): string => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>缓存管理 · Skills Manager</title>
<style>
  :root {
    --bg: #f6f7f9;
    --panel: #ffffff;
    --border: #e5e7eb;
    --text: #1f2330;
    --muted: #6b7280;
    --accent: #4f46e5;
    --accent-hover: #4338ca;
    --ok: #16a34a;
    --bad: #dc2626;
    --idle: #6b7280;
    --warn: #b45309;
    --shadow: 0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 28px 20px 56px; }
  header.top {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; margin-bottom: 22px;
  }
  .title h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: .2px; }
  .title p { margin: 0; color: var(--muted); font-size: 13px; }
  .tokenbar { display: flex; align-items: center; gap: 8px; }
  .tokenbar input {
    width: 280px; max-width: 56vw; padding: 8px 10px; font-size: 13px;
    border: 1px solid var(--border); border-radius: 8px; background: #fff;
    color: var(--text); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .tokenbar input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,70,229,.15); }
  button {
    font: inherit; cursor: pointer; border: 1px solid var(--border);
    background: #fff; color: var(--text); padding: 8px 14px; border-radius: 8px;
    transition: background .15s, border-color .15s, opacity .15s;
  }
  button:hover { background: #f3f4f6; }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button.primary:hover { background: var(--accent-hover); }
  button:disabled { opacity: .55; cursor: not-allowed; }
  button.loading { position: relative; }
  button.loading::after {
    content: ""; position: absolute; right: 10px; top: 50%; width: 12px; height: 12px;
    margin-top: -6px; border: 2px solid rgba(255,255,255,.5); border-top-color: #fff;
    border-radius: 50%; animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; box-shadow: var(--shadow); }
  .card-t { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  .card-v { font-size: 14px; font-weight: 600; word-break: break-all; }
  .src { font-size: 12px; font-weight: 500; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

  .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
  .toolbar .count { color: var(--muted); font-size: 13px; }
  .msg { font-size: 13px; margin-left: auto; }
  .msg-ok { color: var(--ok); }
  .msg-bad { color: var(--bad); }
  .msg-warn { color: var(--warn); }

  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #fff; }
  .badge-ok { background: var(--ok); }
  .badge-bad { background: var(--bad); }
  .badge-idle { background: var(--idle); }

  .tablecard { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); overflow: hidden; }
  .table-scroll { overflow: auto; max-height: 62vh; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  thead th {
    position: sticky; top: 0; background: #f9fafb; text-align: left;
    padding: 10px 14px; border-bottom: 1px solid var(--border); white-space: nowrap;
    font-weight: 600; color: var(--muted); z-index: 1;
  }
  tbody td { padding: 9px 14px; border-bottom: 1px solid #f1f2f4; white-space: nowrap; }
  tbody tr:nth-child(even) { background: #fcfcfd; }
  tbody tr:hover { background: #f1f0ff; }
  .empty { padding: 40px; text-align: center; color: var(--muted); }
</style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <div class="title">
        <h1>缓存管理 · Skills Manager</h1>
        <p>全局 best-100 缓存（cache-manager）的查看与手动同步</p>
      </div>
      <div class="tokenbar">
        <input id="token" type="password" placeholder="Admin Token" autocomplete="off" />
        <button id="reload">重新加载</button>
      </div>
    </header>

    <div class="cards" id="status"></div>

    <div class="toolbar">
      <button id="sync" class="primary">同步最新</button>
      <span class="count" id="count"></span>
      <span class="msg" id="msg"></span>
    </div>

    <div class="tablecard">
      <div class="table-scroll" id="table">
        <div class="empty">填入 Admin Token 后自动加载</div>
      </div>
    </div>
  </div>

<script>
(function () {
  var token = localStorage.getItem("cm_admin_token") || "";
  var tokenInput = document.getElementById("token");
  var syncBtn = document.getElementById("sync");
  var statusEl = document.getElementById("status");
  var tableEl = document.getElementById("table");
  var msgEl = document.getElementById("msg");
  var countEl = document.getElementById("count");

  tokenInput.value = token;

  function setMsg(text, kind) {
    msgEl.textContent = text || "";
    msgEl.className = "msg" + (kind ? " msg-" + kind : "");
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (token) { headers["authorization"] = "Bearer " + token; }
    return fetch(path, { method: opts.method || "GET", headers: headers });
  }

  function fmt(ts) {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString(); } catch (e) { return ts; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function card(title, valueHtml) {
    var d = document.createElement("div");
    d.className = "card";
    d.innerHTML = '<div class="card-t">' + title + '</div><div class="card-v">' + valueHtml + "</div>";
    return d;
  }

  function renderStatus(meta) {
    var cls = meta.status === "success" ? "ok" : (meta.status === "failed" ? "bad" : "idle");
    var label = meta.status === "success" ? "成功" : (meta.status === "failed" ? "失败" : "空闲");
    statusEl.innerHTML = "";
    statusEl.appendChild(card("同步状态", '<span class="badge badge-' + cls + '">' + label + "</span>"));
    statusEl.appendChild(card("最近成功", fmt(meta.lastSuccessAt)));
    statusEl.appendChild(card("最近尝试", fmt(meta.lastAttemptAt)));
    statusEl.appendChild(card("来源", '<span class="src">' + esc(meta.source || "—") + "</span>"));
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = "";
    var i = 0;
    var inQuotes = false;
    while (i < text.length) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\\r") { i++; continue; }
      if (c === "\\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(function (r) {
      return r.length > 1 || (r.length === 1 && r[0].trim() !== "");
    });
  }

  function renderTable(csv) {
    var rows = parseCsv(csv);
    if (rows.length === 0) { tableEl.innerHTML = '<div class="empty">暂无数据</div>'; countEl.textContent = ""; return; }
    var html = "<table><thead><tr>";
    rows[0].forEach(function (h) { html += "<th>" + esc(h) + "</th>"; });
    html += "</tr></thead><tbody>";
    for (var r = 1; r < rows.length; r++) {
      html += "<tr>";
      rows[r].forEach(function (c) { html += "<td>" + esc(c) + "</td>"; });
      html += "</tr>";
    }
    html += "</tbody></table>";
    tableEl.innerHTML = html;
    countEl.textContent = (rows.length - 1) + " 行";
  }

  async function load() {
    if (!token) { setMsg("请先填入 Admin Token", "warn"); return; }
    setMsg("加载中…");
    try {
      var s = await api("/admin/api/status");
      if (!s.ok) throw new Error("status " + s.status);
      var meta = await s.json();
      renderStatus(meta);
      if (meta.lastError) { setMsg("最近错误：" + meta.lastError, "bad"); }
      var d = await api("/admin/api/best-100");
      if (d.status === 404) {
        tableEl.innerHTML = '<div class="empty">缓存尚未生成，点击「同步最新」</div>';
        countEl.textContent = "";
        if (!meta.lastError) setMsg("缓存尚未生成，点击同步最新。", "warn");
        return;
      }
      if (!d.ok) throw new Error("data " + d.status);
      var store = await d.json();
      renderTable(store.csv);
      setMsg("已加载", "ok");
    } catch (e) {
      setMsg("加载失败：" + e.message, "bad");
    }
  }

  async function sync() {
    if (!token) { setMsg("请先填入 Admin Token", "warn"); return; }
    syncBtn.disabled = true;
    syncBtn.classList.add("loading");
    setMsg("同步中…");
    try {
      var r = await api("/admin/api/refresh", { method: "POST" });
      if (!r.ok) {
        var b = await r.json().catch(function () { return {}; });
        throw new Error(b.error || ("HTTP " + r.status));
      }
      await r.json();
      setMsg("同步完成", "ok");
      await load();
    } catch (e) {
      setMsg("同步失败：" + e.message, "bad");
    } finally {
      syncBtn.disabled = false;
      syncBtn.classList.remove("loading");
    }
  }

  tokenInput.addEventListener("input", function () {
    token = tokenInput.value.trim();
    if (token) { localStorage.setItem("cm_admin_token", token); } else { localStorage.removeItem("cm_admin_token"); }
  });
  syncBtn.addEventListener("click", sync);
  document.getElementById("reload").addEventListener("click", load);

  if (token) { load(); }
})();
</script>
</body>
</html>`;
