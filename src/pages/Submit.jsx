import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import ConfirmDialog from '../components/ConfirmDialog'

const COMPLETION_OPTIONS = ['Completed', 'Completed with issue', 'Unable to complete']
const ACTIONABLE_STATUSES = ['Incomplete', 'Missing Evidence', 'At Risk']

// A job that was already flagged carries a sensible starting point for the
// operative reopening it, rather than always defaulting to "Completed".
const DEFAULT_COMPLETION_STATUS = {
  'Missing Evidence': 'Unable to complete',
  'At Risk': 'Completed with issue',
}

function JobList({ jobs, sites, onSelect }) {
  return (
    <div className="space-y-3 px-4 py-4">
      {jobs.map((job) => {
        const site = sites.find((s) => s.id === job.siteId)
        return (
          <button
            key={job.id}
            onClick={() => onSelect(job)}
            className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">{job.id}</span>
              <StatusBadge
                status={job.status}
                label={job.status === 'Incomplete' ? 'Assigned' : undefined}
                className="!px-2 !py-0.5"
              />
            </div>
            <p className="mt-1 text-sm text-slate-700">{job.taskType}</p>
            <p className="text-xs text-slate-500">{site?.name}</p>
            <p className="mt-2 text-xs font-medium text-indigo-600">
              {job.photosSubmitted}/{job.photosRequired} photo(s) &rarr;
            </p>
          </button>
        )
      })}
      {jobs.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          No jobs pending right now. Nice work.
        </div>
      )}
    </div>
  )
}

const SubmissionForm = forwardRef(function SubmissionForm({ job, site, onCancel, onSubmit }, ref) {
  // Fresh (Assigned) jobs start with no outcome pre-selected — the operative
  // must actively answer "how did this job go?" rather than the app assuming.
  // Re-entries into already-flagged jobs still carry their previous outcome
  // forward, since that's the operative's own prior answer, not an assumption.
  const initialCompletionStatus = DEFAULT_COMPLETION_STATUS[job.status] || ''
  const initialNotes = job.notes || ''
  const initialPhotosCount = (job.photos || []).length

  const [completionStatus, setCompletionStatus] = useState(initialCompletionStatus)
  const [photos, setPhotos] = useState(job.photos || [])
  const [notes, setNotes] = useState(initialNotes)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const fileInputRef = useRef(null)

  const isDirty =
    notes !== initialNotes || photos.length !== initialPhotosCount || completionStatus !== initialCompletionStatus

  // Lets the parent (the top-bar Exit button) check for unsaved changes too,
  // since that action lives outside this component.
  useImperativeHandle(ref, () => ({
    isDirty: () => isDirty,
  }))

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onCancel()
    }
  }

  const confirmDiscard = () => {
    setShowDiscardConfirm(false)
    onCancel()
  }

  const slotsLeft = job.photosRequired - photos.length

  const handleFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, Math.max(slotsLeft, 0))
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setPhotos((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, dataUrl: reader.result }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removePhoto = (id) => setPhotos((prev) => prev.filter((p) => p.id !== id))

  const handleSubmitClick = () => {
    if (!completionStatus) return
    if (completionStatus === 'Completed' && photos.length < job.photosRequired) {
      setError(
        `You need ${job.photosRequired - photos.length} more photo(s) to mark this Completed, or choose "Completed with issue" / "Unable to complete" instead.`
      )
      return
    }
    if (!notes.trim()) {
      setError(
        completionStatus === 'Completed'
          ? 'Add a note about this job before submitting.'
          : 'Add a note explaining what happened before saving.'
      )
      return
    }
    setError('')
    // Marking a job Completed locks it — it can no longer be edited or
    // resubmitted afterward, so make sure that's clearly understood first.
    if (completionStatus === 'Completed') {
      setShowConfirm(true)
    } else {
      onSubmit({ completionStatus, photos, notes })
    }
  }

  const confirmSubmit = () => {
    setShowConfirm(false)
    onSubmit({ completionStatus, photos, notes })
  }

  return (
    <div className="px-4 py-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{job.id}</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{job.taskType}</h2>
        <p className="text-sm text-slate-500">{site?.name}</p>
        <p className="text-sm text-slate-500">{job.area}</p>
      </div>

      {job.instructions && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Instructions</p>
          <p className="mt-1 text-sm text-slate-700">{job.instructions}</p>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">How did this job go?</p>
          <div className="space-y-2">
            {COMPLETION_OPTIONS.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  completionStatus === opt ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="completionStatus"
                  className="h-4 w-4 text-indigo-600"
                  checked={completionStatus === opt}
                  onChange={() => {
                    setCompletionStatus(opt)
                    setError('')
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Photo evidence</p>

          {photos.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                  <img src={p.dataUrl} alt="Evidence" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removePhoto(p.id)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-xs text-white"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={slotsLeft <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-6 text-sm font-medium text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-indigo-400 hover:text-indigo-600"
          >
            {slotsLeft > 0 ? 'Tap to take or upload a photo' : 'All required photos added'}
          </button>
          <p className="mt-2 text-center text-sm font-medium text-slate-600">
            {photos.length} / {job.photosRequired} required
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Notes<span className="text-red-500"> (required)</span>
          </p>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setError('')
            }}
            placeholder={
              completionStatus && completionStatus !== 'Completed'
                ? 'Provide a progress update note'
                : 'Add notes about this job...'
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={handleCancelClick}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmitClick}
          disabled={!completionStatus}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
            completionStatus === 'Unable to complete' ? 'bg-slate-600' : 'bg-indigo-600'
          }`}
        >
          {completionStatus === 'Unable to complete' ? 'Save' : 'Submit proof'}
        </button>
      </div>

      {showConfirm && (
        <ConfirmDialog
          tone="warning"
          title="Submit as Completed?"
          body={
            <>
              This marks the job as <strong>Completed &amp; Evidenced</strong>. Once submitted, you won&apos;t be
              able to edit or resubmit it &mdash; this action is final.
            </>
          }
          confirmLabel="Yes, submit"
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmSubmit}
        />
      )}

      {showDiscardConfirm && (
        <ConfirmDialog
          title="Discard changes?"
          body="You have unsaved changes on this job. If you leave now, they'll be lost."
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          confirmClassName="bg-red-600"
          onCancel={() => setShowDiscardConfirm(false)}
          onConfirm={confirmDiscard}
        />
      )}
    </div>
  )
})

export default function Submit() {
  const { jobs, sites, submitProof } = useApp()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [showExitDiscardConfirm, setShowExitDiscardConfirm] = useState(false)
  const formRef = useRef(null)

  const myJobs = jobs.filter(
    (j) => ACTIONABLE_STATUSES.includes(j.status) && (user?.role === 'admin' || j.operativeId === user?.operativeId)
  )
  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null
  const selectedSite = selectedJob ? sites.find((s) => s.id === selectedJob.siteId) : null

  const handleSubmit = ({ completionStatus, photos, notes }) => {
    submitProof(selectedJob.id, completionStatus, photos, notes)
    setSelectedJobId(null)
  }

  const performExit = () => {
    if (user?.role === 'admin') {
      navigate('/dashboard')
    } else {
      logout()
      navigate('/login', { replace: true })
    }
  }

  const handleExit = () => {
    if (selectedJob && formRef.current?.isDirty()) {
      setShowExitDiscardConfirm(true)
    } else {
      performExit()
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-200 sm:py-8">
      <div className="mx-auto flex h-screen w-full flex-col overflow-hidden bg-slate-50 sm:h-auto sm:max-w-sm sm:rounded-[2rem] sm:border-8 sm:border-slate-900 sm:shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-slate-900 px-4 py-3">
          <button onClick={handleExit} className="text-xs font-medium text-slate-300">
            &larr; Exit
          </button>
          <span className="text-sm font-semibold text-white">ServiceProof Field</span>
          <span className="w-9" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2">
          <span className="text-xs text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{user?.name}</span>
          </span>
          <button onClick={handleLogout} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            Log out
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
          <h1 className="text-base font-semibold text-slate-900">
            {selectedJob ? 'Submit proof' : `Your jobs (${myJobs.length})`}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto sm:max-h-[70vh] sm:min-h-[70vh]">
          {selectedJob ? (
            <SubmissionForm
              ref={formRef}
              job={selectedJob}
              site={selectedSite}
              onCancel={() => setSelectedJobId(null)}
              onSubmit={handleSubmit}
            />
          ) : (
            <JobList jobs={myJobs} sites={sites} onSelect={(j) => setSelectedJobId(j.id)} />
          )}
        </div>
      </div>

      {showExitDiscardConfirm && (
        <ConfirmDialog
          title="Discard changes?"
          body="You have unsaved changes on this job. If you leave now, they'll be lost."
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          confirmClassName="bg-red-600"
          onCancel={() => setShowExitDiscardConfirm(false)}
          onConfirm={() => {
            setShowExitDiscardConfirm(false)
            performExit()
          }}
        />
      )}
    </div>
  )
}
