import { useMemo, useRef, useState } from 'react'
import Modal from '../Modal'
import ConfirmDialog from '../ConfirmDialog'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { JOB_STATUSES } from '../../context/mockData'
import { formatTime, formatDateTime } from '../../utils/time'
import { uploadPhoto } from '../../lib/uploadPhoto'
import { isOperativeEligibleFor } from '../../lib/operativeEligibility'

const initialFormFor = (job) => ({
  status: job.status,
  operativeId: job.operativeId,
  scheduledTime: job.scheduledTime,
  instructions: job.instructions || '',
  notes: job.notes || '',
})

export default function EditJobModal({ job, onClose }) {
  const { clients, operatives, updateJob, deleteJob } = useApp()
  const { user } = useAuth()
  const clientName = clients.find((c) => c.id === job.clientId)?.name || 'Unknown client'
  const initialForm = initialFormFor(job)
  const initialPhotoIds = (job.photos || []).map((p) => p.id).join(',')
  const [form, setForm] = useState(initialForm)
  const [photos, setPhotos] = useState(job.photos || [])
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const fileInputRef = useRef(null)

  // The job's current assignee always stays selectable, even if they've
  // since gone inactive or been narrowed to other clients — reassigning to
  // someone new only offers people who'd actually qualify today.
  const assignableOperatives = useMemo(() => {
    const eligible = operatives.filter((o) => isOperativeEligibleFor(o, job.clientId))
    if (job.operativeId && !eligible.some((o) => o.id === job.operativeId)) {
      const current = operatives.find((o) => o.id === job.operativeId)
      if (current) return [current, ...eligible]
    }
    return eligible
  }, [operatives, job.clientId, job.operativeId])

  // An evidenced job is sealed: its status can't be moved back and it can't
  // be deleted. The database enforces both, so these controls could only
  // ever have produced an error — better not to offer them at all.
  const isSealed = job.status === 'Completed & Evidenced'

  // Deletion is blocked more broadly than editing: once a job has been
  // submitted at all — At Risk or Missing Evidence, not just sealed — it's a
  // record of an incident, not a schedule slot, and the database now
  // refuses to delete it. Editing an unsealed job stays open regardless.
  const canDelete = !isSealed && !job.submittedTime

  const isDirty =
    Object.keys(initialForm).some((key) => form[key] !== initialForm[key]) ||
    photos.map((p) => p.id).join(',') !== initialPhotoIds

  const attemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setError('')
  }

  const removePhoto = (photoId) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setError('')
  }

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files)
    e.target.value = ''
    setError('')
    setUploading(true)
    try {
      for (const file of files) {
        const url = await uploadPhoto(file, user.organizationId)
        setPhotos((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, dataUrl: url, capturedAt: new Date().toISOString() },
        ])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.status === 'Completed & Evidenced' && photos.length < job.photosRequired) {
      setError(
        `Cannot mark as Completed & Evidenced with only ${photos.length} of ${job.photosRequired} required photos.`
      )
      return
    }
    setError('')
    setSaving(true)
    try {
      await updateJob(job.id, { ...form, photos, photosSubmitted: photos.length })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete job ${job.id}? This cannot be undone.`)) return
    setError('')
    setSaving(true)
    try {
      await deleteJob(job.id)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={attemptClose} title={isSealed ? `Job ${job.id}` : `Edit job ${job.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-400">{clientName}</p>
          <p className="text-sm text-slate-500">
            {job.taskType} &middot; {job.area}
          </p>
        </div>

        {isSealed && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
            <p className="font-medium">Sealed {job.submittedTime ? formatDateTime(job.submittedTime) : ''}</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              This record is evidence and can no longer be changed &mdash; by anyone.
            </p>
          </div>
        )}

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Photo evidence ({photos.length} / {job.photosRequired})
          </span>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewingPhoto(p)}
                  className="h-full w-full transition hover:ring-2 hover:ring-indigo-400"
                >
                  <img src={p.dataUrl} alt="Evidence" className="h-full w-full object-cover" />
                </button>
                {!isSealed && (
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    aria-label="Delete photo"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-xs text-white transition hover:bg-red-600"
                  >
                    &times;
                  </button>
                )}
                {p.capturedAt && (
                  <span className="absolute bottom-1 left-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {formatTime(p.capturedAt)}
                  </span>
                )}
              </div>
            ))}
            {!isSealed && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Add photo"
                className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <span className="text-xs">Uploading…</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
                  </svg>
                )}
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={addPhotos} className="hidden" />
          {photos.length === 0 && !isSealed && (
            <p className="mt-1.5 text-xs text-slate-400">No photos submitted yet — add one above if needed.</p>
          )}
          {photos.length !== (job.photos?.length || 0) && (
            <p className="mt-1.5 text-xs text-amber-600">
              Photo changes will apply when you save. Deleted photos cannot be recovered.
            </p>
          )}
        </div>

        <FormField label="Status">
          <select className={inputClass} value={form.status} onChange={set('status')} disabled={isSealed}>
            {JOB_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Operative">
          <select className={inputClass} value={form.operativeId} onChange={set('operativeId')} disabled={isSealed}>
            {assignableOperatives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {!o.active ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Scheduled time">
          <input
            type="datetime-local"
            className={inputClass}
            value={form.scheduledTime}
            onChange={set('scheduledTime')}
            disabled={isSealed}
          />
        </FormField>

        <FormField label="Instructions for the operative">
          <textarea
            rows={3}
            className={inputClass}
            placeholder="e.g. which products to use, access quirks, areas to avoid..."
            value={form.instructions}
            onChange={set('instructions')}
            disabled={isSealed}
          />
        </FormField>

        <FormField label="Notes">
          <textarea rows={3} className={inputClass} value={form.notes} onChange={set('notes')} disabled={isSealed} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Nothing on a sealed job can be saved or deleted, so the only
            action left is to close it. Offering Save and Delete anyway would
            just be two buttons that always fail. Delete is gated separately
            from editing — an unsealed job that's already been submitted can
            still be saved, but not deleted. */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              Delete job
            </button>
          )}
          <button
            type="button"
            onClick={attemptClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {isSealed ? 'Close' : 'Cancel'}
          </button>
          {!isSealed && (
            <button
              type="submit"
              disabled={uploading || saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      </form>

      {viewingPhoto && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-slate-900/80 p-6"
          onClick={() => setViewingPhoto(null)}
        >
          <img
            src={viewingPhoto.dataUrl}
            alt="Evidence full size"
            className="max-h-full max-w-full rounded-lg shadow-2xl"
          />
          {viewingPhoto.capturedAt && (
            <p className="text-sm font-medium text-white">Captured {formatDateTime(viewingPhoto.capturedAt)}</p>
          )}
        </div>
      )}

      {showDiscardConfirm && (
        <ConfirmDialog
          title="Discard changes?"
          body="You have unsaved changes on this job. If you leave now, they'll be lost."
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          confirmClassName="bg-red-600"
          onCancel={() => setShowDiscardConfirm(false)}
          onConfirm={() => {
            setShowDiscardConfirm(false)
            onClose()
          }}
        />
      )}
    </Modal>
  )
}
