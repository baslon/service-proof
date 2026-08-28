import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import StatusBadge from '../components/StatusBadge'
import EditJobModal from '../components/modals/EditJobModal'
import ScheduleJobModal from '../components/modals/ScheduleJobModal'
import AddOperativeModal from '../components/modals/AddOperativeModal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { STATUS_TEXT_COLOR, isPendingStatus } from '../context/statusStyles'

const PAGE_SIZE = 25
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const SUMMARY_CARDS = [
  { label: 'Completed & Evidenced', match: (j) => j.status === 'Completed & Evidenced', color: STATUS_TEXT_COLOR['Completed & Evidenced'] },
  { label: 'Missing Evidence', match: (j) => j.status === 'Missing Evidence', color: STATUS_TEXT_COLOR['Missing Evidence'] },
  { label: 'At Risk', match: (j) => j.status === 'At Risk', color: STATUS_TEXT_COLOR['At Risk'] },
  { label: 'Incomplete', match: isPendingStatus, color: STATUS_TEXT_COLOR.Incomplete },
]

export default function Dashboard() {
  const { clients, sites, jobs, operatives } = useApp()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [clientFilter, setClientFilter] = useState(searchParams.get('client') || '')
  const [siteFilter, setSiteFilter] = useState(searchParams.get('site') || '')
  const [showAllTime, setShowAllTime] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingJob, setEditingJob] = useState(null)
  const [scheduling, setScheduling] = useState(false)
  const [addingOperative, setAddingOperative] = useState(false)

  const statusFilter = searchParams.get('status') || ''

  // Kept URL-driven rather than local state, unlike client/site below - the
  // At Risk/Missing Evidence banners already link to ?status=..., and
  // statusFilter has to keep reflecting the URL live (not just on mount)
  // for those links to still work when clicked from this same page.
  const setStatusFilter = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set('status', value)
    } else {
      next.delete('status')
    }
    setSearchParams(next)
  }

  const clientName = (id) => clients.find((c) => c.id === id)?.name || 'Unknown client'
  const siteName = (id) => sites.find((s) => s.id === id)?.name || 'Unknown site'
  const operativeName = (id, operatives) => operatives.find((o) => o.id === id)?.name || 'Unassigned'

  // Default view is the last 30 days, not everything ever scheduled - day
  // to day this dashboard is about what's happening now, and the full
  // history already has a home on the Client report page. A missing
  // scheduledTime is never hidden by this - fail open rather than silently
  // drop a job that has no date to filter on. No upper bound, so
  // future-scheduled jobs are always visible regardless of this filter.
  const dateFilteredJobs = useMemo(() => {
    if (showAllTime) return jobs
    const cutoff = Date.now() - THIRTY_DAYS_MS
    return jobs.filter((j) => !j.scheduledTime || new Date(j.scheduledTime).getTime() >= cutoff)
  }, [jobs, showAllTime])

  // Every count and card on this page reflects the same date scope as the
  // table below it - otherwise the cards would say "50 completed" while
  // the table (and its pagination) only shows 10, which would just look
  // broken rather than intentional.
  const missingCount = dateFilteredJobs.filter((j) => j.status === 'Missing Evidence').length
  const atRiskCount = dateFilteredJobs.filter((j) => j.status === 'At Risk').length

  // Same active-only counting the database itself uses when enforcing
  // operative_limit, so this never disagrees with what actually gets
  // blocked. Null limit means unlimited - nothing to warn about.
  const activeOperativeCount = operatives.filter((o) => o.active).length
  const isNearLimit = (count, limit) => limit != null && count / limit >= 0.8
  const siteLimitNear = isNearLimit(sites.length, user?.siteLimit)
  const operativeLimitNear = isNearLimit(activeOperativeCount, user?.operativeLimit)

  const sitesForFilter = useMemo(
    () => (clientFilter ? sites.filter((s) => s.clientId === clientFilter) : sites),
    [sites, clientFilter]
  )

  const matchesStatus = (job) => {
    if (!statusFilter) return true
    const card = SUMMARY_CARDS.find((c) => c.label === statusFilter)
    return card ? card.match(job) : job.status === statusFilter
  }

  const filteredJobs = dateFilteredJobs.filter((j) => {
    if (!matchesStatus(j)) return false
    if (clientFilter && j.clientId !== clientFilter) return false
    if (siteFilter && j.siteId !== siteFilter) return false
    return true
  })

  // Resets to page 1 whenever any filter narrows or widens the result set -
  // otherwise switching filters could strand the view on a now-empty page
  // 4 of a 1-page result.
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, clientFilter, siteFilter, showAllTime])

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE))
  const pagedJobs = filteredJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
            {/* The sidebar already shows this, but it scrolls out of view on a
                long job list, and the whole point is to catch "which tenant
                am I looking at" at a glance — right by the page title is
                where that glance lands. */}
            {user?.organizationName && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                {user.organizationName}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">Live evidence status across every client and site.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingOperative(true)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            + Add operative
          </button>
          <button
            onClick={() => setScheduling(true)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            + Schedule new job
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium text-zinc-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{dateFilteredJobs.filter(card.match).length}</p>
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
      {siteLimitNear && (
        <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
          Using <strong>{sites.length}</strong> of <strong>{user.siteLimit}</strong> sites included in your plan.
        </div>
      )}
      {operativeLimitNear && (
        <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
          Using <strong>{activeOperativeCount}</strong> of <strong>{user.operativeLimit}</strong> operatives included
          in your plan.
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:w-auto"
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
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:w-auto"
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

        <select
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {SUMMARY_CARDS.map((card) => (
            <option key={card.label} value={card.label}>
              {card.label}
            </option>
          ))}
        </select>

        <label className="flex w-full items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 shadow-sm sm:w-auto">
          <input
            type="checkbox"
            checked={showAllTime}
            onChange={(e) => setShowAllTime(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600"
          />
          Show all time
        </label>

        {!showAllTime && jobs.length > dateFilteredJobs.length && (
          <p className="w-full text-xs text-zinc-400 sm:w-auto">
            {jobs.length - dateFilteredJobs.length} older job{jobs.length - dateFilteredJobs.length === 1 ? '' : 's'}{' '}
            outside the last 30 days hidden.
          </p>
        )}
      </div>

      {/* Mobile: card list */}
      <div className="mt-4 space-y-3 md:hidden">
        {pagedJobs.map((job) => (
          <div key={job.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900">{job.id}</span>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-2 text-sm font-medium text-zinc-800">{clientName(job.clientId)}</p>
            <p className="text-xs text-zinc-400">{siteName(job.siteId)}</p>

            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">Task</dt>
                <dd className="text-right text-zinc-700">{job.taskType}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">Operative</dt>
                <dd className="text-right text-zinc-700">{operativeName(job.operativeId, operatives)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-400">Evidence</dt>
                <dd className="text-right text-zinc-700">
                  {job.photosSubmitted} / {job.photosRequired}
                </dd>
              </div>
            </dl>

            <button
              onClick={() => setEditingJob(job)}
              className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              Edit
            </button>
          </div>
        ))}
        {filteredJobs.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-400">
            No jobs match the current filters.
          </p>
        )}
      </div>

      {/* Desktop / tablet: table */}
      <div className="mt-4 hidden rounded-xl border border-zinc-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                {['Job', 'Client / Site', 'Task', 'Operative', 'Evidence', 'Status', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pagedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">{job.id}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
                    <div className="font-medium text-zinc-800">{clientName(job.clientId)}</div>
                    <div className="text-zinc-400">{siteName(job.siteId)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">{job.taskType}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">{operativeName(job.operativeId, operatives)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
                    {job.photosSubmitted} / {job.photosRequired}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingJob(job)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                    No jobs match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredJobs.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-zinc-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredJobs.length)} of{' '}
            {filteredJobs.length} job{filteredJobs.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editingJob && <EditJobModal job={editingJob} onClose={() => setEditingJob(null)} />}
      {scheduling && <ScheduleJobModal onClose={() => setScheduling(false)} />}
      {addingOperative && <AddOperativeModal onClose={() => setAddingOperative(false)} />}
    </DashboardLayout>
  )
}
