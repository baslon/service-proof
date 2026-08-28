import { useMemo, useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'
import { TASK_TYPES } from '../../context/mockData'
import { isOperativeEligibleFor as isEligibleFor } from '../../lib/operativeEligibility'

// 0 = Sunday .. 6 = Saturday, matching JS Date.getDay() - the generator on
// the database side uses the same numbering, so this array is sent through
// with no conversion.
const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AddScheduleModal({ onClose }) {
  const { clients, sites, operatives, addSchedule } = useApp()
  const initialClientId = clients[0]?.id || ''
  const [form, setForm] = useState({
    clientId: initialClientId,
    siteId: '',
    taskType: TASK_TYPES[0],
    daysOfWeek: [],
    startTime: '06:00',
    expectedDurationMinutes: '',
    operativeIds: [],
    area: '',
    photosRequired: 6,
    instructions: '',
    notes: '',
    effectiveStartDate: todayIso(),
    effectiveEndDate: '',
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
        // Same reasoning as ScheduleJobModal - the previous team may not be
        // eligible for the new client, so it's dropped rather than kept
        // silently pointed at people who were never offered for this client.
        next.operativeIds = f.operativeIds.filter((id) =>
          operatives.find((o) => o.id === id && isEligibleFor(o, e.target.value))
        )
      }
      return next
    })

  const toggleDay = (value) =>
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(value) ? f.daysOfWeek.filter((d) => d !== value) : [...f.daysOfWeek, value],
    }))

  const toggleOperative = (id) =>
    setForm((f) => ({
      ...f,
      operativeIds: f.operativeIds.includes(id) ? f.operativeIds.filter((o) => o !== id) : [...f.operativeIds, id],
    }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.siteId) return
    if (form.daysOfWeek.length === 0) {
      setError('Pick at least one day of the week.')
      return
    }
    if (form.operativeIds.length === 0) {
      setError('Assign at least one operative.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await addSchedule({
        ...form,
        photosRequired: Number(form.photosRequired),
        expectedDurationMinutes: form.expectedDurationMinutes ? Number(form.expectedDurationMinutes) : null,
        effectiveEndDate: form.effectiveEndDate || null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Add recurring schedule" maxWidth="max-w-2xl">
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

        <FormField label="Days of week">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                  form.daysOfWeek.includes(d.value)
                    ? 'bg-indigo-600 text-white ring-indigo-600'
                    : 'text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Start time">
            <input type="time" className={inputClass} value={form.startTime} onChange={set('startTime')} required />
          </FormField>
          <FormField label="Expected duration (minutes)">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.expectedDurationMinutes}
              onChange={set('expectedDurationMinutes')}
            />
          </FormField>
        </div>

        <FormField label="Task type">
          <select className={inputClass} value={form.taskType} onChange={set('taskType')}>
            {TASK_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Area">
          <input
            className={inputClass}
            placeholder="e.g. Ground floor washrooms"
            value={form.area}
            onChange={set('area')}
            required
          />
        </FormField>

        <FormField label="Team">
          <p className="mb-2 text-xs text-slate-500">
            Select everyone who covers this site on this schedule. Each gets their own job on each generated day.
          </p>
          <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {eligibleOperatives.length === 0 ? (
              <p className="px-2 py-1 text-sm text-slate-400">No operative available for this client.</p>
            ) : (
              eligibleOperatives.map((o) => (
                <label key={o.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.operativeIds.includes(o.id)}
                    onChange={() => toggleOperative(o.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {o.name}
                </label>
              ))
            )}
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Photos required">
            <input type="number" min={0} className={inputClass} value={form.photosRequired} onChange={set('photosRequired')} />
          </FormField>
          <FormField label="Effective from">
            <input type="date" className={inputClass} value={form.effectiveStartDate} onChange={set('effectiveStartDate')} required />
          </FormField>
        </div>

        <FormField label="Effective until (optional)">
          <input type="date" className={inputClass} value={form.effectiveEndDate} onChange={set('effectiveEndDate')} />
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
          <textarea rows={2} className={inputClass} value={form.notes} onChange={set('notes')} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add schedule'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
