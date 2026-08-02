import { createContext, useContext, useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { toLocalTimestamp } from '../utils/time'
import { removePhotoObjects } from '../lib/uploadPhoto'

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

function mapJob(row, clientDisplayIdByUuid, siteDisplayIdByUuid, photosByJobUuid) {
  const photos = photosByJobUuid[row.id] || []
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
    photosRequired: row.photos_required,
    photosSubmitted: photos.length,
    photos,
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
  const [state, setState] = useState({ clients: [], sites: [], jobs: [], operatives: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const clientUuidByDisplayIdRef = useRef({})
  const siteUuidByDisplayIdRef = useRef({})
  const jobUuidByDisplayIdRef = useRef({})

  const fetchAll = useCallback(async () => {
    if (!user) {
      setState({ clients: [], sites: [], jobs: [], operatives: [] })
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)

    const [clientsRes, sitesRes, jobsRes, operativesRes, operativeClientsRes] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('sites').select('*'),
      supabase.from('jobs').select('*').order('display_id', { ascending: false }),
      supabase.from('operatives').select('*'),
      supabase.from('operative_clients').select('*'),
    ])

    const jobUuids = (jobsRes.data || []).map((j) => j.id)
    const photosRes = jobUuids.length
      ? await supabase.from('job_photos').select('*').in('job_id', jobUuids)
      : { data: [] }

    // A failed fetch used to fall through to `data || []` and render as a
    // perfectly normal empty account - the most alarming possible way to
    // report a network blip to someone who had data a minute ago. Bail out
    // instead, leaving whatever was last loaded on screen.
    const failure = [clientsRes, sitesRes, jobsRes, operativesRes, operativeClientsRes, photosRes].find((r) => r.error)
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
    const photoRows = photosRes.data || []

    const clientDisplayIdByUuid = Object.fromEntries(clientRows.map((c) => [c.id, c.display_id]))
    const siteDisplayIdByUuid = Object.fromEntries(siteRows.map((s) => [s.id, s.display_id]))
    clientUuidByDisplayIdRef.current = Object.fromEntries(clientRows.map((c) => [c.display_id, c.id]))
    siteUuidByDisplayIdRef.current = Object.fromEntries(siteRows.map((s) => [s.display_id, s.id]))
    jobUuidByDisplayIdRef.current = Object.fromEntries(jobRows.map((j) => [j.display_id, j.id]))

    const photosByJobUuid = {}
    photoRows.forEach((p) => {
      ;(photosByJobUuid[p.job_id] ||= []).push({ id: p.id, dataUrl: p.storage_url, capturedAt: p.captured_at })
    })
    Object.values(photosByJobUuid).forEach((arr) => arr.sort((a, b) => (a.capturedAt < b.capturedAt ? -1 : 1)))

    const clientIdsByOperativeId = {}
    operativeClientRows.forEach((r) => {
      const displayId = clientDisplayIdByUuid[r.client_id]
      if (displayId) (clientIdsByOperativeId[r.operative_id] ||= []).push(displayId)
    })

    setState({
      clients: clientRows.map(mapClient),
      sites: siteRows.map((s) => mapSite(s, clientDisplayIdByUuid)),
      jobs: jobRows.map((j) => mapJob(j, clientDisplayIdByUuid, siteDisplayIdByUuid, photosByJobUuid)),
      operatives: operativeRows.map((r) => mapOperative(r, clientIdsByOperativeId)),
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
      const { photos, photosSubmitted, ...rest } = patch
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
      let discarded = []

      if (photos) {
        // Read the stored set before replacing it. Rows are deleted and
        // re-inserted wholesale, so "rows we deleted" isn't the same as
        // "photos the user removed" — only the URLs missing from the
        // incoming set are actually orphaned.
        const { data: storedPhotos } = await supabase
          .from('job_photos')
          .select('storage_url')
          .eq('job_id', jobUuid)

        await supabase.from('job_photos').delete().eq('job_id', jobUuid)
        if (photos.length) {
          const { error: photoError } = await supabase
            .from('job_photos')
            .insert(photos.map((p) => ({ job_id: jobUuid, storage_url: p.dataUrl, captured_at: p.capturedAt })))
          if (photoError) throw new Error(photoError.message)
        }

        const kept = new Set(photos.map((p) => p.dataUrl))
        discarded = (storedPhotos || []).map((r) => r.storage_url).filter((u) => !kept.has(u))
      }

      const { data, error } = await supabase.from('jobs').update(columnPatch).eq('display_id', id).select()
      if (error) throw new Error(error.message)
      if (!data?.length) throw new Error('This job can no longer be updated.')

      await removePhotoObjects(discarded)
      await fetchAll()
    },
    [fetchAll]
  )

  const deleteJob = useCallback(
    async (id) => {
      const jobUuid = jobUuidByDisplayIdRef.current[id]
      const { data: storedPhotos } = await supabase
        .from('job_photos')
        .select('storage_url')
        .eq('job_id', jobUuid)

      const { data, error } = await supabase.from('jobs').delete().eq('display_id', id).select()
      if (error) throw new Error(error.message)
      // An empty result means RLS refused the delete (already submitted, or
      // sealed) rather than the row simply not existing. Stop here — a
      // silently blocked delete must not fall through to removing photo
      // files for a job that's still on record.
      if (!data?.length) throw new Error('This job can no longer be deleted.')

      // The job_photos rows went with the job via cascade, but a cascade
      // can't reach into Storage — without this the files outlive the job
      // they were evidence for, still readable at their public URLs.
      await removePhotoObjects((storedPhotos || []).map((r) => r.storage_url))
      await fetchAll()
    },
    [fetchAll]
  )

  const submitProof = useCallback(
    async (jobId, completionStatus, photos, notes) => {
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
      // is Completed & Evidenced the database stops accepting photo changes
      // for that job, so doing this the other way round would seal the job
      // and then have its own evidence write rejected.
      const jobUuid = jobUuidByDisplayIdRef.current[jobId]
      const { data: storedPhotos } = await supabase
        .from('job_photos')
        .select('storage_url')
        .eq('job_id', jobUuid)

      await supabase.from('job_photos').delete().eq('job_id', jobUuid)
      if (photos.length) {
        const { error: photoError } = await supabase
          .from('job_photos')
          .insert(photos.map((p) => ({ job_id: jobUuid, storage_url: p.dataUrl, captured_at: p.capturedAt })))
        if (photoError) throw new Error(photoError.message)
      }

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
      const kept = new Set(photos.map((p) => p.dataUrl))
      await removePhotoObjects((storedPhotos || []).map((r) => r.storage_url).filter((u) => !kept.has(u)))

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

  // Creating another person's login account needs the service_role key,
  // which can never touch the browser — so this calls a serverless function
  // instead of talking to Supabase directly, unlike every other action here.
  const inviteOperative = useCallback(
    async ({ name, email }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/invite-operative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name, email }),
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
      const res = await fetch('/api/set-operative-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ operativeId, active }),
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
      addSite,
      deleteSite,
      addClient,
      deleteClient,
      inviteOperative,
      setOperativeActive,
      setOperativeClients,
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
      addSite,
      deleteSite,
      addClient,
      deleteClient,
      inviteOperative,
      setOperativeActive,
      setOperativeClients,
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
