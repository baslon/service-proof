import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../lib/roleHome'
import { inputClass } from '../components/FormField'

const ADMIN_ONLY_PATHS = ['/dashboard', '/sites', '/clients', '/report']

// A "come back here after signing in" path can be left over in browser
// history from a different session (e.g. a shared device). Only honor it if
// it's actually reachable by the role that just signed in — otherwise fall
// back to that role's home page — so a stale path never sends someone
// somewhere they didn't ask for.
function resolveDestination(role, requestedPath) {
  if (requestedPath && (role === 'admin' || !ADMIN_ONLY_PATHS.includes(requestedPath))) {
    return requestedPath
  }
  return homeFor(role)
}

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to={resolveDestination(user.role, location.state?.from?.pathname)} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const session = await login(email, password)
      navigate(resolveDestination(session.role, location.state?.from?.pathname), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link to="/" className="flex items-center gap-2" title="Back to home page">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            SP
          </div>
          <span className="text-base font-semibold text-slate-900">ServiceProof</span>
        </Link>

        <h1 className="mt-6 text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Manager and operative access.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

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
