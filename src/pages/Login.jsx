import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../lib/roleHome'
import { inputClass } from '../components/FormField'
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

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
    <div className="min-h-screen bg-zinc-50 font-geist text-zinc-900">
      <SiteHeader />

      <div className="flex justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="font-display text-xl font-semibold text-zinc-900">Sign in</h1>
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
      </div>

      <SiteFooter />

      {forgotPassword && <ForgotPasswordModal onClose={() => setForgotPassword(false)} />}
    </div>
  )
}
