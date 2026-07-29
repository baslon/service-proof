import { useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import SlideOver from '../components/SlideOver'
import AddClientModal from '../components/modals/AddClientModal'
import { useApp } from '../context/AppContext'
import { SECTORS } from '../context/mockData'
import { isPendingStatus } from '../context/statusStyles'

export default function Clients() {
  const { clients, sites, jobs, deleteClient } = useApp()
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [activeClient, setActiveClient] = useState(null)
  const [adding, setAdding] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const sitesForClient = (clientId) => sites.filter((s) => s.clientId === clientId)
  const jobsForClient = (clientId) => jobs.filter((j) => j.clientId === clientId)
  const activeJobsCount = jobs.filter(isPendingStatus).length

  const completionRateFor = (clientId) => {
    const cJobs = jobsForClient(clientId)
    if (cJobs.length === 0) return 0
    const evidenced = cJobs.filter((j) => j.status === 'Completed & Evidenced').length
    return Math.round((evidenced / cJobs.length) * 100)
  }

  const totalEvidenced = jobs.filter((j) => j.status === 'Completed & Evidenced').length
  const avgCompletion = jobs.length ? Math.round((totalEvidenced / jobs.length) * 100) : 0

  const activeClientRate = activeClient ? completionRateFor(activeClient.id) : 0
  const activeClientSites = activeClient ? sitesForClient(activeClient.id) : []
  const activeClientJobCount = activeClient ? jobsForClient(activeClient.id).length : 0
  const activeClientCanDelete = activeClientSites.length === 0 && activeClientJobCount === 0

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter((c) => {
      if (sectorFilter && c.sector !== sectorFilter) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q)
    })
  }, [clients, search, sectorFilter])

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">Contract health and completion rates across your book.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          + Add new client
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total clients</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{clients.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total sites</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{sites.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Active jobs</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{activeJobsCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Avg. completion rate</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{avgCompletion}%</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-72"
        />
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-auto"
        >
          <option value="">All sectors</option>
          {SECTORS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => {
          const rate = completionRateFor(client.id)
          const clientSites = sitesForClient(client.id)
          const clientJobs = jobsForClient(client.id)
          return (
            <button
              key={client.id}
              onClick={() => {
                setDeleteError('')
                setActiveClient(client)
              }}
              className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:shadow-md hover:ring-1 hover:ring-indigo-200"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{client.sector}</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{client.name}</h3>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Completion rate</span>
                  <span className="font-semibold text-slate-700">{rate}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                {clientSites.length} site{clientSites.length === 1 ? '' : 's'} &middot; {clientJobs.length} job
                {clientJobs.length === 1 ? '' : 's'}
              </p>
            </button>
          )
        })}
        {filteredClients.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-slate-400">No clients match your search.</p>
        )}
      </div>

      <SlideOver
        open={!!activeClient}
        onClose={() => {
          setDeleteError('')
          setActiveClient(null)
        }}
        title={activeClient?.name}
        subtitle={activeClient?.sector}
      >
        {activeClient && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Completion rate</span>
                <span className="font-semibold text-slate-700">{activeClientRate}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${activeClientRate}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</p>
                <p className="mt-1 text-sm text-slate-700">{activeClient.contactName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-1 text-sm text-slate-700">{activeClient.contactEmail}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                <p className="mt-1 text-sm text-slate-700">{activeClient.contactPhone}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contract start</p>
              <p className="mt-1 text-sm text-slate-700">{activeClient.contractStartDate}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{activeClient.notes}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Sites</p>
              <ul className="space-y-2">
                {activeClientSites.map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    {s.name}
                    <span className="block text-xs text-slate-400">{s.address}</span>
                  </li>
                ))}
                {activeClientSites.length === 0 && <li className="text-sm text-slate-400">No sites recorded.</li>}
              </ul>
            </div>

            <button
              onClick={async () => {
                if (!activeClientCanDelete) return
                if (!confirm(`Delete client ${activeClient.name}? This cannot be undone.`)) return
                setDeleteError('')
                setDeleting(true)
                try {
                  await deleteClient(activeClient.id)
                  setActiveClient(null)
                } catch (err) {
                  setDeleteError(err.message)
                } finally {
                  setDeleting(false)
                }
              }}
              disabled={!activeClientCanDelete || deleting}
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              {deleting ? 'Deleting…' : 'Delete client'}
            </button>
            {deleteError && <p className="text-center text-sm text-red-600">{deleteError}</p>}
            {!activeClientCanDelete && (
              <p className="text-center text-xs text-slate-400">
                Can&apos;t delete &mdash; this client still has {activeClientSites.length} site
                {activeClientSites.length === 1 ? '' : 's'} and {activeClientJobCount} job
                {activeClientJobCount === 1 ? '' : 's'}. Remove those first.
              </p>
            )}
          </div>
        )}
      </SlideOver>

      {adding && <AddClientModal onClose={() => setAdding(false)} />}
    </DashboardLayout>
  )
}
