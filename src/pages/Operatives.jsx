import { useCallback, useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import AddOperativeModal from '../components/modals/AddOperativeModal'
import { supabase } from '../lib/supabaseClient'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_STYLE = {
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
  const [operatives, setOperatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

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
      const { operatives: roster } = await callApi('/api/list-operatives')
      setOperatives(roster)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [callApi])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  const handleResend = async (operativeId) => {
    await callApi('/api/resend-operative-invite', { method: 'POST', body: { operativeId } })
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

      {error && (
        <div className="mt-6 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">
          <span>Couldn&apos;t load the operative roster. ({error})</span>
          <button onClick={loadRoster} className="shrink-0 text-xs font-medium text-red-700 underline">
            Try again
          </button>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Name', 'Email', 'Status', 'Invited', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : operatives.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    No operatives yet — invite your first one above.
                  </td>
                </tr>
              ) : (
                operatives.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{op.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{op.email || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLE[op.inviteStatus] || STATUS_STYLE.not_invited}`}>
                        {op.inviteStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDateTime(op.invitedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ResendButton operativeId={op.id} onResend={handleResend} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* "Active" is set the moment the account is created, not once someone has
          actually logged in - so it can't be read as "this person is up and
          running", only as "this account exists and can receive an invite link." */}
      <p className="mt-3 text-xs text-slate-400">
        Status reflects whether an account exists, not whether the operative has signed in yet. If someone says their
        invite link isn&apos;t working, use Resend invite to send a fresh one.
      </p>

      {adding && <AddOperativeModal onClose={() => { setAdding(false); loadRoster() }} />}
    </DashboardLayout>
  )
}
