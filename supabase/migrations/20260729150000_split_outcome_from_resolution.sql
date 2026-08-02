-- status has been doing two jobs at once: recording what actually happened
-- on a visit, and tracking how the situation is being handled. Those can
-- both be true at the same time in ways a single column can't hold - a job
-- that was originally "Unable to complete" and later got fixed shouldn't
-- have that fact silently erased just because it moved on to Completed &
-- Evidenced. This is purely additive: status, every existing trigger and
-- RLS policy, and every screen that reads status keep meaning exactly what
-- they mean today.

-- What the operative first reported. Set once, at the first submission,
-- and never changed again after that - not even by a later resubmission
-- with a different result. No grace window, no exceptions: if it needs
-- correcting, that's a conversation, not a data fix.
create type job_outcome as enum ('Completed', 'Completed with issue', 'Unable to complete');

alter table jobs
  add column original_outcome job_outcome,
  add column resolved_at timestamptz,
  add column resolved_by uuid references profiles(id),
  add column resolution_notes text;

create or replace function lock_original_outcome() returns trigger
language plpgsql
as $$
begin
  if old.original_outcome is not null
     and new.original_outcome is distinct from old.original_outcome then
    raise exception 'The original outcome for job % is permanent and cannot be changed.', old.display_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger jobs_lock_original_outcome
  before update on jobs
  for each row execute function lock_original_outcome();

-- resolved_at is never a value a client gets to supply - it's stamped by
-- whichever of the two legitimate paths below actually fires, so nobody
-- (operative or admin) can set or backdate it directly.
--
-- 1. Manual: an admin sets resolved_by + resolution_notes together, for a
--    job that's being handled without ever being redone (e.g. "client
--    accepted a partial refund, no revisit needed"). The note is required
--    because it's the only record of why that's okay. Blocked entirely once
--    a job is already resolved.
--
-- 2. Automatic: the job is later properly finished and reaches Completed &
--    Evidenced. The redo is its own explanation, so no note is required and
--    resolved_by stays null - that null is exactly what distinguishes
--    "resolved because someone decided to accept it" from "resolved because
--    the work actually got done". Only fires if nothing has resolved the
--    job already, so a genuine manual resolution can't be overwritten by a
--    later redo.
create or replace function guard_job_resolution() returns trigger
language plpgsql
as $$
begin
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

  -- Reaching here means the client did not go through the manual path
  -- above, so a direct attempt to set resolved_at itself is never legitimate.
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

create trigger jobs_guard_resolution
  before update on jobs
  for each row execute function guard_job_resolution();
