import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import FormField, { inputClass } from '../components/FormField'

// Deliberately separate from AuthContext/RequireAuth: a superadmin has no
// organization of its own and no profiles row, so the regular login flow
// (which requires a profile to load) doesn't apply here. This page manages
// its own auth state and talks directly to the api/superadmin/* endpoints,
// which are the actual authorization boundary - this page is just the UI.
async function callApi(path, { method = 'GET', body } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch(`/api/superadmin/${path}`, {
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
}

function LoginForm({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw new Error('Incorrect email or password.')
      const { isSuperadmin } = await callApi('whoami')
      if (!isSuperadmin) {
        await supabase.auth.signOut()
        throw new Error('This account does not have superadmin access.')
      }
      onSignedIn()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Superadmin</h1>
        <p className="mt-1 text-sm text-slate-500">Cross-organization access. Restricted.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField label="Email">
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </FormField>
          <FormField label="Password">
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </FormField>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

function CreateOrganizationForm({ onCreated }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { organization } = await callApi('create-organization', { method: 'POST', body: { name } })
      setName('')
      onCreated(organization)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Organization name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {submitting ? 'Creating…' : 'Create organization'}
      </button>
    </form>
  )
}

function InvitePersonForm({ title, actionPath, submitLabel, organizations }) {
  const [organizationId, setOrganizationId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await callApi(actionPath, { method: 'POST', body: { organizationId, name, email } })
      setSuccess(`Invited ${name}.`)
      setName('')
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <FormField label="Organization">
        <select className={inputClass} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} required>
          <option value="" disabled>
            Select an organization
          </option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormField label="Email">
        <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
      <button
        type="submit"
        disabled={submitting || !organizationId}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {submitting ? 'Sending…' : submitLabel}
      </button>
    </form>
  )
}

// Shared by both limit fields below - each is a total for the whole
// organization (shared across every admin on it, not a separate allowance
// per person), so each lives on the organization itself. Blank means
// unlimited. Generic over which endpoint/value it edits so the two limits
// don't duplicate this dirty-tracking and save logic twice.
function LimitField({ label, value, onSave }) {
  // The input's value is always a string; the stored value comes back
  // from the API as a number (or null). Comparing them directly for
  // dirty-checking would never settle back to false after a save -
  // "5" !== 5 forever - and recomputing this from the current prop on
  // every render (rather than only at mount) is what lets it settle once
  // the parent's state reflects a successful save.
  const initialValue = value != null ? String(value) : ''
  const [inputValue, setInputValue] = useState(initialValue)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isDirty = inputValue !== initialValue

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      await onSave(inputValue === '' ? null : inputValue)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="w-28 shrink-0 text-xs text-slate-500">{label}</span>
        <input
          type="number"
          min="0"
          placeholder="Unlimited"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError('')
          }}
          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function OrganizationRow({ org, onUpdated }) {
  return (
    <li className="py-3">
      <p className="font-medium text-slate-700">{org.name}</p>
      <div className="mt-2 space-y-2">
        <LimitField
          label="Site limit"
          value={org.site_limit}
          onSave={async (v) => {
            const { siteLimit } = await callApi('set-site-limit', {
              method: 'POST',
              body: { organizationId: org.id, siteLimit: v },
            })
            onUpdated(org.id, { site_limit: siteLimit })
          }}
        />
        <LimitField
          label="Operative limit"
          value={org.operative_limit}
          onSave={async (v) => {
            const { operativeLimit } = await callApi('set-operative-limit', {
              method: 'POST',
              body: { organizationId: org.id, operativeLimit: v },
            })
            onUpdated(org.id, { operative_limit: operativeLimit })
          }}
        />
      </div>
    </li>
  )
}

function Dashboard({ onSignOut }) {
  const [organizations, setOrganizations] = useState([])
  const [error, setError] = useState('')

  const loadOrganizations = useCallback(async () => {
    try {
      const { organizations: orgs } = await callApi('list-organizations')
      setOrganizations(orgs)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  const handleOrgUpdated = (orgId, patch) => {
    setOrganizations((prev) => prev.map((o) => (o.id === orgId ? { ...o, ...patch } : o)))
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Superadmin</h1>
          <button onClick={onSignOut} className="text-sm font-medium text-slate-500 hover:text-slate-700">
            Sign out
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Create organization</h2>
          <CreateOrganizationForm onCreated={loadOrganizations} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <InvitePersonForm
            title="Invite admin"
            actionPath="create-admin"
            submitLabel="Invite admin"
            organizations={organizations}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <InvitePersonForm
            title="Invite operative"
            actionPath="invite-operative"
            submitLabel="Invite operative"
            organizations={organizations}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Organizations ({organizations.length})</h2>
          <p className="mt-1 text-xs text-slate-400">
            Each limit is a total for the whole organization, shared across every admin on it. Leave blank for
            unlimited. Operative limit counts active operatives only.
          </p>
          <ul className="mt-3 divide-y divide-slate-100 text-sm text-slate-600">
            {organizations.map((org) => (
              <OrganizationRow key={org.id} org={org} onUpdated={handleOrgUpdated} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default function SuperAdmin() {
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        if (!cancelled) setChecking(false)
        return
      }
      try {
        const { isSuperadmin } = await callApi('whoami')
        if (!cancelled) setAuthorized(isSuperadmin)
      } catch {
        if (!cancelled) setAuthorized(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setAuthorized(false)
  }

  if (checking) return null

  if (!authorized) {
    return <LoginForm onSignedIn={() => setAuthorized(true)} />
  }

  return <Dashboard onSignOut={handleSignOut} />
}
