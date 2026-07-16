# noon Ops Console (prototype)

A BAU + Adhoc operations console prototype for noon — regional payments hub,
knowledge base with an SOP completeness bot, AI workspace, access control,
and audit log.

Backed by Supabase (project `ehljzeocpaxjvdjidext`, tables: users, payments,
kb_cards, kb_revisions, bau_checks, audit_log, points_ledger, bot_questions).
The app is a server-rendered **Flask** app: every page is Jinja-rendered from
Supabase reads, and mutations are plain form POSTs that write through to
Postgres and redirect back (no client-side Realtime sync — reload to see
another user's changes).

Authentication is Supabase Auth (email OTP, with a temporary-password
fallback), called directly from the browser via the Supabase JS client
(loaded from a CDN, no build step). After a successful sign-in, the browser
posts the session token to `/auth/session`, which verifies it server-side and
checks the signed-in email against an active row in the `users` table before
opening a Flask session — the same two-layer authentication vs. authorization
model the previous React version used.

The Payments section's module grid, and the Access Control admin page, were
modeled on the equivalent screens from the VendorFlow Flask app (its
`admin_dashboard.html` module launcher and `access_control.html` credential
manager), adapted to this app's own role model (agent/reviewer/admin) and
`users` table rather than copied verbatim.

## Run locally
```
pip install -r requirements.txt
export SUPABASE_URL=...          # optional, defaults to the shared project
export SUPABASE_ANON_KEY=...     # optional, defaults to the shared publishable key
export FLASK_SECRET_KEY=...      # set a real secret in production
flask --app app run --debug
```

## Login
Sign in with your noon email ID. Accounts are provisioned in Supabase by the
manager; there are no demo credentials.
