// ==UserScript==
// @name         noon SRN Auto-Approver
// @namespace    https://service-po.noon.team/
// @version      1.0.0
// @description  Paste a list of SRN links and auto-run Business Confirmation -> Confirm -> Close for each one.
// @author       noon ops
// @match        https://service-po.noon.team/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  var STORAGE_KEY = "noonSrnAutoApprover";
  var PANEL_ID = "noon-srn-approver-panel";
  var ORANGE = "#f3762a";

  // Guard: only one processing pass per page load.
  var processingStarted = false;

  /* ----------------------------- state helpers ----------------------------- */

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ------------------------------ url helpers ------------------------------ */

  // Extract the SRN id from a URL/path, e.g. ".../srn/MSALG7WXN3MHKA-S11?..." -> "MSALG7WXN3MHKA-S11"
  function srnId(url) {
    var m = String(url).match(/\/srn\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function parseLinks(raw) {
    // Split on whitespace / commas / semicolons, keep anything that points at an SRN.
    return raw
      .split(/[\s,;]+/)
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s && /\/srn\//.test(s);
      });
  }

  /* ----------------------------- dom utilities ----------------------------- */

  function clickables() {
    return Array.prototype.slice.call(
      document.querySelectorAll('button, [role="button"], a')
    );
  }

  // Find a clickable whose trimmed text matches exactly (or contains) `text`.
  function findClickable(text, exact) {
    var t = text.toLowerCase();
    return clickables().find(function (el) {
      if (!isVisible(el)) return false;
      var label = (el.textContent || "").trim().toLowerCase();
      return exact ? label === t : label.indexOf(t) !== -1;
    }) || null;
  }

  function isVisible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  }

  function isDisabled(el) {
    if (!el) return true;
    if (el.disabled) return true;
    if (el.getAttribute("aria-disabled") === "true") return true;
    if (getComputedStyle(el).pointerEvents === "none") return true;
    return false;
  }

  // Poll until fn() returns a truthy value or timeout elapses.
  function waitFor(fn, timeout, interval) {
    timeout = timeout || 15000;
    interval = interval || 200;
    return new Promise(function (resolve) {
      var start = Date.now();
      (function poll() {
        var r = null;
        try {
          r = fn();
        } catch (e) {
          r = null;
        }
        if (r) {
          resolve(r);
          return;
        }
        if (Date.now() - start > timeout) {
          resolve(null);
          return;
        }
        setTimeout(poll, interval);
      })();
    });
  }

  function delay(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  /* --------------------------- the approval flow --------------------------- */

  function record(state, id, status, message) {
    state.results = state.results || [];
    state.results.push({ id: id, status: status, message: message });
  }

  // Runs the 3-step confirmation on the SRN page we are currently on.
  function approveCurrentPage() {
    var id = srnId(location.href);

    // 1) Wait for the Business Confirmation button to render.
    return waitFor(function () {
      return findClickable("Business Confirmation", false);
    }, 25000).then(function (bcBtn) {
      if (!bcBtn) {
        return { status: "error", message: "Business Confirmation button not found" };
      }
      if (isDisabled(bcBtn)) {
        return {
          status: "skipped",
          message: "Business Confirmation disabled (already confirmed or not permitted)",
        };
      }

      bcBtn.click();

      // 2) Wait for the "Confirm SRN" dialog and its Confirm button.
      return waitFor(function () {
        return findClickable("Confirm", true);
      }, 10000).then(function (confirmBtn) {
        if (!confirmBtn) {
          return {
            status: "skipped",
            message: "Confirm dialog did not appear (button may be inactive)",
          };
        }

        confirmBtn.click();

        // 3) Wait for the success dialog + its Close button.
        return waitFor(function () {
          return findClickable("Close", true);
        }, 20000).then(function (closeBtn) {
          if (!closeBtn) {
            return {
              status: "error",
              message: "Success dialog did not appear after confirming",
            };
          }
          closeBtn.click();
          return { status: "approved", message: "SRN confirmed successfully" };
        });
      });
    });
  }

  /* ------------------------------- the router ------------------------------ */

  function route() {
    var state = loadState();
    renderPanel(state);

    if (!state || !state.active) return;

    // All done -> show finish state, do not navigate.
    if (state.index >= state.queue.length) {
      state.done = true;
      saveState(state);
      renderPanel(state);
      return;
    }

    var target = state.queue[state.index];

    // Not on the right SRN page yet -> navigate to it.
    if (srnId(location.href) !== srnId(target)) {
      location.href = target;
      return;
    }

    // We are on the correct page. Run the flow once.
    if (processingStarted) return;
    processingStarted = true;

    // Give the SPA a moment to hydrate, then run.
    delay(1200)
      .then(approveCurrentPage)
      .then(function (result) {
        record(state, srnId(target), result.status, result.message);
        state.index += 1;
        saveState(state);
        renderPanel(state);
        return delay(900);
      })
      .then(function () {
        var next = loadState();
        if (!next || !next.active) return;
        if (next.index >= next.queue.length) {
          next.done = true;
          saveState(next);
          renderPanel(next);
        } else {
          location.href = next.queue[next.index];
        }
      })
      .catch(function (err) {
        record(state, srnId(target), "error", String(err && err.message ? err.message : err));
        state.index += 1;
        saveState(state);
        // Continue with the next link even after an error.
        if (state.index >= state.queue.length) {
          state.done = true;
          saveState(state);
          renderPanel(state);
        } else {
          location.href = state.queue[state.index];
        }
      });
  }

  /* --------------------------------- panel --------------------------------- */

  function startRun(links) {
    var queue = parseLinks(links);
    if (queue.length === 0) {
      alert("No valid SRN links found. Paste links that contain /srn/…");
      return;
    }
    saveState({ active: true, done: false, index: 0, queue: queue, results: [] });
    processingStarted = false;
    route();
  }

  function stopRun() {
    var state = loadState();
    if (state) {
      state.active = false;
      saveState(state);
    }
    renderPanel(loadState());
  }

  function statusColor(status) {
    if (status === "approved") return "#1a7f37";
    if (status === "skipped") return "#9a6700";
    return "#b91c1c";
  }

  function statusIcon(status) {
    if (status === "approved") return "✓";
    if (status === "skipped") return "–";
    return "✕";
  }

  function renderPanel(state) {
    var existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();

    var panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = [
      "position:fixed", "top:16px", "right:16px", "z-index:2147483647",
      "width:340px", "max-height:80vh", "overflow:auto",
      "background:#ffffff", "border:1px solid #e5e7eb", "border-radius:12px",
      "box-shadow:0 8px 30px rgba(0,0,0,0.18)", "font-family:Inter,Arial,sans-serif",
      "font-size:13px", "color:#111827",
    ].join(";");

    var header =
      '<div style="display:flex;align-items:center;justify-content:space-between;' +
      "padding:12px 14px;border-bottom:1px solid #f0f0f0;background:" + ORANGE + ";" +
      'border-radius:12px 12px 0 0;">' +
      '<span style="font-weight:700;color:#fff;">noon SRN Auto-Approver</span>' +
      '<span id="srn-collapse" style="cursor:pointer;color:#fff;font-weight:700;">–</span>' +
      "</div>";

    var body = document.createElement("div");
    body.style.cssText = "padding:14px;";

    var results = (state && state.results) || [];
    var approved = results.filter(function (r) { return r.status === "approved"; }).length;
    var skipped = results.filter(function (r) { return r.status === "skipped"; }).length;
    var errored = results.filter(function (r) { return r.status === "error"; }).length;

    if (!state || !state.active) {
      if (state && state.done) {
        body.innerHTML = finishHtml(state, approved, skipped, errored);
      } else {
        body.innerHTML = idleHtml();
      }
    } else if (state.done || state.index >= state.queue.length) {
      body.innerHTML = finishHtml(state, approved, skipped, errored);
    } else {
      body.innerHTML = runningHtml(state, approved, skipped, errored);
    }

    panel.innerHTML = header;
    panel.appendChild(body);
    document.body.appendChild(panel);

    // Collapse toggle.
    var collapseEl = document.getElementById("srn-collapse");
    collapseEl.addEventListener("click", function () {
      body.style.display = body.style.display === "none" ? "block" : "none";
      collapseEl.textContent = body.style.display === "none" ? "+" : "–";
    });

    // Wire up buttons.
    var startBtn = document.getElementById("srn-start");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        var ta = document.getElementById("srn-links");
        startRun(ta.value);
      });
    }
    var stopBtn = document.getElementById("srn-stop");
    if (stopBtn) stopBtn.addEventListener("click", stopRun);

    var resetBtn = document.getElementById("srn-reset");
    if (resetBtn)
      resetBtn.addEventListener("click", function () {
        clearState();
        renderPanel(null);
      });
  }

  function idleHtml() {
    return (
      '<div style="margin-bottom:8px;color:#374151;">Paste all SRN links (one per line):</div>' +
      '<textarea id="srn-links" placeholder="https://service-po.noon.team/srn/…&#10;https://service-po.noon.team/srn/…" ' +
      'style="width:100%;height:150px;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;' +
      'padding:8px;font-family:monospace;font-size:12px;resize:vertical;"></textarea>' +
      '<button id="srn-start" style="margin-top:10px;width:100%;padding:10px;border:none;border-radius:8px;' +
      "background:" + ORANGE + ';color:#fff;font-weight:700;font-size:14px;cursor:pointer;">Approve All SRNs</button>' +
      '<div style="margin-top:8px;color:#6b7280;font-size:11px;">Make sure you are logged in to ServicePO first.</div>'
    );
  }

  function runningHtml(state, approved, skipped, errored) {
    var total = state.queue.length;
    var current = Math.min(state.index + 1, total);
    return (
      '<div style="font-weight:600;margin-bottom:6px;">Approving ' + current + " of " + total + "…</div>" +
      progressBar(state.index, total) +
      summaryLine(approved, skipped, errored) +
      resultsList(state) +
      '<button id="srn-stop" style="margin-top:10px;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;' +
      'background:#fff;color:#374151;font-weight:600;cursor:pointer;">Stop</button>'
    );
  }

  function finishHtml(state, approved, skipped, errored) {
    var msg = errored === 0 && skipped === 0
      ? "All SRNs approved 🎉"
      : "Finished — all links processed";
    return (
      '<div style="font-size:16px;font-weight:700;color:#1a7f37;margin-bottom:8px;">✅ ' + msg + "</div>" +
      summaryLine(approved, skipped, errored) +
      resultsList(state) +
      '<button id="srn-reset" style="margin-top:10px;width:100%;padding:9px;border:none;border-radius:8px;' +
      "background:" + ORANGE + ';color:#fff;font-weight:700;cursor:pointer;">Start Over</button>'
    );
  }

  function progressBar(done, total) {
    var pct = total ? Math.round((done / total) * 100) : 0;
    return (
      '<div style="height:8px;background:#eee;border-radius:4px;overflow:hidden;margin:6px 0 10px;">' +
      '<div style="height:100%;width:' + pct + "%;background:" + ORANGE + ';"></div></div>'
    );
  }

  function summaryLine(approved, skipped, errored) {
    return (
      '<div style="display:flex;gap:12px;margin-bottom:8px;font-size:12px;">' +
      '<span style="color:#1a7f37;">✓ ' + approved + " approved</span>" +
      '<span style="color:#9a6700;">– ' + skipped + " skipped</span>" +
      '<span style="color:#b91c1c;">✕ ' + errored + " errors</span>" +
      "</div>"
    );
  }

  function resultsList(state) {
    var results = (state && state.results) || [];
    if (results.length === 0) return "";
    var rows = results
      .map(function (r) {
        return (
          '<div style="display:flex;gap:8px;padding:4px 0;border-top:1px solid #f3f4f6;">' +
          '<span style="color:' + statusColor(r.status) + ';font-weight:700;">' + statusIcon(r.status) + "</span>" +
          '<span style="flex:1;"><span style="font-family:monospace;font-size:11px;">' + (r.id || "?") + "</span>" +
          '<div style="color:#6b7280;font-size:11px;">' + r.message + "</div></span>" +
          "</div>"
        );
      })
      .join("");
    return '<div style="max-height:220px;overflow:auto;margin-top:4px;">' + rows + "</div>";
  }

  /* -------------------------------- kickoff -------------------------------- */

  route();
})();
