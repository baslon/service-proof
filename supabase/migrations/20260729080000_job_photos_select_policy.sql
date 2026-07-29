-- 20260729020000 created insert and delete policies on storage.objects but
-- no select policy, on the reasoning that the bucket is public so reads
-- need no policy. That is true of reads through the public URL, but not of
-- the Storage API's management operations: remove() resolves the objects
-- before deleting them, and that lookup is a select. With no select policy
-- it resolved nothing, deleted nothing, and returned 200 with an empty
-- array - a silent no-op, which is why orphaned files kept accumulating
-- even after the app started asking for them to be removed.
--
-- Scoped to the caller's own organization, so this grants visibility of
-- one tenant's object names to that tenant only. Deletion is still gated
-- separately by job_photos_delete, including the sealed-job lock - select
-- lets you resolve an object, it doesn't let you remove it.
create policy job_photos_select on storage.objects
  for select
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1]::uuid = current_org()
  );
