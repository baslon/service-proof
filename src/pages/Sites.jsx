import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import SlideOver from '../components/SlideOver'
import StatusBadge from '../components/StatusBadge'
import AddSiteModal from '../components/modals/AddSiteModal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

export default function Sites() {
  const { clients, sites, jobs, deleteSite } = useApp()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [activeSite, setActiveSite] = useState(null)
  const [copied, setCopied] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const clientName = (id) => clients.find((c) => c.id === id)?.name || 'Unknown client'

  const jobsForSite = (siteId) => jobs.filter((j) => j.siteId === siteId)

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sites.filter((s) => {
      if (clientFilter && s.clientId !== clientFilter) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        clientName(s.clientId).toLowerCase().includes(q)
      )
    })
  }, [sites, search, clientFilter, clients])

  const totalMissing = jobs.filter((j) => j.status === 'Missing Evidence').length
  const totalAtRisk = jobs.filter((j) => j.status === 'At Risk').length
  // Same 80%-of-limit threshold as the Dashboard banner; null limit means
  // unlimited, nothing to warn about.
  const siteLimitNear = user?.siteLimit != null && sites.length / user.siteLimit >= 0.8

  const activeSiteJobCount = activeSite ? jobsForSite(activeSite.id).length : 0

  const copyAccessNotes = (text) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sites</h1>
          <p className="mt-1 text-sm text-slate-500">Every site under management, with live job status.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          + Add new site
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total sites</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{sites.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Missing evidence</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totalMissing}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">At risk</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{totalAtRisk}</p>
        </div>
      </div>

      {siteLimitNear && (
        <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
          Using <strong>{sites.length}</strong> of <strong>{user.siteLimit}</strong> sites included in your plan.
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          placeholder="Search by name, address, or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-72"
        />
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-auto"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map((site) => {
          const siteJobs = jobsForSite(site.id)
          const breakdown = {
            'Completed & Evidenced': siteJobs.filter((j) => j.status === 'Completed & Evidenced').length,
            'Missing Evidence': siteJobs.filter((j) => j.status === 'Missing Evidence').length,
            'At Risk': siteJobs.filter((j) => j.status === 'At Risk').length,
          }
          return (
            <button
              key={site.id}
              onClick={() => {
                setDeleteError('')
                setActiveSite(site)
              }}
              className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:shadow-md hover:ring-1 hover:ring-indigo-200"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{clientName(site.clientId)}</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{site.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{site.address}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {breakdown['Completed & Evidenced'] > 0 && (
                  <StatusBadge status="Completed & Evidenced" className="!px-2 !py-0.5" />
                )}
                {breakdown['Missing Evidence'] > 0 && <StatusBadge status="Missing Evidence" className="!px-2 !py-0.5" />}
                {breakdown['At Risk'] > 0 && <StatusBadge status="At Risk" className="!px-2 !py-0.5" />}
                {siteJobs.length === 0 && <span className="text-xs text-slate-400">No jobs logged</span>}
              </div>
            </button>
          )
        })}
        {filteredSites.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-slate-400">No sites match your search.</p>
        )}
      </div>

      <SlideOver
        open={!!activeSite}
        onClose={() => {
          setDeleteError('')
          setActiveSite(null)
        }}
        title={activeSite?.name}
        subtitle={activeSite ? clientName(activeSite.clientId) : ''}
      >
        {activeSite && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</p>
              <p className="mt-1 text-sm text-slate-700">
                {activeSite.address}, {activeSite.postcode}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site contact</p>
                <p className="mt-1 text-sm text-slate-700">{activeSite.siteContact}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                <p className="mt-1 text-sm text-slate-700">{activeSite.phone}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Access notes</p>
                <button
                  onClick={() => copyAccessNotes(activeSite.accessNotes)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{activeSite.accessNotes}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Added</p>
              <p className="mt-1 text-sm text-slate-700">{activeSite.addedDate}</p>
            </div>

            <Link
              to={`/dashboard?site=${activeSite.id}`}
              className="block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              View jobs for this site
            </Link>

            <button
              onClick={async () => {
                if (activeSiteJobCount > 0) return
                if (!confirm(`Delete site ${activeSite.name}? This cannot be undone.`)) return
                setDeleteError('')
                setDeleting(true)
                try {
                  await deleteSite(activeSite.id)
                  setActiveSite(null)
                } catch (err) {
                  setDeleteError(err.message)
                } finally {
                  setDeleting(false)
                }
              }}
              disabled={activeSiteJobCount > 0 || deleting}
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              {deleting ? 'Deleting…' : 'Delete site'}
            </button>
            {deleteError && <p className="text-center text-sm text-red-600">{deleteError}</p>}
            {activeSiteJobCount > 0 && (
              <p className="text-center text-xs text-slate-400">
                Can&apos;t delete &mdash; {activeSiteJobCount} job{activeSiteJobCount === 1 ? '' : 's'} still
                reference{activeSiteJobCount === 1 ? 's' : ''} this site. Reassign or delete{' '}
                {activeSiteJobCount === 1 ? 'it' : 'them'} first.
              </p>
            )}
          </div>
        )}
      </SlideOver>

      {adding && <AddSiteModal onClose={() => setAdding(false)} />}
    </DashboardLayout>
  )
}
