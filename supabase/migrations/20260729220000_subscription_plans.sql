-- Foundation for Stripe billing. plans is the single source of truth both
-- the pricing page and the webhook handler read from - a plan change
-- (price, limits) is then one row edit, not a hunt through application
-- code for every place a tier was hardcoded.
--
-- Prices are stored in pence (Stripe's own convention for GBP amounts),
-- exclusive of VAT - Stripe Tax calculates and adds VAT at checkout based
-- on the customer's location, rather than a flat rate baked in here that
-- would be wrong for a non-UK customer.
--
-- stripe_price_id_monthly/annual start null: no Stripe Product exists for
-- these plans yet, since creating one requires actual Stripe account
-- access this migration can't have. They need to be filled in once the
-- corresponding Products/Prices exist in Stripe, using the Price IDs
-- Stripe generates (e.g. price_1AbC...).
create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_limit integer,
  operative_limit integer,
  monthly_price_pence integer,
  annual_price_pence integer,
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  -- Enterprise has no self-service checkout - "Talk to us" instead of a
  -- buy button, sales-gated rather than a fixed self-service price.
  self_serve boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into plans (name, site_limit, operative_limit, monthly_price_pence, annual_price_pence, self_serve, sort_order)
values
  ('Starter', 5, 25, 7900, 79000, true, 1),
  ('Pro', 10, 75, 14900, 149000, true, 2),
  ('Enterprise', null, null, null, null, false, 3);

-- Every organization gets a row to read; only self-serve signups and
-- explicit superadmin action ever populate the Stripe-specific columns.
alter table organizations
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column plan_id uuid references plans(id),
  add column subscription_status text,
  add column current_period_end timestamptz,
  -- 'manual' by default: every organization that exists today was created
  -- directly by a superadmin with no Stripe subscription at all, so their
  -- existing site_limit/operative_limit values (already carefully set)
  -- must never be touched by a future webhook sync. Only the self-serve
  -- signup flow sets this to 'plan' when it creates a new organization -
  -- an existing organization stays 'manual' until someone deliberately
  -- migrates it onto a plan.
  add column limits_source text not null default 'manual' check (limits_source in ('plan', 'manual'));

-- plans itself is neither org-scoped nor sensitive - it's the same
-- information a public pricing page shows a visitor who has no account
-- yet, so unlike everything else in this schema it needs to be readable
-- by anon as well as authenticated. Writes still only ever happen through
-- a service-role-keyed serverless endpoint, never directly from the
-- browser, same as operatives/profiles.
alter table plans enable row level security;
create policy plans_select on plans for select to anon, authenticated using (true);
