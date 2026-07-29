-- Gap left by 20260729060000: that migration locked the job_photos *rows*
-- of a sealed job, but the storage objects those rows point at were still
-- governed only by the org check from 20260729020000. An operative could
-- leave the rows untouched and delete the underlying files instead - the
-- report would still claim 6 of 6 photos while every image 404s, which
-- destroys the evidence just as effectively as deleting the rows would.
--
-- The row lock and this one compose: rows of a sealed job can't be deleted
-- (job_photos_delete on public.job_photos), and a file can't be deleted
-- while a sealed job still references it. Legitimate removals delete the
-- row first and the file second, so by the time the file goes there is no
-- longer a reference and this passes - which is exactly why AppContext
-- does it in that order.
drop policy job_photos_delete on storage.objects;

create policy job_photos_delete on storage.objects
  for delete
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1]::uuid = current_org()
    and (
      is_admin()
      or not exists (
        select 1
        from job_photos ph
        join jobs j on j.id = ph.job_id
        where j.status = 'Completed & Evidenced'
          -- storage_url is the full public URL; name is the object path,
          -- which is always its trailing segment.
          and ph.storage_url like '%/' || name
      )
    )
  );
