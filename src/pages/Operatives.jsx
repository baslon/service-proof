import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import AddOperativeModal from '../components/modals/AddOperativeModal'
import EditOperativeModal from '../components/modals/EditOperativeModal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ACCOUNT_STATUS_STYLE = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  invited: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  not_invited: 'bg-slate-100 text-slate-500 ring-slate-500/10',
}

function ResendButton({ operativeId, onResend }) {
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  const handleClick = async () => {
    setState('sending')
    setError('')
    try {
      await onResend(operativeId)
      setState('sent')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  if (state === 'sent') {
    return <span className="text-xs font-medium text-emerald-600">Invite sent</span>
  }

  return (
    <div className="text-right">
      <button
        onClick={handleClick}
        disabled={state === 'sending'}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : 'Resend invite'}
      </button>
      {state === 'error' && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function Operatives() {
  // "Account" (inviteStatus/invitedAt/email) only exists via the Admin API, so
  // it comes from a dedicated endpoint. "Active" and client scoping are plain
  // org-scoped rows already flowing through AppContext under RLS - merging
  // the two here avoids fetching the same operative twice from two sources
  // of truth for the fields both could technically provide.
  const { clients, operatives: contextOperatives } = useApp()
  const { user } = useAuth()
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const callApi = useCallback(async (path, { method = 'GET', body } = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  }, [])

  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { operatives: accountRows } = await callApi('/api/operatives')
      setRoster(accountRows)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [callApi])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  const operatives = useMemo(() => {
    const contextById = Object.fromEntries(contextOperatives.map((o) => [o.id, o]))
    return roster.map((op) => ({
      ...op,
      active: contextById[op.id]?.active ?? true,
      clientIds: contextById[op.id]?.clientIds ?? [],
    }))
  }, [roster, contextOperatives])

  // Same active-only counting and 80%-of-limit threshold as the Dashboard
  // banner - counted from contextOperatives (the raw AppContext data),
  // not the roster merge above, since that's exactly what the database
  // itself counts when enforcing operative_limit. Null limit means
  // unlimited, nothing to warn about.
  const activeOperativeCount = contextOperatives.filter((o) => o.active).length
  const operativeLimitNear = user?.operativeLimit != null && activeOperativeCount / user.operativeLimit >= 0.8

  const clientNames = (clientIds) =>
    clientIds.length === 0 ? 'All clients' : clientIds.map((id) => clients.find((c) => c.id === id)?.name || id).join(', ')

  const handleResend = async (operativeId) => {
    await callApi('/api/operatives', { method: 'POST', body: { action: 'resend', operativeId } })
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operatives</h1>
          <p className="mt-1 text-sm text-slate-500">Everyone with access to submit proof for your organization.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          + Add operative
        </button>
      </div>

      {operativeLimitNear && (
        <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
          Using <strong>{activeOperativeCount}</strong> of <strong>{user.operativeLimit}</strong> operatives included
          in your plan.
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">
          <span>Couldn&apos;t load the operative roster. ({error})</span>
          <button onClick={loadRoster} className="shrink-0 text-xs font-medium text-red-700 underline">
            Try again
          </button>
        </div>
      )}

      {/* Mobile: card list. The table below needs six columns' worth of width
          no matter how it's dressed up, so on a phone it's a second list
          shaped for a narrow screen rather than the same table squeezed or
          left to scroll sideways. */}
      <div className="mt-6 space-y-3 md:hidden">
        {loading ? (
          <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
            Loading…
          </p>
        ) : operatives.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
            No operatives yet — invite your first one above.
          </p>
        ) : (
          operatives.map((op) => (
            <div key={op.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">{op.name}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    op.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-500 ring-slate-500/10'
                  }`}
                >
                  {op.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{op.email || '—'}</p>

              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Account</dt>
                  <dd>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${ACCOUNT_STATUS_STYLE[op.inviteStatus] || ACCOUNT_STATUS_STYLE.not_invited}`}>
                      {op.inviteStatus.replace('_', ' ')}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-slate-400">Clients</dt>
                  <dd className="truncate text-right text-slate-700">{clientNames(op.clientIds)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Invited</dt>
                  <dd className="text-slate-700">{formatDateTime(op.invitedAt)}</dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <button onClick={() => setEditing(op)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Edit
                </button>
                <ResendButton operativeId={op.id} onResend={handleResend} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="mt-6 hidden rounded-xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Name', 'Email', 'Employment', 'Account', 'Clients', 'Invited', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : operatives.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                    No operatives yet — invite your first one above.
                  </td>
                </tr>
              ) : (
                operatives.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{op.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{op.email || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          op.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-500 ring-slate-500/10'
                        }`}
                      >
                        {op.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${ACCOUNT_STATUS_STYLE[op.inviteStatus] || ACCOUNT_STATUS_STYLE.not_invited}`}>
                        {op.inviteStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-600" title={clientNames(op.clientIds)}>
                      {clientNames(op.clientIds)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDateTime(op.invitedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setEditing(op)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                          Edit
                        </button>
                        <ResendButton operativeId={op.id} onResend={handleResend} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* "Account" is set to active the moment the login is created, not once
          someone has actually signed in - so it can't be read as "this person
          is up and running", only as "this account exists". "Employment" is
          the separate flag that actually controls new assignments and login. */}
      <p className="mt-3 text-xs text-slate-400">
        Account reflects whether a login exists, not whether the operative has signed in yet — use Resend invite if
        their link stopped working. Employment controls whether they can be assigned new jobs and sign in at all.
      </p>

      {adding && <AddOperativeModal onClose={() => { setAdding(false); loadRoster() }} />}
      {editing && <EditOperativeModal operative={editing} onClose={() => setEditing(null)} />}
    </DashboardLayout>
  )
}
