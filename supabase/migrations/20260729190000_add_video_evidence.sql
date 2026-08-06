-- Video is a second kind of evidence, purely additive to photos - kept in
-- the same job_photos table (rather than a parallel job_videos one) so
-- every rule already written for photos applies to video for free: sealed
-- jobs can't have either added or removed (job_photos_insert/delete are
-- keyed only on job_id, not on any photo-specific column), org isolation
-- is unchanged, and there's nothing new to duplicate at the table level.
--
-- Video never counts toward photos_required or any "X/Y photos" count
-- across the app - those all filter to media_type = 'photo' going
-- forward, which is exactly what they already assumed before this column
-- existed. Every existing row gets 'photo' by default, so nothing already
-- stored changes meaning.
create type media_type as enum ('photo', 'video');

alter table job_photos add column media_type media_type not null default 'photo';

-- A separate bucket rather than reusing job-photos: video files are much
-- larger, and a dedicated bucket lets its size/type limits be tuned
-- (50MB, common phone video formats) without touching the photo bucket's,
-- which has never had either kind of limit set.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-videos', 'job-videos', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

-- Mirrors job-photos' three storage.objects policies exactly: uploads and
-- reads require being a real member of the organization whose folder the
-- object lives under, and a sealed job's videos can never be deleted, same
-- as its photos. The select policy exists for the same non-obvious reason
-- job-photos needed one (20260729080000): remove() resolves objects via a
-- select before deleting them, and with no select policy that resolves
-- nothing and silently "succeeds" at deleting zero files.
create policy job_videos_insert on storage.objects
  for insert
  with check (
    bucket_id = 'job-videos'
    and (storage.foldername(name))[1]::uuid = current_org()
  );

create policy job_videos_select on storage.objects
  for select
  using (
    bucket_id = 'job-videos'
    and (storage.foldername(name))[1]::uuid = current_org()
  );

create policy job_videos_delete on storage.objects
  for delete
  using (
    bucket_id = 'job-videos'
    and (storage.foldername(name))[1]::uuid = current_org()
    and not exists (
      select 1
      from job_photos ph
      join jobs j on j.id = ph.job_id
      where j.status = 'Completed & Evidenced'
        and ph.storage_url like '%/' || name
    )
  );
