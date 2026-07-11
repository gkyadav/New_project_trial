# noon Ops Console (prototype)

A BAU + Adhoc operations console prototype for noon — regional email queue,
AI review queue, BAU checklists (Fulfillment/Logistics), knowledge base,
access control, and audit log.

Backed by Supabase (project `ehljzeocpaxjvdjidext`, tables: users, emails,
drafts, payments, kb_cards, kb_revisions, bau_checks, audit_log). All actions
write through to Postgres and sync live to other users via Supabase Realtime.

Authentication is Supabase Auth: team members sign in with their noon email
IDs; passwords are stored bcrypt-hashed in Supabase's auth store, never in
this repo. Row-level security only grants data access to signed-in accounts
whose email is an active row in the users table.

## Run locally
npm install
npm run dev

## Deploy to Vercel
npx vercel deploy
# or, for a production deployment:
npx vercel deploy --prod

## Login
Sign in with your noon email ID. Accounts are provisioned in Supabase Auth
by the manager; there are no demo credentials.
