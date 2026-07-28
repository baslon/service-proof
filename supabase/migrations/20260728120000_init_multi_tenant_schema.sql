-- Initial multi-tenant schema for ServiceProof.
-- Organizations are cleaning companies (the tenant boundary); "clients" keeps
-- its existing meaning (a cleaning company's own customers, e.g. Northgate
-- Retail Group) and sits one level below organization.

create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create type invite_status as enum ('not_invited', 'invited', 'active');

create table operatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  invite_status invite_status not null default 'not_invited',
  invited_at timestamptz
);

create type user_role as enum ('admin', 'operative');

-- Extends Supabase's built-in auth.users with app-specific fields. Not every
-- operative has a profile — operative_id stays nullable so an admin can
-- schedule work for someone before (or without) inviting them to the app.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role user_role not null,
  name text not null,
  operative_id uuid references operatives(id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  display_id text not null,
  name text not null,
  sector text,
  contact_name text,
  contact_email text,
  contact_phone text,
  account_manager text,
  contract_start_date date,
  notes text,
  unique (organization_id, display_id)
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  display_id text not null,
  client_id uuid not null references clients(id) on delete restrict,
  name text not null,
  address text,
  postcode text,
  site_contact text,
  phone text,
  access_notes text,
  added_date date not null default current_date,
  unique (organization_id, display_id)
);

create type job_status as enum ('Completed & Evidenced', 'Missing Evidence', 'At Risk', 'Incomplete');

create table jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  display_id text not null,
  client_id uuid not null references clients(id) on delete restrict,
  site_id uuid not null references sites(id) on delete restrict,
  task_type text not null,
  area text,
  instructions text,
  recurrence text,
  scheduled_time timestamptz,
  operative_id uuid references operatives(id),
  photos_required int not null default 6,
  status job_status not null default 'Incomplete',
  notes text,
  submitted_time timestamptz,
  unique (organization_id, display_id)
);

create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  storage_url text not null,
  captured_at timestamptz not null default now()
);

-- Row Level Security: every tenant-scoped table checks organization_id
-- against the caller's own profile, so isolation is enforced at the
-- database layer rather than depending on every query remembering to filter.
create or replace function current_org() returns uuid as $$
  select organization_id from profiles where id = auth.uid()
$$ language sql stable;

alter table organizations enable row level security;
create policy org_isolation on organizations
  using (id = current_org());

alter table operatives enable row level security;
create policy org_isolation on operatives
  using (organization_id = current_org())
  with check (organization_id = current_org());

alter table profiles enable row level security;
create policy org_isolation on profiles
  using (organization_id = current_org())
  with check (organization_id = current_org());

alter table clients enable row level security;
create policy org_isolation on clients
  using (organization_id = current_org())
  with check (organization_id = current_org());

alter table sites enable row level security;
create policy org_isolation on sites
  using (organization_id = current_org())
  with check (organization_id = current_org());

alter table jobs enable row level security;
create policy org_isolation on jobs
  using (organization_id = current_org())
  with check (organization_id = current_org());

alter table job_photos enable row level security;
create policy org_isolation on job_photos
  using (job_id in (select id from jobs where organization_id = current_org()))
  with check (job_id in (select id from jobs where organization_id = current_org()));

-- Keeps operatives.invite_status trustworthy without depending on every
-- code path that creates a profile to remember to update it.
create or replace function mark_operative_active() returns trigger as $$
begin
  if new.operative_id is not null then
    update operatives set invite_status = 'active' where id = new.operative_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_profile_created
  after insert on profiles
  for each row execute function mark_operative_active();
