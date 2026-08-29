import { useMemo, useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'
import { TASK_TYPES, RECURRENCE_OPTIONS } from '../../context/mockData'
import { isOperativeEligibleFor as isEligibleFor } from '../../lib/operativeEligibility'

export default function ScheduleJobModal({ onClose }) {
  const { clients, sites, operatives, addJob } = useApp()
  const initialClientId = clients[0]?.id || ''
  const [form, setForm] = useState({
    clientId: initialClientId,
    siteId: '',
    taskType: TASK_TYPES[0],
    recurrence: 'Daily',
    operativeId: operatives.find((o) => isEligibleFor(o, initialClientId))?.id || '',
    area: '',
    scheduledTime: '',
    photosRequired: 3,
    instructions: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const sitesForClient = useMemo(() => sites.filter((s) => s.clientId === form.clientId), [sites, form.clientId])
  const eligibleOperatives = useMemo(
    () => operatives.filter((o) => isEligibleFor(o, form.clientId)),
    [operatives, form.clientId]
  )

  const set = (key) => (e) =>
    setForm((f) => {
      const next = { ...f, [key]: e.target.value }
      if (key === 'clientId') {
        const firstSite = sites.find((s) => s.clientId === e.target.value)
        next.siteId = firstSite ? firstSite.id : ''
        // The previously chosen operative may not work for the new client -
        // fall back to the first one who does, rather than silently keeping
        // an assignee who was never offered for this client.
        if (!operatives.find((o) => o.id === f.operativeId && isEligibleFor(o, e.target.value))) {
          next.operativeId = operatives.find((o) => isEligibleFor(o, e.target.value))?.id || ''
        }
      }
      return next
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.siteId) return
    setError('')
    setSubmitting(true)
    try {
      await addJob({ ...form, photosRequired: Number(form.photosRequired) })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
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
              {eligibleOperatives.length === 0 ? (
                <option value="" disabled>
                  No operative available for this client
                </option>
              ) : (
                eligibleOperatives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))
              )}
            </select>
          </FormField>

          <FormField label="Start time">
            <input type="datetime-local" className={inputClass} value={form.scheduledTime} onChange={set('scheduledTime')} required />
          </FormField>
        </div>

        <FormField label="Photos required">
          <input type="number" min={0} className={inputClass} value={form.photosRequired} onChange={set('photosRequired')} />
        </FormField>

        <FormField label="Instructions for the operative">
          <textarea
            rows={3}
            className={inputClass}
            placeholder="e.g. which products to use, access quirks, areas to avoid..."
            value={form.instructions}
            onChange={set('instructions')}
          />
        </FormField>

        <FormField label="Notes">
          <textarea rows={3} className={inputClass} value={form.notes} onChange={set('notes')} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? 'Scheduling…' : 'Schedule job'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
