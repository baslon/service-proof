-- Recurring job scheduling (see docs/recurring-scheduling-scope.md) needs a
-- background process that runs on its own, not triggered by a user action.
-- pg_cron lets that logic live inside the same Postgres database as every
-- other hard rule in this schema, instead of standing up a separate Vercel
-- serverless function + external scheduler for the one thing in this app
-- that isn't request-driven.
create extension if not exists pg_cron;
