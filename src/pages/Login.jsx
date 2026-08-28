import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../lib/roleHome'
import { inputClass } from '../components/FormField'
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal'

const ADMIN_ONLY_PATHS = ['/dashboard', '/sites', '/clients', '/operatives', '/report']

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
  const [forgotPassword, setForgotPassword] = useState(false)

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link to="/" className="flex items-center gap-2" title="Back to home page">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
          >
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M8 12.5l2.6 2.6L16.5 9" />
          </svg>
          <span className="text-base font-semibold text-zinc-900">Provaserve</span>
        </Link>

        <h1 className="mt-6 text-xl font-bold text-zinc-900">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">Manager and operative access.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">Email</span>
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
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700">Password</span>
              <button
                type="button"
                onClick={() => setForgotPassword(true)}
                className="text-xs font-medium text-zinc-900 hover:text-zinc-600"
              >
                Forgot password?
              </button>
            </div>
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
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      {forgotPassword && <ForgotPasswordModal onClose={() => setForgotPassword(false)} />}
    </div>
  )
}
