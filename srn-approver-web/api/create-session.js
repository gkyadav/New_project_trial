import { chromium } from "playwright-core";

export const config = { maxDuration: 60 };

const LOGIN_URL = "https://service-po.noon.team/po?nubsub_code=NS00011AE";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    res.status(500).json({ error: "Server missing Browserbase credentials" });
    return;
  }

  try {
    const createRes = await fetch("https://api.browserbase.com/v1/sessions", {
      method: "POST",
      headers: {
        "X-BB-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectId, timeout: 900 }),
    });

    if (!createRes.ok) {
      const detail = await createRes.text();
      res.status(502).json({ error: "Failed to create Browserbase session", detail });
      return;
    }

    const session = await createRes.json();

    try {
      const connectUrl = `wss://connect.browserbase.com?apiKey=${encodeURIComponent(apiKey)}&sessionId=${encodeURIComponent(session.id)}`;
      const browser = await chromium.connectOverCDP(connectUrl);
      const context = browser.contexts()[0] || (await browser.newContext());

      // Persists across the login redirect chain, not just the first page.
      await context.addInitScript(() => {
        const applyZoom = () => {
          const style = document.createElement("style");
          style.textContent = "html { zoom: 1.5 !important; }";
          document.head.appendChild(style);
        };
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", applyZoom);
        } else {
          applyZoom();
        }
      });

      const page = context.pages()[0] || (await context.newPage());
      await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (navErr) {
      // Non-fatal: the manager can still navigate to the login page manually.
      console.error("Pre-navigation to login page failed:", navErr);
    }

    const debugRes = await fetch(`https://api.browserbase.com/v1/sessions/${session.id}/debug`, {
      headers: { "X-BB-API-Key": apiKey },
    });
    const debug = debugRes.ok ? await debugRes.json() : {};

    res.status(200).json({
      sessionId: session.id,
      liveViewUrl: debug.debuggerFullscreenUrl || debug.debuggerUrl || null,
    });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
