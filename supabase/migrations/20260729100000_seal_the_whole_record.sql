-- 20260729090000 froze a sealed job's status and blocked its deletion, but
-- left everything else about it writable by an admin: the assigned
-- operative, the scheduled time, the notes, and - through the is_admin()
-- exemption in the job_photos policies - the photographic evidence itself,
-- both adding and removing.
--
-- That is the wrong place for the line. The product's claim is evidence a
-- client can trust, and in a dispute the party with the motive to alter the
-- record is the company holding it. An admin who could add a photo, remove
-- a photo, or change who the report says did the work would leave a client
-- with no way to tell. A seal with exceptions is also hard to state and
-- easy to erode; "once evidenced, the record cannot be changed by anyone"
-- is a promise that survives being read aloud.
--
-- Corrections now work the way audit systems actually do them - by
-- appending rather than editing. A mis-recorded job gets a follow-up or a
-- remedial visit, not a silent rewrite.

-- The whole row, not just the status.
drop trigger jobs_no_unseal on jobs;
drop function prevent_unsealing_job();

create or replace function prevent_sealed_job_changes() returns trigger
language plpgsql
as $$
begin
  if old.status = 'Completed & Evidenced' then
    raise exception 'Job % is Completed & Evidenced. Its record is sealed and cannot be changed.', old.display_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Sealing itself still works: the transition into Completed & Evidenced is
-- an update whose *old* row is not yet sealed, so it passes.
create trigger jobs_sealed_are_immutable
  before update on jobs
  for each row execute function prevent_sealed_job_changes();

-- Evidence follows the same rule. The admin exemption stays on the
-- ownership check - an admin still manages photos on open jobs - but not on
-- the seal check, which now applies to everyone.
drop policy job_photos_insert on job_photos;
create policy job_photos_insert on job_photos
  for insert with check (
    job_id in (
      select id from jobs
      where organization_id = current_org()
        and (is_admin() or operative_id = current_operative())
        and status <> 'Completed & Evidenced'
    )
  );

drop policy job_photos_delete on job_photos;
create policy job_photos_delete on job_photos
  for delete using (
    job_id in (
      select id from jobs
      where organization_id = current_org()
        and (is_admin() or operative_id = current_operative())
        and status <> 'Completed & Evidenced'
    )
  );

-- And the files themselves. Without this an admin could leave the row in
-- place and delete the object it points at, leaving a report that still
-- claims six photos while every image 404s.
drop policy job_photos_delete on storage.objects;
create policy job_photos_delete on storage.objects
  for delete
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1]::uuid = current_org()
    and not exists (
      select 1
      from job_photos ph
      join jobs j on j.id = ph.job_id
      where j.status = 'Completed & Evidenced'
        and ph.storage_url like '%/' || name
    )
  );
