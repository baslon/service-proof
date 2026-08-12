import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useApp } from '../context/AppContext'

// A local formatter rather than utils/time's shared formatDateTime: this is
// a timesheet, where the year matters (an attendance record still needs to
// read unambiguously well after the year turns over), unlike that helper's
// other callers which only ever show recent, same-year timestamps.
function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const EVENT_STYLE = {
  clock_in: { label: 'Clocked in', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  clock_out: { label: 'Clocked out', className: 'bg-slate-100 text-slate-600 ring-slate-500/10' },
}

export default function Attendance() {
  const { attendanceEvents, operatives } = useApp()
  const [operativeId, setOperativeId] = useState('')

  const filtered = useMemo(
    () => (operativeId ? attendanceEvents.filter((e) => e.operativeId === operativeId) : attendanceEvents),
    [attendanceEvents, operativeId]
  )

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">Clock-in and clock-out times recorded by operatives.</p>
        </div>
        <select
          value={operativeId}
          onChange={(e) => setOperativeId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All operatives</option>
          {operatives.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Operative', 'Event', 'Time'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">
                    No attendance recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const style = EVENT_STYLE[e.eventType]
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{e.operativeName}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDateTime(e.occurredAt)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
