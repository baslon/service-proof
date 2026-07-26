import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import StatusBadge from '../components/StatusBadge'
import EditJobModal from '../components/modals/EditJobModal'
import ScheduleJobModal from '../components/modals/ScheduleJobModal'
import { useApp } from '../context/AppContext'

const SUMMARY_CARDS = [
  { label: 'Completed & Evidenced', match: (j) => j.status === 'Completed & Evidenced', color: 'text-emerald-600' },
  { label: 'Missing Evidence', match: (j) => j.status === 'Missing Evidence', color: 'text-amber-600' },
  { label: 'At Risk', match: (j) => j.status === 'At Risk', color: 'text-red-600' },
  {
    label: 'Incomplete / Pending',
    match: (j) => j.status === 'Incomplete' || j.status === 'Awaiting Review',
    color: 'text-slate-600',
  },
]

export default function Dashboard() {
  const { clients, sites, jobs, operatives } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [clientFilter, setClientFilter] = useState(searchParams.get('client') || '')
  const [siteFilter, setSiteFilter] = useState(searchParams.get('site') || '')
  const [editingJob, setEditingJob] = useState(null)
  const [scheduling, setScheduling] = useState(false)

  const statusFilter = searchParams.get('status') || ''

  const clientName = (id) => clients.find((c) => c.id === id)?.name || 'Unknown client'
  const siteName = (id) => sites.find((s) => s.id === id)?.name || 'Unknown site'
  const operativeName = (id, operatives) => operatives.find((o) => o.id === id)?.name || 'Unassigned'

  const missingCount = jobs.filter((j) => j.status === 'Missing Evidence').length
  const atRiskCount = jobs.filter((j) => j.status === 'At Risk').length

  const sitesForFilter = useMemo(
    () => (clientFilter ? sites.filter((s) => s.clientId === clientFilter) : sites),
    [sites, clientFilter]
  )

  // "Incomplete / Pending" groups two statuses, so it can't be an exact match.
  const matchesStatus = (job) => {
    if (!statusFilter) return true
    const card = SUMMARY_CARDS.find((c) => c.label === statusFilter)
    return card ? card.match(job) : job.status === statusFilter
  }

  const filteredJobs = jobs.filter((j) => {
    if (!matchesStatus(j)) return false
    if (clientFilter && j.clientId !== clientFilter) return false
    if (siteFilter && j.siteId !== siteFilter) return false
    return true
  })

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Live evidence status across every client and site.</p>
        </div>
        <button
          onClick={() => setScheduling(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          + Schedule new job
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{jobs.filter(card.match).length}</p>
          </div>
        ))}
      </div>

      {missingCount > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
          <span>
            <strong>{missingCount}</strong> job{missingCount === 1 ? '' : 's'} missing evidence.
          </span>
          <Link to="/dashboard?status=Missing%20Evidence" className="font-medium underline underline-offset-2">
            Review now
          </Link>
        </div>
      )}
      {atRiskCount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">
          <span>
            <strong>{atRiskCount}</strong> job{atRiskCount === 1 ? '' : 's'} at risk of contract breach.
          </span>
          <Link to="/dashboard?status=At%20Risk" className="font-medium underline underline-offset-2">
            Review now
          </Link>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-auto"
          value={clientFilter}
          onChange={(e) => {
            setClientFilter(e.target.value)
            setSiteFilter('')
          }}
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-auto"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
        >
          <option value="">All sites</option>
          {sitesForFilter.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {statusFilter && (
          <button
            onClick={() => setSearchParams({})}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-50 sm:w-auto"
          >
            Clear status filter: {statusFilter} &times;
          </button>
        )}
      </div>

      {/* Mobile: card list */}
      <div className="mt-4 space-y-3 md:hidden">
        {filteredJobs.map((job) => (
          <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{job.id}</span>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-800">{clientName(job.clientId)}</p>
            <p className="text-xs text-slate-400">{siteName(job.siteId)}</p>

            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Task</dt>
                <dd className="text-right text-slate-700">{job.taskType}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Operative</dt>
                <dd className="text-right text-slate-700">{operativeName(job.operativeId, operatives)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Evidence</dt>
                <dd className="text-right text-slate-700">
                  {job.photosSubmitted} / {job.photosRequired}
                </dd>
              </div>
            </dl>

            <button
              onClick={() => setEditingJob(job)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Edit
            </button>
          </div>
        ))}
        {filteredJobs.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
            No jobs match the current filters.
          </p>
        )}
      </div>

      {/* Desktop / tablet: table */}
      <div className="mt-4 hidden rounded-xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Job', 'Client / Site', 'Task', 'Operative', 'Evidence', 'Status', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{job.id}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    <div className="font-medium text-slate-800">{clientName(job.clientId)}</div>
                    <div className="text-slate-400">{siteName(job.siteId)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{job.taskType}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{operativeName(job.operativeId, operatives)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {job.photosSubmitted} / {job.photosRequired}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingJob(job)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    No jobs match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingJob && <EditJobModal job={editingJob} onClose={() => setEditingJob(null)} />}
      {scheduling && <ScheduleJobModal onClose={() => setScheduling(false)} />}
    </DashboardLayout>
  )
}
