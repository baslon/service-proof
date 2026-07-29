-- "You can't mark a job Completed & Evidenced without its required photos"
-- was enforced in two places, both of them JavaScript: the operative's
-- submit form and the admin's edit modal. Nothing in the database checked
-- it, so a direct API call could seal a job with no evidence in it at all.
--
-- That matters more than the usual client-side-rule gap because of what we
-- built earlier today: a sealed job can no longer be edited, reopened or
-- deleted by anyone. A bad record created this way would be permanent.
--
-- A trigger rather than a check constraint, since the rule spans two
-- tables. It only fires on the transition into sealed, so ordinary edits to
-- an open job are untouched.
create or replace function require_evidence_before_sealing() returns trigger
language plpgsql
as $$
declare
  photo_count int;
begin
  if new.status = 'Completed & Evidenced'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then

    select count(*) into photo_count from job_photos where job_id = new.id;

    if photo_count < new.photos_required then
      raise exception 'Job % cannot be sealed with % of % required photo(s).',
        new.display_id, photo_count, new.photos_required
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- Covers insert too: a job cannot arrive already evidenced, because its
-- evidence cannot exist before the row does.
create trigger jobs_require_evidence
  before insert or update on jobs
  for each row execute function require_evidence_before_sealing();
