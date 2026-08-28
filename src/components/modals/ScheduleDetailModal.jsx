import { useMemo, useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'
import { TASK_TYPES } from '../../context/mockData'
import { isOperativeEligibleFor as isEligibleFor } from '../../lib/operativeEligibility'

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

const STATUS_STYLE = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  paused: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ended: 'bg-zinc-100 text-zinc-500 ring-zinc-500/10',
}

function sameIdSet(a, b) {
  return a.length === b.length && a.every((id) => b.includes(id))
}

function StatusControls({ schedule, onChange }) {
  const { setScheduleStatus } = useApp()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const run = async (status) => {
    if (status === 'ended' && !confirm('End this schedule? It stops generating new jobs and cancels any pending jobs it already generated. This cannot be undone.')) {
      return
    }
    setError('')
    setWorking(true)
    try {
      await setScheduleStatus(schedule.id, status)
      onChange?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLE[schedule.status]}`}>
        {schedule.status}
      </span>
      {schedule.status !== 'ended' && (
        <div className="flex items-center gap-2">
          {schedule.status === 'active' ? (
            <button
              type="button"
              disabled={working}
              onClick={() => run('paused')}
              className="text-xs font-medium text-zinc-900 hover:text-zinc-600 disabled:opacity-60"
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              disabled={working}
              onClick={() => run('active')}
              className="text-xs font-medium text-zinc-900 hover:text-zinc-600 disabled:opacity-60"
            >
              Resume
            </button>
          )}
          <button
            type="button"
            disabled={working}
            onClick={() => run('ended')}
            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            End
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function ExceptionsSection({ schedule }) {
  const { operatives, scheduleExceptions, addScheduleException, deleteScheduleException } = useApp()
  const roster = operatives.filter((o) => schedule.operativeIds.includes(o.id))
  const [form, setForm] = useState({ exceptionDate: '', type: 'cancel', operativeId: '', replacementOperativeId: '', notes: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const exceptions = scheduleExceptions
    .filter((e) => e.scheduleId === schedule.id)
    .sort((a, b) => (a.exceptionDate < b.exceptionDate ? -1 : 1))

  const operativeName = (id) => operatives.find((o) => o.id === id)?.name || 'Unknown'

  const replacementOptions = operatives.filter(
    (o) => isEligibleFor(o, schedule.clientId) && o.id !== form.operativeId
  )

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.exceptionDate) {
      setError('Pick a date.')
      return
    }
    if (form.type === 'cover' && !form.operativeId) {
      setError('Cover needs a specific operative to cover for.')
      return
    }
    if (form.type === 'cover' && !form.replacementOperativeId) {
      setError('Pick who is covering.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await addScheduleException({
        scheduleId: schedule.id,
        exceptionDate: form.exceptionDate,
        operativeId: form.operativeId || null,
        type: form.type,
        replacementOperativeId: form.type === 'cover' ? form.replacementOperativeId : null,
        notes: form.notes,
      })
      setForm({ exceptionDate: '', type: 'cancel', operativeId: '', replacementOperativeId: '', notes: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (id) => {
    setError('')
    setRemovingId(id)
    try {
      await deleteScheduleException(id)
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-zinc-700">Exceptions</p>
      <p className="mt-1 text-xs text-zinc-500">
        Cover or cancel a single date without touching the schedule above. If that date's job already exists, it's
        updated immediately — otherwise the change applies whenever it's next generated.
      </p>

      <div className="mt-3 space-y-2">
        {exceptions.length === 0 ? (
          <p className="text-sm text-zinc-400">No exceptions logged.</p>
        ) : (
          exceptions.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-zinc-800">{ex.exceptionDate}</span>{' '}
                <span className="text-zinc-500">
                  {ex.type === 'cancel'
                    ? ex.operativeId
                      ? `${operativeName(ex.operativeId)} cancelled`
                      : 'Whole schedule cancelled'
                    : `${operativeName(ex.operativeId)} covered by ${operativeName(ex.replacementOperativeId)}`}
                </span>
                {ex.notes && <p className="text-xs text-zinc-400">{ex.notes}</p>}
              </div>
              <button
                type="button"
                disabled={removingId === ex.id}
                onClick={() => handleRemove(ex.id)}
                className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-lg border border-dashed border-zinc-300 p-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date">
            <input type="date" className={inputClass} value={form.exceptionDate} onChange={set('exceptionDate')} />
          </FormField>
          <FormField label="Type">
            <select className={inputClass} value={form.type} onChange={set('type')}>
              <option value="cancel">Cancel</option>
              <option value="cover">Cover</option>
            </select>
          </FormField>
        </div>

        <FormField label={form.type === 'cover' ? 'Covering for' : 'Applies to'}>
          <select className={inputClass} value={form.operativeId} onChange={set('operativeId')}>
            {form.type === 'cancel' && <option value="">Whole schedule</option>}
            {roster.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </FormField>

        {form.type === 'cover' && (
          <FormField label="Covered by">
            <select className={inputClass} value={form.replacementOperativeId} onChange={set('replacementOperativeId')}>
              <option value="" disabled>
                Select replacement
              </option>
              {replacementOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="Notes">
          <input className={inputClass} value={form.notes} onChange={set('notes')} placeholder="e.g. sickness, holiday" />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add exception'}
        </button>
      </form>
    </div>
  )
}

export default function ScheduleDetailModal({ schedule, onClose }) {
  const { clients, sites, operatives, updateSchedule, setScheduleOperatives } = useApp()
  const [form, setForm] = useState({
    taskType: schedule.taskType,
    area: schedule.area,
    daysOfWeek: schedule.daysOfWeek,
    startTime: schedule.startTime,
    expectedDurationMinutes: schedule.expectedDurationMinutes ?? '',
    photosRequired: schedule.photosRequired,
    instructions: schedule.instructions,
    notes: schedule.notes,
    effectiveEndDate: schedule.effectiveEndDate || '',
  })
  const [operativeIds, setOperativeIds] = useState(schedule.operativeIds)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const site = sites.find((s) => s.id === schedule.siteId)
  const client = clients.find((c) => c.id === schedule.clientId)
  const eligibleOperatives = useMemo(
    () => operatives.filter((o) => isEligibleFor(o, schedule.clientId)),
    [operatives, schedule.clientId]
  )

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const toggleDay = (value) =>
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(value) ? f.daysOfWeek.filter((d) => d !== value) : [...f.daysOfWeek, value],
    }))
  const toggleOperative = (id) =>
    setOperativeIds((ids) => (ids.includes(id) ? ids.filter((o) => o !== id) : [...ids, id]))

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.daysOfWeek.length === 0) {
      setError('Pick at least one day of the week.')
      return
    }
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      await updateSchedule(schedule.id, {
        ...form,
        photosRequired: Number(form.photosRequired),
        expectedDurationMinutes: form.expectedDurationMinutes ? Number(form.expectedDurationMinutes) : null,
        effectiveEndDate: form.effectiveEndDate || null,
      })
      if (!sameIdSet(operativeIds, schedule.operativeIds)) {
        await setScheduleOperatives(schedule.id, operativeIds)
      }
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={site?.name || 'Schedule'} maxWidth="max-w-2xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">{client?.name}</p>
          <StatusControls schedule={schedule} onChange={onClose} />
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Task type">
            <select className={inputClass} value={form.taskType} onChange={set('taskType')}>
              {TASK_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Area">
            <input className={inputClass} value={form.area} onChange={set('area')} required />
          </FormField>

          <FormField label="Days of week">
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                    form.daysOfWeek.includes(d.value)
                      ? 'bg-zinc-900 text-white ring-zinc-900'
                      : 'text-zinc-600 ring-zinc-300 hover:bg-zinc-50'
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Photos required">
              <input type="number" min={0} className={inputClass} value={form.photosRequired} onChange={set('photosRequired')} />
            </FormField>
            <FormField label="Effective until (optional)">
              <input type="date" className={inputClass} value={form.effectiveEndDate} onChange={set('effectiveEndDate')} />
            </FormField>
          </div>

          <FormField label="Instructions for the operative">
            <textarea rows={3} className={inputClass} value={form.instructions} onChange={set('instructions')} />
          </FormField>

          <FormField label="Notes">
            <textarea rows={2} className={inputClass} value={form.notes} onChange={set('notes')} />
          </FormField>

          <FormField label="Team">
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 p-2">
              {eligibleOperatives.map((o) => (
                <label key={o.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={operativeIds.includes(o.id)}
                    onChange={() => toggleOperative(o.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600"
                  />
                  {o.name}
                </label>
              ))}
            </div>
          </FormField>

          <p className="text-xs text-zinc-400">
            Changes here only affect jobs generated from now on — anything already generated is untouched.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && !error && <p className="text-sm text-emerald-600">Saved.</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        <div className="border-t border-zinc-200 pt-5">
          <ExceptionsSection schedule={schedule} />
        </div>
      </div>
    </Modal>
  )
}
