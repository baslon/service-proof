import { useMemo, useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'
import { TASK_TYPES, RECURRENCE_OPTIONS } from '../../context/mockData'

export default function ScheduleJobModal({ onClose }) {
  const { clients, sites, operatives, addJob } = useApp()
  const [form, setForm] = useState({
    clientId: clients[0]?.id || '',
    siteId: '',
    taskType: TASK_TYPES[0],
    recurrence: 'Daily',
    operativeId: operatives[0]?.id || '',
    area: '',
    scheduledTime: '',
    photosRequired: 6,
    notes: '',
  })

  const sitesForClient = useMemo(() => sites.filter((s) => s.clientId === form.clientId), [sites, form.clientId])

  const set = (key) => (e) =>
    setForm((f) => {
      const next = { ...f, [key]: e.target.value }
      if (key === 'clientId') {
        const firstSite = sites.find((s) => s.clientId === e.target.value)
        next.siteId = firstSite ? firstSite.id : ''
      }
      return next
    })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.siteId) return
    addJob({ ...form, photosRequired: Number(form.photosRequired) })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Schedule new job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Client">
            <select className={inputClass} value={form.clientId} onChange={set('clientId')}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Site">
            <select className={inputClass} value={form.siteId} onChange={set('siteId')} required>
              <option value="" disabled>
                Select a site
              </option>
              {sitesForClient.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Task type">
            <select className={inputClass} value={form.taskType} onChange={set('taskType')}>
              {TASK_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Recurrence">
            <select className={inputClass} value={form.recurrence} onChange={set('recurrence')}>
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Area">
          <input
            className={inputClass}
            placeholder="e.g. Ground floor washrooms"
            value={form.area}
            onChange={set('area')}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Operative">
            <select className={inputClass} value={form.operativeId} onChange={set('operativeId')}>
              {operatives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Start time">
            <input type="datetime-local" className={inputClass} value={form.scheduledTime} onChange={set('scheduledTime')} required />
          </FormField>
        </div>

        <FormField label="Photos required">
          <input type="number" min={0} className={inputClass} value={form.photosRequired} onChange={set('photosRequired')} />
        </FormField>

        <FormField label="Notes">
          <textarea rows={3} className={inputClass} value={form.notes} onChange={set('notes')} />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
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
            Schedule job
          </button>
        </div>
      </form>
    </Modal>
  )
}
