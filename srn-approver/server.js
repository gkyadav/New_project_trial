import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4173;
const USER_DATA_DIR = path.join(__dirname, ".browser-profile");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

let contextPromise = null;
function getContext() {
  if (!contextPromise) {
    contextPromise = chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      viewport: { width: 1280, height: 900 },
    });
  }
  return contextPromise;
}

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

async function approveOne(page, link) {
  await page.goto(link, { waitUntil: "domcontentloaded", timeout: 30000 });

  const businessBtn = page.getByRole("button", { name: "Business Confirmation" });
  try {
    await businessBtn.waitFor({ state: "visible", timeout: 20000 });
  } catch {
    return { status: "error", message: "Business Confirmation button not found" };
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

app.post("/approve", async (req, res) => {
  const links = parseLinks(String(req.body.links || ""));

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache",
  });
  const send = (obj) => res.write(JSON.stringify(obj) + "\n");

  if (links.length === 0) {
    send({ type: "fatal", message: "No valid SRN links found. Paste links that contain /srn/…" });
    res.end();
    return;
  }

  send({ type: "start", total: links.length });

  let context;
  try {
    context = await getContext();
  } catch (err) {
    send({ type: "fatal", message: "Could not launch browser: " + (err.message || err) });
    res.end();
    return;
  }
  const page = context.pages()[0] || (await context.newPage());

  let approved = 0;
  let skipped = 0;
  let errored = 0;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const id = srnId(link);
    send({ type: "progress", index: i, total: links.length, id });

    let result;
    try {
      result = await approveOne(page, link);
    } catch (err) {
      result = { status: "error", message: String(err.message || err) };
    }

    if (result.status === "approved") approved++;
    else if (result.status === "skipped") skipped++;
    else errored++;

    send({ type: "result", id, status: result.status, message: result.message });
  }

  send({ type: "done", approved, skipped, errored, total: links.length });
  res.end();
});

app.listen(PORT, () => {
  console.log(`SRN Approver running at http://localhost:${PORT}`);
});
