-- "Completed" already required photos_required photos, enforced both in
-- Submit.jsx and in the database. "Completed with issue" (-> At Risk)
-- required only a note and let an operative submit with zero photos - the
-- path most likely to end up in a dispute, backed by nothing but text that
-- can be written vague or after the fact. Nothing enforced it server-side
-- either, so this was always bypassable via a direct API call regardless of
-- what the form asked for.
--
-- Not the full photos_required count - "Unable to complete" stays
-- note-only (there may genuinely be nothing to photograph when nothing got
-- done), and even an "issue" job shouldn't be forced into hunting for
-- photos to hit an arbitrary number. Just proof that something was
-- actually seen: at least one photo.
create or replace function require_photo_for_at_risk() returns trigger
language plpgsql
as $$
declare
  photo_count int;
begin
  if new.status = 'At Risk'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then

    select count(*) into photo_count from job_photos where job_id = new.id;

    if photo_count < 1 then
      raise exception 'Job % cannot be marked At Risk without at least one photo.', new.display_id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger jobs_require_photo_for_at_risk
  before insert or update on jobs
  for each row execute function require_photo_for_at_risk();
