-- Lowers the default "photos required" for new jobs/schedules from 6 to 3.
-- Column-level default only - never touches existing jobs or schedules,
-- which keep whatever value they were created with. Also not exercised by
-- the app's own create paths today (create_job's p_photos_required has no
-- default, both admin forms always pass a value explicitly) - this is a
-- safety net for a direct insert that omits the column, kept in step with
-- the two form defaults for consistency.
alter table jobs alter column photos_required set default 3;
alter table schedules alter column photos_required set default 3;
