-- Seeds the first organization (tenant). Run once against a fresh database
-- after the migrations in supabase/migrations/ have been applied.
insert into organizations (name)
values ('Demo Facilities Management')
returning id, name;
