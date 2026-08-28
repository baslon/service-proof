import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import AddScheduleModal from '../components/modals/AddScheduleModal'
import ScheduleDetailModal from '../components/modals/ScheduleDetailModal'
import { useApp } from '../context/AppContext'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_STYLE = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  paused: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ended: 'bg-zinc-100 text-zinc-500 ring-zinc-500/10',
}

function formatDays(daysOfWeek) {
  return [...daysOfWeek]
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join('/')
}

function formatTime(value) {
  if (!value) return ''
  const [h, m] = value.split(':')
  const hour = Number(h)
  const period = hour >= 12 ? 'pm' : 'am'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${m}${period}`
}

export default function Schedules() {
  const { clients, sites, operatives, schedules } = useApp()
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [adding, setAdding] = useState(false)
  const [activeSchedule, setActiveSchedule] = useState(null)

  const clientName = (id) => clients.find((c) => c.id === id)?.name || 'Unknown client'
  const siteName = (id) => sites.find((s) => s.id === id)?.name || 'Unknown site'
  const operativeNames = (ids) =>
    ids.length === 0 ? 'Unassigned' : ids.map((id) => operatives.find((o) => o.id === id)?.name || id).join(', ')

  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase()
    return schedules.filter((s) => {
      if (clientFilter && s.clientId !== clientFilter) return false
      if (statusFilter && s.status !== statusFilter) return false
      if (!q) return true
      return (
        siteName(s.siteId).toLowerCase().includes(q) ||
        clientName(s.clientId).toLowerCase().includes(q) ||
        s.taskType.toLowerCase().includes(q)
      )
    })
  }, [schedules, search, clientFilter, statusFilter, clients, sites])

  // Keep the modal's data current if the schedule it's showing changes
  // underneath it (e.g. after Save triggers a refetch).
  const activeScheduleLive = activeSchedule ? schedules.find((s) => s.id === activeSchedule.id) : null

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Schedules</h1>
          <p className="mt-1 text-sm text-zinc-500">
            The standing plan for each site. Jobs generate automatically from these — no need to create them by hand.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          + Add schedule
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          placeholder="Search by site, client, or task..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:w-72"
        />
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:w-auto"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:w-auto"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSchedules.map((schedule) => (
          <button
            key={schedule.id}
            onClick={() => setActiveSchedule(schedule)}
            className="rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:shadow-md hover:ring-1 hover:ring-zinc-300"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{clientName(schedule.clientId)}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLE[schedule.status]}`}>
                {schedule.status}
              </span>
            </div>
            <h3 className="mt-1 text-base font-semibold text-zinc-900">{siteName(schedule.siteId)}</h3>
            <p className="mt-1 text-sm text-zinc-500">{schedule.taskType}</p>
            <p className="mt-3 text-sm text-zinc-700">
              {formatDays(schedule.daysOfWeek)} · {formatTime(schedule.startTime)}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-400">{operativeNames(schedule.operativeIds)}</p>
          </button>
        ))}
        {filteredSchedules.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-zinc-400">No schedules match your search.</p>
        )}
      </div>

      {adding && <AddScheduleModal onClose={() => setAdding(false)} />}
      {activeScheduleLive && (
        <ScheduleDetailModal schedule={activeScheduleLive} onClose={() => setActiveSchedule(null)} />
      )}
    </DashboardLayout>
  )
}
