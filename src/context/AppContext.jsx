import { createContext, useContext, useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { toLocalTimestamp } from '../utils/time'
import { removePhotoObjects } from '../lib/uploadPhoto'
import { removeVideoObjects } from '../lib/uploadVideo'

const AppContext = createContext(null)

// Every component in the app was built against display codes like "SP-0041"
// as the job/client/site "id" — Supabase's real primary keys are UUIDs, with
// the display code stored separately as display_id. Rather than touch every
// component to juggle both, AppContext maps display_id -> "id" on the way
// out, and keeps UUID lookup maps privately (via refs) for use on the way
// back in, so nothing outside this file needs to know UUIDs exist at all.
function mapClient(row) {
  return {
    id: row.display_id,
    name: row.name,
    sector: row.sector,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contractStartDate: row.contract_start_date,
    notes: row.notes || '',
  }
}

function mapSite(row, clientDisplayIdByUuid) {
  return {
    id: row.display_id,
    clientId: clientDisplayIdByUuid[row.client_id] || '',
    name: row.name,
    address: row.address,
    postcode: row.postcode,
    siteContact: row.site_contact,
    phone: row.phone,
    accessNotes: row.access_notes,
    addedDate: row.added_date,
  }
}

function mapOperative(row, clientIdsByOperativeId) {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    // Empty means unrestricted — available for every client — rather than
    // "available for none". Only a non-empty list narrows an operative down.
    clientIds: clientIdsByOperativeId[row.id] || [],
  }
}

function mapAttendanceEvent(row, operativeNameById) {
  return {
    id: row.id,
    operativeId: row.operative_id,
    operativeName: operativeNameById[row.operative_id] || 'Unknown',
    eventType: row.event_type,
    occurredAt: row.occurred_at,
  }
}

// Schedules have no display_id (they're an internal admin entity, never
// shown to a cleaner the way a job's "SP-0041" is) - id is the raw uuid
// throughout, the same choice already made for operatives.
function mapSchedule(row, clientDisplayIdByUuid, siteDisplayIdByUuid, operativeIdsByScheduleId) {
  return {
    id: row.id,
    clientId: clientDisplayIdByUuid[row.client_id] || '',
    siteId: siteDisplayIdByUuid[row.site_id] || '',
    taskType: row.task_type,
    area: row.area || '',
    instructions: row.instructions || '',
    photosRequired: row.photos_required,
    daysOfWeek: row.days_of_week || [],
    startTime: row.start_time ? row.start_time.slice(0, 5) : '',
    expectedDurationMinutes: row.expected_duration_minutes,
    status: row.status,
    effectiveStartDate: row.effective_start_date,
    effectiveEndDate: row.effective_end_date,
    notes: row.notes || '',
    operativeIds: operativeIdsByScheduleId[row.id] || [],
  }
}

function mapScheduleException(row) {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    exceptionDate: row.exception_date,
    operativeId: row.operative_id,
    type: row.type,
    replacementOperativeId: row.replacement_operative_id,
    notes: row.notes || '',
  }
}

function mapJob(row, clientDisplayIdByUuid, siteDisplayIdByUuid, photosByJobUuid, videosByJobUuid) {
  const photos = photosByJobUuid[row.id] || []
  const videos = videosByJobUuid[row.id] || []
  return {
    id: row.display_id,
    clientId: clientDisplayIdByUuid[row.client_id] || '',
    siteId: siteDisplayIdByUuid[row.site_id] || '',
    taskType: row.task_type,
    area: row.area,
    instructions: row.instructions || '',
    recurrence: row.recurrence,
    scheduledTime: row.scheduled_time ? row.scheduled_time.slice(0, 16) : '',
    operativeId: row.operative_id,
    // Video never counts toward this — it's supplementary evidence, not a
    // substitute for the required photos.
    photosRequired: row.photos_required,
    photosSubmitted: photos.length,
    photos,
    videos,
    submittedTime: row.submitted_time ? row.submitted_time.slice(0, 16) : null,
    status: row.status,
    notes: row.notes || '',
    // What the operative first reported, permanent regardless of what
    // status becomes afterwards. Null until the first submission.
    originalOutcome: row.original_outcome,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    resolutionNotes: row.resolution_notes || '',
  }
}

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState({
    clients: [],
    sites: [],
    jobs: [],
    operatives: [],
    attendanceEvents: [],
    schedules: [],
    scheduleExceptions: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const clientUuidByDisplayIdRef = useRef({})
  const siteUuidByDisplayIdRef = useRef({})
  const jobUuidByDisplayIdRef = useRef({})

  const fetchAll = useCallback(async () => {
    if (!user) {
      setState({
        clients: [],
        sites: [],
        jobs: [],
        operatives: [],
        attendanceEvents: [],
        schedules: [],
        scheduleExceptions: [],
      })
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)

    const [
      clientsRes,
      sitesRes,
      jobsRes,
      operativesRes,
      operativeClientsRes,
      attendanceRes,
      schedulesRes,
      scheduleOperativesRes,
      scheduleExceptionsRes,
    ] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('sites').select('*'),
      supabase.from('jobs').select('*').order('display_id', { ascending: false }),
      supabase.from('operatives').select('*'),
      supabase.from('operative_clients').select('*'),
      supabase.from('attendance_events').select('*').order('occurred_at', { ascending: false }),
      supabase.from('schedules').select('*'),
      supabase.from('schedule_operatives').select('*'),
      supabase.from('schedule_exceptions').select('*').order('exception_date', { ascending: true }),
    ])

    const jobUuids = (jobsRes.data || []).map((j) => j.id)
    const mediaRes = jobUuids.length
      ? await supabase.from('job_photos').select('*').in('job_id', jobUuids)
      : { data: [] }

    // A failed fetch used to fall through to `data || []` and render as a
    // perfectly normal empty account - the most alarming possible way to
    // report a network blip to someone who had data a minute ago. Bail out
    // instead, leaving whatever was last loaded on screen.
    const failure = [
      clientsRes,
      sitesRes,
      jobsRes,
      operativesRes,
      operativeClientsRes,
      mediaRes,
      attendanceRes,
      schedulesRes,
      scheduleOperativesRes,
      scheduleExceptionsRes,
    ].find((r) => r.error)
    if (failure) {
      setError(failure.error.message || 'Could not load your data.')
      setLoading(false)
      return
    }
    setError('')

    const clientRows = clientsRes.data || []
    const siteRows = sitesRes.data || []
    const jobRows = jobsRes.data || []
    const operativeRows = operativesRes.data || []
    const operativeClientRows = operativeClientsRes.data || []
    const mediaRows = mediaRes.data || []
    const attendanceRows = attendanceRes.data || []
    const scheduleRows = schedulesRes.data || []
    const scheduleOperativeRows = scheduleOperativesRes.data || []
    const scheduleExceptionRows = scheduleExceptionsRes.data || []

    const clientDisplayIdByUuid = Object.fromEntries(clientRows.map((c) => [c.id, c.display_id]))
    const siteDisplayIdByUuid = Object.fromEntries(siteRows.map((s) => [s.id, s.display_id]))
    clientUuidByDisplayIdRef.current = Object.fromEntries(clientRows.map((c) => [c.display_id, c.id]))
    siteUuidByDisplayIdRef.current = Object.fromEntries(siteRows.map((s) => [s.display_id, s.id]))
    jobUuidByDisplayIdRef.current = Object.fromEntries(jobRows.map((j) => [j.display_id, j.id]))

    const photosByJobUuid = {}
    const videosByJobUuid = {}
    mediaRows.forEach((p) => {
      const byJobUuid = p.media_type === 'video' ? videosByJobUuid : photosByJobUuid
      ;(byJobUuid[p.job_id] ||= []).push({ id: p.id, dataUrl: p.storage_url, capturedAt: p.captured_at })
    })
    Object.values(photosByJobUuid).forEach((arr) => arr.sort((a, b) => (a.capturedAt < b.capturedAt ? -1 : 1)))
    Object.values(videosByJobUuid).forEach((arr) => arr.sort((a, b) => (a.capturedAt < b.capturedAt ? -1 : 1)))

    const clientIdsByOperativeId = {}
    operativeClientRows.forEach((r) => {
      const displayId = clientDisplayIdByUuid[r.client_id]
      if (displayId) (clientIdsByOperativeId[r.operative_id] ||= []).push(displayId)
    })

    const operativeNameById = Object.fromEntries(operativeRows.map((o) => [o.id, o.name]))

    const operativeIdsByScheduleId = {}
    scheduleOperativeRows.forEach((r) => {
      ;(operativeIdsByScheduleId[r.schedule_id] ||= []).push(r.operative_id)
    })

    setState({
      clients: clientRows.map(mapClient),
      sites: siteRows.map((s) => mapSite(s, clientDisplayIdByUuid)),
      jobs: jobRows.map((j) => mapJob(j, clientDisplayIdByUuid, siteDisplayIdByUuid, photosByJobUuid, videosByJobUuid)),
      operatives: operativeRows.map((r) => mapOperative(r, clientIdsByOperativeId)),
      attendanceEvents: attendanceRows.map((r) => mapAttendanceEvent(r, operativeNameById)),
      schedules: scheduleRows.map((r) => mapSchedule(r, clientDisplayIdByUuid, siteDisplayIdByUuid, operativeIdsByScheduleId)),
      scheduleExceptions: scheduleExceptionRows.map(mapScheduleException),
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const addJob = useCallback(
    async (payload) => {
      // The display_id (e.g. "SP-0041") is generated inside this RPC, in
      // the same transaction as the insert - computing it client-side and
      // inserting separately let two concurrent creates race for the same
      // number.
      const { error } = await supabase.rpc('create_job', {
        p_organization_id: user.organizationId,
        p_client_id: clientUuidByDisplayIdRef.current[payload.clientId],
        p_site_id: siteUuidByDisplayIdRef.current[payload.siteId],
        p_task_type: payload.taskType,
        p_area: payload.area,
        p_instructions: payload.instructions || '',
        p_recurrence: payload.recurrence,
        p_scheduled_time: payload.scheduledTime,
        p_operative_id: payload.operativeId,
        p_photos_required: payload.photosRequired,
        p_notes: payload.notes || '',
      })
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [user, fetchAll]
  )

  const updateJob = useCallback(
    async (id, patch) => {
      const { photos, photosSubmitted, videos, ...rest } = patch
      const columnPatch = {}
      if ('status' in rest) columnPatch.status = rest.status
      if ('operativeId' in rest) columnPatch.operative_id = rest.operativeId
      if ('scheduledTime' in rest) columnPatch.scheduled_time = rest.scheduledTime
      if ('instructions' in rest) columnPatch.instructions = rest.instructions
      if ('notes' in rest) columnPatch.notes = rest.notes

      // Evidence is written before the job row, for two reasons that both
      // point the same way: sealing a job blocks any further photo writes,
      // and the database's evidence check counts the photos already stored
      // when the seal happens. Saving the row first would seal the job and
      // then have its own evidence rejected.
      const jobUuid = jobUuidByDisplayIdRef.current[id]

      // Deletes and re-inserts only one media type's rows, scoped by
      // media_type - so passing photos without videos (or vice versa)
      // never touches the type that wasn't included. Skips entirely when
      // that type wasn't passed at all, rather than treating "not passed"
      // the same as "passed as empty".
      const replaceMedia = async (items, mediaType) => {
        if (!items) return []
        // Read the stored set before replacing it. Rows are deleted and
        // re-inserted wholesale, so "rows we deleted" isn't the same as
        // "items the user removed" — only the URLs missing from the
        // incoming set are actually orphaned.
        const { data: stored } = await supabase
          .from('job_photos')
          .select('storage_url')
          .eq('job_id', jobUuid)
          .eq('media_type', mediaType)

        await supabase.from('job_photos').delete().eq('job_id', jobUuid).eq('media_type', mediaType)
        if (items.length) {
          const { error: mediaError } = await supabase.from('job_photos').insert(
            items.map((m) => ({ job_id: jobUuid, storage_url: m.dataUrl, captured_at: m.capturedAt, media_type: mediaType }))
          )
          if (mediaError) throw new Error(mediaError.message)
        }

        const kept = new Set(items.map((m) => m.dataUrl))
        return (stored || []).map((r) => r.storage_url).filter((u) => !kept.has(u))
      }

      const discardedPhotos = await replaceMedia(photos, 'photo')
      const discardedVideos = await replaceMedia(videos, 'video')

      const { data, error } = await supabase.from('jobs').update(columnPatch).eq('display_id', id).select()
      if (error) throw new Error(error.message)
      if (!data?.length) throw new Error('This job can no longer be updated.')

      await removePhotoObjects(discardedPhotos)
      await removeVideoObjects(discardedVideos)
      await fetchAll()
    },
    [fetchAll]
  )

  const deleteJob = useCallback(
    async (id) => {
      const jobUuid = jobUuidByDisplayIdRef.current[id]
      const { data: storedMedia } = await supabase
        .from('job_photos')
        .select('storage_url, media_type')
        .eq('job_id', jobUuid)

      const { data, error } = await supabase.from('jobs').delete().eq('display_id', id).select()
      if (error) throw new Error(error.message)
      // An empty result means RLS refused the delete (already submitted, or
      // sealed) rather than the row simply not existing. Stop here — a
      // silently blocked delete must not fall through to removing evidence
      // files for a job that's still on record.
      if (!data?.length) throw new Error('This job can no longer be deleted.')

      // The job_photos rows went with the job via cascade, but a cascade
      // can't reach into Storage — without this the files outlive the job
      // they were evidence for, still readable at their public URLs. Photos
      // and videos live in separate buckets, so they're split before removal.
      const media = storedMedia || []
      await removePhotoObjects(media.filter((r) => r.media_type !== 'video').map((r) => r.storage_url))
      await removeVideoObjects(media.filter((r) => r.media_type === 'video').map((r) => r.storage_url))
      await fetchAll()
    },
    [fetchAll]
  )

  const submitProof = useCallback(
    async (jobId, completionStatus, photos, notes, videos = []) => {
      const target = state.jobs.find((j) => j.id === jobId)
      // Once a job is Completed & Evidenced it's locked — evidence that can be
      // silently rewritten after the fact isn't proof of anything. Corrections
      // past this point go through an admin (Edit Job), not a re-submission.
      if (!target || target.status === 'Completed & Evidenced') return

      const statusMap = {
        Completed: 'Completed & Evidenced',
        'Completed with issue': 'At Risk',
        'Unable to complete': 'Missing Evidence',
      }

      // Evidence is written first, then the job is sealed. Once the status
      // is Completed & Evidenced the database stops accepting evidence
      // changes for that job, so doing this the other way round would seal
      // the job and then have its own evidence write rejected.
      const jobUuid = jobUuidByDisplayIdRef.current[jobId]

      // Same per-type replace as updateJob - kept as its own copy here
      // since it closes over this call's jobUuid, not a shared one.
      const replaceMedia = async (items, mediaType) => {
        const { data: stored } = await supabase
          .from('job_photos')
          .select('storage_url')
          .eq('job_id', jobUuid)
          .eq('media_type', mediaType)

        await supabase.from('job_photos').delete().eq('job_id', jobUuid).eq('media_type', mediaType)
        if (items.length) {
          const { error: mediaError } = await supabase.from('job_photos').insert(
            items.map((m) => ({ job_id: jobUuid, storage_url: m.dataUrl, captured_at: m.capturedAt, media_type: mediaType }))
          )
          if (mediaError) throw new Error(mediaError.message)
        }

        const kept = new Set(items.map((m) => m.dataUrl))
        return (stored || []).map((r) => r.storage_url).filter((u) => !kept.has(u))
      }

      const discardedPhotos = await replaceMedia(photos, 'photo')
      const discardedVideos = await replaceMedia(videos, 'video')

      const columnPatch = {
        status: statusMap[completionStatus] || target.status,
        notes,
        submitted_time: toLocalTimestamp(),
      }
      // Permanent, so only ever set on the very first submission. A trigger
      // enforces this at the database level too, but skipping it here means
      // a genuine resubmission with a different outcome (e.g. going back
      // and finishing a job first reported as "Unable to complete") never
      // even attempts a change the trigger would reject.
      if (!target.originalOutcome) {
        columnPatch.original_outcome = completionStatus
      }

      const { data, error } = await supabase.from('jobs').update(columnPatch).eq('display_id', jobId).select()
      if (error) throw new Error(error.message)
      // An empty result means RLS refused the write (someone else's job, or
      // one already sealed) rather than the row simply being unchanged.
      if (!data?.length) throw new Error('This job can no longer be updated.')

      // Only once the job itself is saved — deleting the files first would
      // destroy evidence for a submission that then failed.
      await removePhotoObjects(discardedPhotos)
      await removeVideoObjects(discardedVideos)

      await fetchAll()
    },
    [state.jobs, fetchAll]
  )

  // A plain data write like updateJob — no auth entanglement — but a
  // distinct action from it because the database only allows resolved_by
  // and resolution_notes to be set together, once, by an admin, never
  // alongside other job edits. resolved_at is stamped by the database
  // itself, not sent from here.
  const resolveJob = useCallback(
    async (id, resolutionNotes) => {
      const { data, error } = await supabase
        .from('jobs')
        .update({ resolved_by: user.id, resolution_notes: resolutionNotes })
        .eq('display_id', id)
        .select()
      if (error) throw new Error(error.message)
      if (!data?.length) throw new Error('This job could not be marked resolved.')
      await fetchAll()
    },
    [user, fetchAll]
  )

  // The other half of resolveJob: clears resolved_by and resolution_notes
  // together, which the database reads as "put this back in front of the
  // operative" and clears resolved_at itself in response. There's no
  // history kept of the resolution being undone - reopening is a fresh
  // start for the job, not an edit to the old resolution record.
  const reopenJob = useCallback(
    async (id) => {
      const { data, error } = await supabase
        .from('jobs')
        .update({ resolved_by: null, resolution_notes: null })
        .eq('display_id', id)
        .select()
      if (error) throw new Error(error.message)
      if (!data?.length) throw new Error('This job could not be reopened.')
      await fetchAll()
    },
    [fetchAll]
  )

  const addSite = useCallback(
    async (payload) => {
      const { error } = await supabase.rpc('create_site', {
        p_organization_id: user.organizationId,
        p_client_id: clientUuidByDisplayIdRef.current[payload.clientId],
        p_name: payload.name,
        p_address: payload.address,
        p_postcode: payload.postcode,
        p_site_contact: payload.siteContact,
        p_phone: payload.phone,
        p_access_notes: payload.accessNotes,
      })
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [user, fetchAll]
  )

  const deleteSite = useCallback(
    async (id) => {
      const { error } = await supabase.from('sites').delete().eq('display_id', id)
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll]
  )

  const addClient = useCallback(
    async (payload) => {
      const { error } = await supabase.rpc('create_client', {
        p_organization_id: user.organizationId,
        p_name: payload.name,
        p_sector: payload.sector,
        p_contact_name: payload.contactName,
        p_contact_email: payload.contactEmail,
        p_contact_phone: payload.contactPhone,
        p_contract_start_date: payload.contractStartDate || null,
        p_notes: payload.notes,
      })
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [user, fetchAll]
  )

  const deleteClient = useCallback(
    async (id) => {
      const { error } = await supabase.from('clients').delete().eq('display_id', id)
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll]
  )

  // Schedules have no display_id and no advisory-lock RPC like jobs/sites/
  // clients do - there's no numbering scheme to race over, just a plain
  // insert, the same shape as attendance_events.
  const addSchedule = useCallback(
    async (payload) => {
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          organization_id: user.organizationId,
          client_id: clientUuidByDisplayIdRef.current[payload.clientId],
          site_id: siteUuidByDisplayIdRef.current[payload.siteId],
          task_type: payload.taskType,
          area: payload.area || null,
          instructions: payload.instructions || null,
          photos_required: payload.photosRequired,
          days_of_week: payload.daysOfWeek,
          start_time: payload.startTime,
          expected_duration_minutes: payload.expectedDurationMinutes || null,
          effective_start_date: payload.effectiveStartDate,
          effective_end_date: payload.effectiveEndDate || null,
          notes: payload.notes || null,
          created_by: user.id,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)

      if (payload.operativeIds?.length) {
        const { error: rosterError } = await supabase
          .from('schedule_operatives')
          .insert(payload.operativeIds.map((operative_id) => ({ schedule_id: data.id, operative_id })))
        if (rosterError) throw new Error(rosterError.message)
      }
      await fetchAll()
    },
    [user, fetchAll]
  )

  // Editing a Schedule only ever affects generation from this point forward
  // - already-generated Job Instances are left exactly as they are (the
  // same "leave existing instances alone" rule pausing follows too). There
  // is nothing to reach back and fix up here, unlike addScheduleException
  // below.
  const updateSchedule = useCallback(
    async (id, patch) => {
      const columnPatch = {}
      if ('taskType' in patch) columnPatch.task_type = patch.taskType
      if ('area' in patch) columnPatch.area = patch.area
      if ('instructions' in patch) columnPatch.instructions = patch.instructions
      if ('photosRequired' in patch) columnPatch.photos_required = patch.photosRequired
      if ('daysOfWeek' in patch) columnPatch.days_of_week = patch.daysOfWeek
      if ('startTime' in patch) columnPatch.start_time = patch.startTime
      if ('expectedDurationMinutes' in patch) columnPatch.expected_duration_minutes = patch.expectedDurationMinutes
      if ('effectiveStartDate' in patch) columnPatch.effective_start_date = patch.effectiveStartDate
      if ('effectiveEndDate' in patch) columnPatch.effective_end_date = patch.effectiveEndDate
      if ('notes' in patch) columnPatch.notes = patch.notes

      const { error } = await supabase.from('schedules').update(columnPatch).eq('id', id)
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll]
  )

  // Replaces the whole team roster rather than diffing - same shape as
  // setOperativeClients, the list is always small enough that this is
  // simpler than tracking adds/removes separately.
  const setScheduleOperatives = useCallback(
    async (scheduleId, operativeIds) => {
      const { error: deleteError } = await supabase.from('schedule_operatives').delete().eq('schedule_id', scheduleId)
      if (deleteError) throw new Error(deleteError.message)
      if (operativeIds.length) {
        const { error: insertError } = await supabase
          .from('schedule_operatives')
          .insert(operativeIds.map((operative_id) => ({ schedule_id: scheduleId, operative_id })))
        if (insertError) throw new Error(insertError.message)
      }
      await fetchAll()
    },
    [fetchAll]
  )

  // Pausing only flips the status - the generator stops producing new jobs
  // for it, and everything already generated is left alone (see
  // supabase/migrations/20260816120000_schedule_pause_end_cancels_pending.sql).
  // Ending also flips the status, but a database trigger on schedules
  // additionally cancels this schedule's pending, not-yet-visited jobs -
  // that half happens automatically, not from anything called here.
  const setScheduleStatus = useCallback(
    async (id, status) => {
      const { error } = await supabase.from('schedules').update({ status }).eq('id', id)
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll]
  )

  // Exceptions change a single date without touching the Schedule itself,
  // but the generation window runs ~14 days ahead, so by the time a manager
  // logs a cover or cancellation the Job Instance for that date has usually
  // already been created. Adding the exception alone wouldn't affect it
  // until the schedule's next occurrence far in the future - so this also
  // reaches back and fixes up any already-generated instance the exception
  // applies to, through the same deleteJob/updateJob paths a manager would
  // use by hand. A job that's already submitted or sealed is left alone
  // regardless - the visit already happened, an exception can't undo that.
  const addScheduleException = useCallback(
    async (payload) => {
      const { error } = await supabase.from('schedule_exceptions').insert({
        schedule_id: payload.scheduleId,
        exception_date: payload.exceptionDate,
        operative_id: payload.operativeId || null,
        type: payload.type,
        replacement_operative_id: payload.type === 'cover' ? payload.replacementOperativeId : null,
        notes: payload.notes || null,
        created_by: user.id,
      })
      if (error) throw new Error(error.message)

      let affectedQuery = supabase
        .from('jobs')
        .select('display_id')
        .eq('schedule_id', payload.scheduleId)
        .eq('schedule_occurrence_date', payload.exceptionDate)
        .eq('status', 'Incomplete')
        .is('submitted_time', null)
      if (payload.operativeId) affectedQuery = affectedQuery.eq('operative_id', payload.operativeId)
      const { data: affectedJobs, error: lookupError } = await affectedQuery
      if (lookupError) throw new Error(lookupError.message)

      for (const job of affectedJobs || []) {
        if (payload.type === 'cancel') {
          await deleteJob(job.display_id)
        } else if (payload.type === 'cover') {
          await updateJob(job.display_id, { operativeId: payload.replacementOperativeId })
        }
      }

      await fetchAll()
    },
    [user, deleteJob, updateJob, fetchAll]
  )

  // Removing an exception only stops it applying to future generation runs
  // - it does not retroactively restore a job addScheduleException already
  // cancelled, or un-reassign one it already covered. Those already
  // happened as real actions on real rows; undoing them is a manual fix
  // through Edit Job, the same as undoing any other completed action here.
  const deleteScheduleException = useCallback(
    async (id) => {
      const { error } = await supabase.from('schedule_exceptions').delete().eq('id', id)
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll]
  )

  // Creating another person's login account needs the service_role key,
  // which can never touch the browser — so this calls a serverless function
  // instead of talking to Supabase directly, unlike every other action here.
  const inviteOperative = useCallback(
    async ({ name, email }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/operatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'invite', name, email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to invite operative')
      await fetchAll()
    },
    [fetchAll]
  )

  // Deactivating bans the linked login as well as flipping the flag, which
  // needs the service_role key — the same reason inviteOperative can't be a
  // direct Supabase call either.
  const setOperativeActive = useCallback(
    async (operativeId, active) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/operatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ action: 'setActive', operativeId, active }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update operative status')
      await fetchAll()
    },
    [fetchAll]
  )

  // Unlike operative status, this is a plain data write with no auth
  // entanglement, so it goes straight to Supabase under ordinary RLS rather
  // than through a serverless endpoint. Replaces the whole set rather than
  // diffing added/removed clients — the list is small, and it mirrors the
  // same delete-then-insert shape already used for a job's photos.
  const setOperativeClients = useCallback(
    async (operativeId, clientDisplayIds) => {
      const clientUuids = clientDisplayIds.map((id) => clientUuidByDisplayIdRef.current[id]).filter(Boolean)

      const { error: deleteError } = await supabase.from('operative_clients').delete().eq('operative_id', operativeId)
      if (deleteError) throw new Error(deleteError.message)

      if (clientUuids.length) {
        const { error: insertError } = await supabase
          .from('operative_clients')
          .insert(clientUuids.map((client_id) => ({ operative_id: operativeId, client_id })))
        if (insertError) throw new Error(insertError.message)
      }
      await fetchAll()
    },
    [fetchAll]
  )

  // Plain data writes with no auth entanglement, so these go straight to
  // Supabase under ordinary RLS like most other actions here - the
  // alternation trigger is what actually enforces which one is legal to
  // call next, this just surfaces that as a normal thrown error.
  const clockIn = useCallback(async () => {
    const { error } = await supabase
      .from('attendance_events')
      .insert({ organization_id: user.organizationId, operative_id: user.operativeId, event_type: 'clock_in' })
    if (error) throw new Error(error.message)
    await fetchAll()
  }, [user, fetchAll])

  const clockOut = useCallback(async () => {
    const { error } = await supabase
      .from('attendance_events')
      .insert({ organization_id: user.organizationId, operative_id: user.operativeId, event_type: 'clock_out' })
    if (error) throw new Error(error.message)
    await fetchAll()
  }, [user, fetchAll])

  const value = useMemo(
    () => ({
      ...state,
      loading,
      error,
      addJob,
      updateJob,
      deleteJob,
      submitProof,
      resolveJob,
      reopenJob,
      addSite,
      deleteSite,
      addClient,
      deleteClient,
      addSchedule,
      updateSchedule,
      setScheduleOperatives,
      setScheduleStatus,
      addScheduleException,
      deleteScheduleException,
      inviteOperative,
      setOperativeActive,
      setOperativeClients,
      clockIn,
      clockOut,
      refreshData: fetchAll,
    }),
    [
      state,
      loading,
      error,
      addJob,
      updateJob,
      deleteJob,
      submitProof,
      resolveJob,
      reopenJob,
      addSite,
      deleteSite,
      addClient,
      deleteClient,
      addSchedule,
      updateSchedule,
      setScheduleOperatives,
      setScheduleStatus,
      addScheduleException,
      deleteScheduleException,
      inviteOperative,
      setOperativeActive,
      setOperativeClients,
      clockIn,
      clockOut,
      fetchAll,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
