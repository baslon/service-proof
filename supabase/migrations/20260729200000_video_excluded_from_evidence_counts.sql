-- 20260729190000 added media_type but missed updating the two triggers
-- that count job_photos rows to enforce evidence requirements - both
-- counted every row regardless of type, so a video with zero photos could
-- have satisfied photos_required or the At Risk photo gate. That directly
-- contradicts the point of the media_type column: video is supplementary,
-- never a substitute for the required photos.
create or replace function require_evidence_before_sealing() returns trigger
language plpgsql
as $$
declare
  photo_count int;
begin
  if new.status = 'Completed & Evidenced'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then

    select count(*) into photo_count from job_photos where job_id = new.id and media_type = 'photo';

    if photo_count < new.photos_required then
      raise exception 'Job % cannot be sealed with % of % required photo(s).',
        new.display_id, photo_count, new.photos_required
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create or replace function require_photo_for_at_risk() returns trigger
language plpgsql
as $$
declare
  photo_count int;
begin
  if new.status = 'At Risk'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then

    select count(*) into photo_count from job_photos where job_id = new.id and media_type = 'photo';

    if photo_count < 1 then
      raise exception 'Job % cannot be marked At Risk without at least one photo.', new.display_id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
