# noon Ops Console (prototype)

A BAU + Adhoc operations console prototype for noon — regional email queue,
AI review queue, BAU checklists (Fulfillment/Logistics), knowledge base,
access control, and audit log.

Backed by Supabase (project `ehljzeocpaxjvdjidext`, tables: users, emails,
drafts, payments, kb_cards, bau_checks, audit_log). All actions write through
to Postgres and sync live to other users via Supabase Realtime. RLS is open
to the publishable key — prototype trust model, same as the shared demo login.

## Run locally
npm install
npm run dev

## Deploy to Vercel
npx vercel deploy
# or, for a production deployment:
npx vercel deploy --prod

## Login
Username: admin123
Password: admin123
