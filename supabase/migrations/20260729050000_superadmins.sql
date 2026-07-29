-- Superadmins can create organizations, admins, and operatives across every
-- tenant - a fundamentally different trust model from the rest of the app,
-- which assumes exactly one organization per profile. Rather than bend the
-- existing org-scoped RLS to support a cross-tenant role (which would mean
-- adding a bypass condition to every table's policy), superadmin membership
-- lives in its own table that the client never queries directly. Only the
-- service_role-keyed serverless functions under api/superadmin/* check it,
-- and service_role bypasses RLS regardless - RLS is enabled here purely as
-- defense in depth, with no policies, so an anon/authenticated query always
-- sees zero rows instead of relying on nobody ever writing one by mistake.
create table superadmins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table superadmins enable row level security;
