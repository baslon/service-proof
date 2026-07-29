-- Photos were being stored as base64 data URLs directly in job_photos.
-- storage_url (a plain text column) - workable for a handful of demo
-- photos, but not how this should actually work: it bloats the database
-- with what's really file data, defeats caching/CDN benefits, and pulls
-- the full encoded image over the network on every fetch even before
-- anything's displayed.
--
-- This bucket is public (Option B, chosen deliberately over private +
-- signed URLs): reads work via a plain, unguessable-but-unauthenticated
-- URL - simpler than managing signed-URL expiry, at the cost of read
-- access relying on URL obscurity rather than real per-tenant access
-- control. Writes (upload/delete) still require being a real
-- authenticated member of the organization, via the policies below.
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

-- Uploads must land under a path starting with the caller's own
-- organization_id (storage.foldername splits the object path into its
-- folder segments), so one org's admin/operative can never write into
-- another org's folder even though the bucket itself is public to read.
create policy job_photos_insert on storage.objects
  for insert
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1]::uuid = current_org()
  );

create policy job_photos_delete on storage.objects
  for delete
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1]::uuid = current_org()
  );
