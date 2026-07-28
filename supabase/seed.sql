-- Seeds the first organization (tenant). Run once against a fresh database
-- after the migrations in supabase/migrations/ have been applied.
insert into organizations (name)
values ('Demo Facilities Management')
returning id, name;

-- Links the first admin's Supabase Auth user to that organization.
-- The auth user itself must already exist (created via
-- Authentication -> Users in the Supabase dashboard, since account
-- creation isn't something to script) — replace the id below with that
-- user's UID before running.
insert into profiles (id, organization_id, role, name)
values (
  '8a3e2124-4a22-44c5-904b-359bb6e9e0d8',
  '2062add4-652d-43a9-a1a8-919fbeaacc52',
  'admin',
  'David Baslon'
);
