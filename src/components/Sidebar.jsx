import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { isPendingStatus } from '../context/statusStyles'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/sites', label: 'Sites', icon: 'building' },
  { to: '/schedules', label: 'Schedules', icon: 'calendar' },
  { to: '/clients', label: 'Clients', icon: 'users' },
  { to: '/operatives', label: 'Operatives', icon: 'badge' },
  { to: '/attendance', label: 'Attendance', icon: 'clock' },
  { to: '/report', label: 'Client report', icon: 'doc' },
  { to: '/billing', label: 'Billing', icon: 'card' },
]

const STATUS_FILTERS = [
  { label: 'All jobs', value: '' },
  { label: 'Completed & Evidenced', value: 'Completed & Evidenced' },
  { label: 'Missing Evidence', value: 'Missing Evidence' },
  { label: 'At Risk', value: 'At Risk' },
  { label: 'Incomplete', value: 'Incomplete' },
]

function Icon({ name, className }) {
  const paths = {
    grid: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
    building: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1',
    calendar: 'M8 2v4m8-4v4M3.5 9h17M4 5h16a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm3 8h1m3 0h1m3 0h1m-9 4h1m3 0h1m3 0h1',
    users: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 3.13a4 4 0 010 6.74M7 10.13a4 4 0 010 6.74',
    doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    clock: 'M12 7v5l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    badge: 'M12 3l2.09 4.26 4.7.68-3.4 3.32.8 4.68L12 13.77l-4.19 2.17.8-4.68-3.4-3.32 4.7-.68L12 3z',
    card: 'M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6zM3 10h18M7 15h4',
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  )
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { jobs, refreshData } = useApp()
  const { user, logout } = useAuth()
  const activeStatus = searchParams.get('status') || ''
  const onDashboard = location.pathname === '/dashboard'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
    onClose?.()
  }

  const counts = {
    '': jobs.length,
    'Completed & Evidenced': jobs.filter((j) => j.status === 'Completed & Evidenced').length,
    'Missing Evidence': jobs.filter((j) => j.status === 'Missing Evidence').length,
    'At Risk': jobs.filter((j) => j.status === 'At Risk').length,
    Incomplete: jobs.filter(isPendingStatus).length,
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 no-print lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 transform flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-6 py-5">
          <Link to="/" className="flex items-center gap-2" title="Back to home page">
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
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Navigation</p>
          <ul className="mt-2 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon name={link.icon} className="h-4.5 w-4.5" />
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Filter by status</p>
          <ul className="mt-2 space-y-1">
            {STATUS_FILTERS.map((f) => {
              const active = onDashboard && activeStatus === f.value
              return (
                <li key={f.label}>
                  <Link
                    to={f.value ? `/dashboard?status=${encodeURIComponent(f.value)}` : '/dashboard'}
                    onClick={onClose}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                      {counts[f.value]}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-3">
          {user && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
                {user.organizationName && (
                  <p className="truncate text-xs font-medium text-slate-600">{user.organizationName}</p>
                )}
                <p className="text-xs capitalize text-slate-400">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Log out
              </button>
            </div>
          )}
          <Link
            to="/submit"
            onClick={onClose}
            className="mb-2 flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Open mobile proof form
          </Link>
          <button
            onClick={() => {
              refreshData()
              onClose?.()
            }}
            className="flex w-full items-center justify-center rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
          >
            Refresh data
          </button>
        </div>
      </aside>
    </>
  )
}
