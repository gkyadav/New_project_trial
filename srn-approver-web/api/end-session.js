export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.BROWSERBASE_API_KEY;
  const { sessionId } = req.body || {};

  if (!apiKey) {
    res.status(500).json({ error: "Server missing Browserbase credentials" });
    return;
  }
  if (!sessionId) {
    res.status(400).json({ error: "Missing sessionId" });
    return;
  }

  try {
    const releaseRes = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
      method: "POST",
      headers: {
        "X-BB-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "REQUEST_RELEASE" }),
    });

    if (!releaseRes.ok) {
      const detail = await releaseRes.text();
      res.status(502).json({ error: "Failed to release session", detail });
      return;
    }

    res.status(200).json({ released: true });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
