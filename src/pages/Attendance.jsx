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
  clock_out: { label: 'Clocked out', className: 'bg-zinc-100 text-zinc-600 ring-zinc-500/10' },
}

// within_geofence is null whenever there was nothing to check against (no
// device location, or none of that day's sites are geocoded yet) - shown
// as "Unknown" rather than folded into either true/false badge, since it's
// a genuinely different case from "checked and failed."
// docs/gps-geofencing-clock-in-scope.md.
function LocationBadge({ withinGeofence }) {
  if (withinGeofence === true) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        On-site
      </span>
    )
  }
  if (withinGeofence === false) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        Off-site
      </span>
    )
  }
  return <span className="text-xs text-zinc-400">Unknown</span>
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
          <h1 className="text-2xl font-bold text-zinc-900">Attendance</h1>
          <p className="mt-1 text-sm text-zinc-500">Clock-in and clock-out times recorded by operatives.</p>
        </div>
        <select
          value={operativeId}
          onChange={(e) => setOperativeId(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          <option value="">All operatives</option>
          {operatives.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                {['Operative', 'Event', 'Time', 'Location'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">
                    No attendance recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const style = EVENT_STYLE[e.eventType]
                  return (
                    <tr key={e.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">{e.operativeName}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">{formatDateTime(e.occurredAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <LocationBadge withinGeofence={e.withinGeofence} />
                      </td>
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
