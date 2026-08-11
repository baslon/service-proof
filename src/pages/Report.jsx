import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useApp } from '../context/AppContext'

// A service report is tied to a contract period, so it opens on the current
// month rather than every job ever recorded for a client.
function currentMonthRange() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const first = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const last = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`
  return { from: first, to: last }
}

function formatDay(value) {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Report() {
  const { clients, sites, jobs, operatives } = useApp()
  const [clientId, setClientId] = useState('')
  const [{ from, to }, setRange] = useState(currentMonthRange)

  const clientName = (id) => clients.find((c) => c.id === id)?.name || 'Unknown client'
  const siteName = (id) => sites.find((s) => s.id === id)?.name || 'Unknown site'
  const operativeName = (id) => operatives.find((o) => o.id === id)?.name || 'Unassigned'

  // Filtered on scheduled date rather than submission: the period a client
  // is asking about is when the work was due, not when the paperwork landed.
  // scheduledTime is "YYYY-MM-DDTHH:mm", so a string compare on the date part
  // is both correct and free of timezone reinterpretation.
  const scopedJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (clientId && j.clientId !== clientId) return false
        const day = (j.scheduledTime || '').slice(0, 10)
        if (from && day && day < from) return false
        if (to && day && day > to) return false
        return true
      }),
    [jobs, clientId, from, to]
  )

  const evidencedJobs = scopedJobs.filter((j) => j.status === 'Completed & Evidenced')
  const exceptions = scopedJobs.filter((j) => j.status === 'Missing Evidence' || j.status === 'At Risk')

  const completionRate = scopedJobs.length ? Math.round((evidencedJobs.length / scopedJobs.length) * 100) : 0

  const today = new Date().toISOString().slice(0, 10)

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 no-print sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client report</h1>
          <p className="mt-1 text-sm text-slate-500">A printable service summary.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-auto"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Period start"
              value={from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-auto"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              aria-label="Period end"
              value={to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-auto"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            Export report
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-8 print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 2.5L19 5.5V11C19 16 15.5 19.5 12 21C8.5 19.5 5 16 5 11V5.5Z" />
                  <path d="M8.5 11.5L11 14L15.5 9" />
                </svg>
              </div>
              <span className="text-base font-semibold text-slate-900">Provaserve</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Service Report {clientId ? `— ${clientName(clientId)}` : '— All clients'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {from || to ? `Period: ${formatDay(from) || 'start'} – ${formatDay(to) || 'today'}` : 'All dates'}
            </p>
          </div>
          <p className="text-sm text-slate-400">Generated {today}</p>
        </div>

        <section className="border-b border-slate-200 py-6">
          <p className="text-sm font-medium text-slate-500">Completion rate summary</p>
          <div className="mt-2 flex items-end gap-4">
            <span className="text-5xl font-bold text-slate-900">{completionRate}%</span>
            <span className="mb-2 text-sm text-slate-400">
              {evidencedJobs.length} of {scopedJobs.length} jobs evidenced
            </span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${completionRate >= 90 ? 'bg-emerald-500' : completionRate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </section>

        <section className="border-b border-slate-200 py-6">
          <h3 className="text-base font-semibold text-slate-900">Completed &amp; evidenced jobs</h3>

          {/* Mobile: card list */}
          <div className="mt-4 space-y-3 md:hidden print:hidden">
            {evidencedJobs.map((j) => (
              <div key={j.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{j.id}</span>
                  <span className="text-xs text-slate-400">{j.submittedTime?.replace('T', ' ') || '—'}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{j.taskType}</p>
                <p className="text-xs text-slate-500">{siteName(j.siteId)}</p>
                <p className="mt-1 text-xs text-slate-400">{operativeName(j.operativeId)}</p>
              </div>
            ))}
            {evidencedJobs.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">
                No evidenced jobs in this scope yet.
              </p>
            )}
          </div>

          {/* Desktop / print: table */}
          <div className="mt-4 hidden overflow-x-auto md:block print:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  {['Job', 'Site', 'Task', 'Operative', 'Submitted'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evidencedJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-slate-900">{j.id}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600">{siteName(j.siteId)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600">{j.taskType}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600">{operativeName(j.operativeId)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600">{j.submittedTime?.replace('T', ' ') || '—'}</td>
                  </tr>
                ))}
                {evidencedJobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-400">
                      No evidenced jobs in this scope yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="py-6">
          <h3 className="text-base font-semibold text-slate-900">Exceptions</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {exceptions.map((j) => (
              <div
                key={j.id}
                className={`break-avoid rounded-lg border p-4 ${j.status === 'At Risk' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{j.id}</span>
                  <span
                    className={`text-xs font-medium ${j.status === 'At Risk' ? 'text-red-700' : 'text-amber-700'}`}
                  >
                    {j.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {j.taskType} &middot; {siteName(j.siteId)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {j.photosSubmitted}/{j.photosRequired} photos submitted
                </p>
                {j.notes && <p className="mt-2 text-sm text-slate-600">{j.notes}</p>}
              </div>
            ))}
            {exceptions.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-slate-400">No exceptions in this scope.</p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
