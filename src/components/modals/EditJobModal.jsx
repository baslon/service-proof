import { useRef, useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'
import { JOB_STATUSES } from '../../context/mockData'

export default function EditJobModal({ job, onClose }) {
  const { operatives, updateJob, deleteJob } = useApp()
  const [form, setForm] = useState({
    status: job.status,
    operativeId: job.operativeId,
    scheduledTime: job.scheduledTime,
    notes: job.notes || '',
  })
  const [photos, setPhotos] = useState(job.photos || [])
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const fileInputRef = useRef(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const removePhoto = (photoId) => setPhotos((prev) => prev.filter((p) => p.id !== photoId))

  const addPhotos = (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setPhotos((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, dataUrl: reader.result }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateJob(job.id, { ...form, photos, photosSubmitted: photos.length })
    onClose()
  }

  const handleDelete = () => {
    if (confirm(`Delete job ${job.id}? This cannot be undone.`)) {
      deleteJob(job.id)
      onClose()
    }
  }

  return (
    <Modal open onClose={onClose} title={`Edit job ${job.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          {job.taskType} &middot; {job.area}
        </p>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Photo evidence ({photos.length} / {job.photosRequired})
          </span>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewingPhoto(p.dataUrl)}
                  className="h-full w-full transition hover:ring-2 hover:ring-indigo-400"
                >
                  <img src={p.dataUrl} alt="Evidence" className="h-full w-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  aria-label="Delete photo"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-xs text-white transition hover:bg-red-600"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add photo"
              className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
              </svg>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={addPhotos} className="hidden" />
          {photos.length === 0 && (
            <p className="mt-1.5 text-xs text-slate-400">No photos submitted yet — add one above if needed.</p>
          )}
          {photos.length !== (job.photos?.length || 0) && (
            <p className="mt-1.5 text-xs text-amber-600">
              Photo changes will apply when you save. Deleted photos cannot be recovered.
            </p>
          )}
        </div>

        <FormField label="Status">
          <select className={inputClass} value={form.status} onChange={set('status')}>
            {JOB_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Operative">
          <select className={inputClass} value={form.operativeId} onChange={set('operativeId')}>
            {operatives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
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
          />
        </FormField>

        <FormField label="Notes">
          <textarea rows={3} className={inputClass} value={form.notes} onChange={set('notes')} />
        </FormField>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Delete job
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              Save changes
            </button>
          </div>
        </div>
      </form>

      {viewingPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-6"
          onClick={() => setViewingPhoto(null)}
        >
          <img src={viewingPhoto} alt="Evidence full size" className="max-h-full max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </Modal>
  )
}
