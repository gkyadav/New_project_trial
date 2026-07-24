export const config = { maxDuration: 30 };

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
