import { chromium } from "playwright-core";

export const config = { maxDuration: 280 };

function parseLinks(raw) {
  return String(raw || "")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s && /\/srn\//.test(s));
}

function srnId(url) {
  const m = String(url).match(/\/srn\/([^/?#]+)/);
  return m ? m[1] : url;
}

async function approveOne(page, link, businessTimeoutMs) {
  await page.goto(link, { waitUntil: "domcontentloaded", timeout: 30000 });

  const businessBtn = page.getByRole("button", { name: "Business Confirmation" });
  try {
    await businessBtn.waitFor({ state: "visible", timeout: businessTimeoutMs });
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

  const confirmBtn = page.getByRole("button", { name: "Confirm", exact: true });
  try {
    await confirmBtn.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return { status: "skipped", message: "Confirm dialog did not appear" };
  }
  await confirmBtn.click();

  const closeBtn = page.getByRole("button", { name: "Close", exact: true });
  try {
    await closeBtn.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    return { status: "error", message: "Success dialog did not appear after confirming" };
  }
  await closeBtn.click();

  return { status: "approved", message: "SRN confirmed successfully" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.BROWSERBASE_API_KEY;
  const { sessionId, links: rawLinks } = req.body || {};
  const links = parseLinks(rawLinks);

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });
  const send = (obj) => {
    res.write(JSON.stringify(obj) + "\n");
    if (res.flush) res.flush();
  };

  if (!apiKey) {
    send({ type: "fatal", message: "Server missing Browserbase credentials" });
    res.end();
    return;
  }
  if (!sessionId) {
    send({ type: "fatal", message: "No active session. Click Start Session first." });
    res.end();
    return;
  }
  if (links.length === 0) {
    send({ type: "fatal", message: "No valid SRN links found. Paste links that contain /srn/..." });
    res.end();
    return;
  }

  const connectUrl = `wss://connect.browserbase.com?apiKey=${encodeURIComponent(apiKey)}&sessionId=${encodeURIComponent(sessionId)}`;

  let browser;
  try {
    browser = await chromium.connectOverCDP(connectUrl);
  } catch (err) {
    send({ type: "fatal", message: "Could not connect to the browser session: " + ((err && err.message) || err) });
    res.end();
    return;
  }

  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  send({ type: "start", total: links.length });

  let approved = 0;
  let skipped = 0;
  let errored = 0;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const id = srnId(link);
    send({ type: "progress", index: i, total: links.length, id });

    let result;
    try {
      result = await approveOne(page, link, i === 0 ? 120000 : 20000);
    } catch (err) {
      result = { status: "error", message: String((err && err.message) || err) };
    }

    if (result.status === "approved") approved++;
    else if (result.status === "skipped") skipped++;
    else errored++;

    send({ type: "result", id, status: result.status, message: result.message, approved, skipped, errored });
  }

  send({ type: "done", approved, skipped, errored, total: links.length });
  res.end();
}
