/*
  SRN Approver — a single script your manager runs whenever there are SRNs to approve.

  What it does:
    1. Opens a real Chrome window.
    2. Shows a page to paste SRN links into.
    3. Navigates to each link — if not logged in to ServicePO, the real login
       page appears right there and your manager logs in normally.
    4. Once logged in, it clicks Business Confirmation -> Confirm -> Close for
       every pasted link, showing live progress, until all are done.

  One-time setup (a plain .html file cannot launch or control a real browser —
  that requires Node.js + Playwright; this is a one-time install, not a
  per-run step):
    1. Install Node.js from https://nodejs.org (if not already installed).
    2. Open a terminal in the folder with this file and run:
         npm install playwright
         npx playwright install chromium

  To run it (every time you have SRNs to approve):
    node srn-approver.js

  Your manager only has to log in to ServicePO once — the session is saved
  next to this script (in .spo-session/) and reused on future runs.
*/

const path = require("path");
const { chromium } = require("playwright");

const SESSION_DIR = path.join(__dirname, ".spo-session");
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000; // generous, covers manual login + MFA

const UI_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>SRN Approver</title>
<style>
  :root { --orange: #f3762a; --ink: #111827; --muted: #6b7280; --line: #e5e7eb; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, sans-serif; color: var(--ink); background: #f7f7f8; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 32px 20px 60px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.lead { color: var(--muted); margin-top: 0; }
  textarea {
    width: 100%; height: 160px; border: 1px solid var(--line); border-radius: 8px;
    padding: 10px; font-family: monospace; font-size: 12px; resize: vertical; box-sizing: border-box;
  }
  button {
    margin-top: 12px; width: 100%; padding: 12px; border: none; border-radius: 8px;
    background: var(--orange); color: #fff; font-weight: 700; font-size: 15px; cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: default; }
  .progress-wrap { margin-top: 18px; display: none; }
  .bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin: 8px 0 12px; }
  .bar-fill { height: 100%; width: 0; background: var(--orange); transition: width 0.2s; }
  .summary { display: flex; gap: 14px; font-size: 13px; margin-bottom: 10px; }
  .summary span.approved { color: #1a7f37; }
  .summary span.skipped { color: #9a6700; }
  .summary span.errored { color: #b91c1c; }
  .results { border-top: 1px solid #f0f0f0; }
  .row { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .row .icon { font-weight: 700; width: 16px; }
  .row .id { font-family: monospace; font-size: 12px; }
  .row .msg { color: var(--muted); font-size: 11px; }
  .icon.approved { color: #1a7f37; }
  .icon.skipped { color: #9a6700; }
  .icon.error { color: #b91c1c; }
  .final {
    margin-top: 16px; padding: 14px; border-radius: 10px; font-weight: 700; font-size: 15px;
    background: #eafaf0; color: #1a7f37; display: none;
  }
  .note { font-size: 12px; color: var(--muted); margin-top: 10px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>SRN Approver</h1>
    <p class="lead">Paste all SRN links (one per line), then click Approve. A second window will open to log in to ServicePO if needed, then each SRN is confirmed in turn.</p>

    <textarea id="links" placeholder="https://service-po.noon.team/srn/...&#10;https://service-po.noon.team/srn/..."></textarea>
    <button id="run">Approve SRNs</button>
    <p class="note">If you're not logged in to ServicePO, the login page will appear in the other window — log in there, then this will continue automatically.</p>

    <div class="progress-wrap" id="progressWrap">
      <div id="statusLine" style="font-weight:600;"></div>
      <div class="bar"><div class="bar-fill" id="barFill"></div></div>
      <div class="summary">
        <span class="approved" id="cApproved">approved 0</span>
        <span class="skipped" id="cSkipped">skipped 0</span>
        <span class="errored" id="cErrored">errors 0</span>
      </div>
      <div class="results" id="results"></div>
      <div class="final" id="final"></div>
    </div>
  </div>

  <script>
    const ICONS = { approved: "OK", skipped: "-", error: "X" };

    function addResult(id, status, message) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML =
        '<span class="icon ' + status + '">' + (ICONS[status] || "?") + "</span>" +
        '<span><span class="id">' + id + "</span>" +
        '<div class="msg">' + message + "</div></span>";
      document.getElementById("results").appendChild(row);
    }

    window.__onEvent = function (evt) {
      const progressWrap = document.getElementById("progressWrap");
      const statusLine = document.getElementById("statusLine");
      const barFill = document.getElementById("barFill");
      const cApproved = document.getElementById("cApproved");
      const cSkipped = document.getElementById("cSkipped");
      const cErrored = document.getElementById("cErrored");
      const finalEl = document.getElementById("final");

      progressWrap.style.display = "block";

      if (evt.type === "waiting_login") {
        statusLine.textContent = "Waiting for ServicePO login in the other window...";
      } else if (evt.type === "start") {
        statusLine.textContent = "Approving 1 of " + evt.total + "...";
      } else if (evt.type === "progress") {
        statusLine.textContent = "Approving " + (evt.index + 1) + " of " + evt.total + "...";
        barFill.style.width = Math.round((evt.index / evt.total) * 100) + "%";
      } else if (evt.type === "result") {
        cApproved.textContent = "approved " + evt.approved;
        cSkipped.textContent = "skipped " + evt.skipped;
        cErrored.textContent = "errors " + evt.errored;
        addResult(evt.id, evt.status, evt.message);
      } else if (evt.type === "done") {
        barFill.style.width = "100%";
        statusLine.textContent = "Finished";
        finalEl.style.display = "block";
        finalEl.textContent =
          evt.errored === 0 && evt.skipped === 0
            ? "All SRNs approved"
            : "Finished - all links processed";
      } else if (evt.type === "fatal") {
        statusLine.textContent = "Error: " + evt.message;
      }
    };

    document.getElementById("run").addEventListener("click", () => {
      const btn = document.getElementById("run");
      btn.disabled = true;
      document.getElementById("results").innerHTML = "";
      window.startApproval(document.getElementById("links").value).finally(() => {
        btn.disabled = false;
      });
    });
  </script>
</body>
</html>`;

function parseLinks(raw) {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s && /\/srn\//.test(s));
}

function srnId(url) {
  const m = String(url).match(/\/srn\/([^/?#]+)/);
  return m ? m[1] : url;
}

async function approveOne(workPage, link, { waitForLogin }) {
  await workPage.goto(link, { waitUntil: "domcontentloaded", timeout: 30000 });

  const businessBtn = workPage.getByRole("button", { name: "Business Confirmation" });
  try {
    await businessBtn.waitFor({
      state: "visible",
      timeout: waitForLogin ? LOGIN_TIMEOUT_MS : 20000,
    });
  } catch {
    return { status: "error", message: "Business Confirmation button not found (login may not have completed)" };
  }

  if (await businessBtn.isDisabled()) {
    return {
      status: "skipped",
      message: "Business Confirmation disabled (already confirmed or not permitted)",
    };
  }

  await businessBtn.click();

  const confirmBtn = workPage.getByRole("button", { name: "Confirm", exact: true });
  try {
    await confirmBtn.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return { status: "skipped", message: "Confirm dialog did not appear" };
  }
  await confirmBtn.click();

  const closeBtn = workPage.getByRole("button", { name: "Close", exact: true });
  try {
    await closeBtn.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    return { status: "error", message: "Success dialog did not appear after confirming" };
  }
  await closeBtn.click();

  return { status: "approved", message: "SRN confirmed successfully" };
}

async function main() {
  const context = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    viewport: { width: 1000, height: 800 },
  });

  const uiPage = context.pages()[0] || (await context.newPage());
  await uiPage.setContent(UI_HTML);

  const emit = (evt) => uiPage.evaluate((e) => window.__onEvent(e), evt).catch(() => {});

  await uiPage.exposeFunction("startApproval", async (raw) => {
    const links = parseLinks(String(raw || ""));
    if (links.length === 0) {
      await emit({ type: "fatal", message: "No valid SRN links found. Paste links that contain /srn/..." });
      return;
    }

    const workPage = await context.newPage();
    await emit({ type: "start", total: links.length });

    let approved = 0;
    let skipped = 0;
    let errored = 0;

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const id = srnId(link);
      await emit({ type: "progress", index: i, total: links.length, id });
      if (i === 0) await emit({ type: "waiting_login" });

      let result;
      try {
        result = await approveOne(workPage, link, { waitForLogin: i === 0 });
      } catch (err) {
        result = { status: "error", message: String((err && err.message) || err) };
      }

      if (result.status === "approved") approved++;
      else if (result.status === "skipped") skipped++;
      else errored++;

      await emit({ type: "result", id, status: result.status, message: result.message, approved, skipped, errored });
    }

    await emit({ type: "done", approved, skipped, errored, total: links.length });
    await workPage.close();
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error("SRN Approver failed to start:", err);
    process.exit(1);
  });
}

module.exports = { parseLinks, srnId, approveOne, UI_HTML, main };
