-- guard_job_resolution had no way back once a job was resolved: resolved_at
-- could only ever be set, never cleared, by anyone. That's a dead end for a
-- job that was manually resolved without a revisit (the fields dropped it
-- off the operative's queue entirely) if it later turns out someone needs
-- to actually go finish it - there was no way to get it back in front of
-- them to add the remaining photos.
--
-- Reopening is its own admin action, not a variant of resolving: the client
-- clears resolved_by and resolution_notes together (mirroring how setting
-- them together is what resolves a job), and the trigger clears resolved_at
-- itself - same "resolved_at is never a value the client supplies" rule as
-- before, just running in the other direction. No note required, and no
-- history of the earlier resolution is kept once reopened - consistent
-- with the rest of this feature staying deliberately free of a full
-- resubmission audit trail.
--
-- original_outcome is untouched by any of this - still permanent, still
-- set only once, regardless of how many times a job is resolved and reopened.
create or replace function guard_job_resolution() returns trigger
language plpgsql
as $$
begin
  if old.resolved_at is not null
     and new.resolved_by is null
     and new.resolution_notes is null then
    if not is_admin() then
      raise exception 'Only an admin can reopen a resolved job.' using errcode = 'insufficient_privilege';
    end if;
    new.resolved_at := null;
    return new;
  end if;

  if new.resolved_by is distinct from old.resolved_by
     or new.resolution_notes is distinct from old.resolution_notes then

    if old.resolved_at is not null then
      raise exception 'Job % is already resolved.', old.display_id using errcode = 'check_violation';
    end if;
    if not is_admin() then
      raise exception 'Only an admin can mark a job resolved.' using errcode = 'insufficient_privilege';
    end if;
    if new.resolved_by is distinct from auth.uid() then
      raise exception 'resolved_by must be the admin making the change.' using errcode = 'check_violation';
    end if;
    if new.resolution_notes is null or btrim(new.resolution_notes) = '' then
      raise exception 'Marking a job resolved manually requires a note explaining how.'
        using errcode = 'check_violation';
    end if;

    new.resolved_at := now();
    return new;
  end if;

  if new.resolved_at is distinct from old.resolved_at then
    raise exception 'resolved_at cannot be set directly.' using errcode = 'check_violation';
  end if;

  if new.status = 'Completed & Evidenced'
     and old.status is distinct from new.status
     and old.resolved_at is null then
    new.resolved_at := now();
  end if;

  return new;
end;
$$;
