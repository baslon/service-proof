import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../lib/roleHome'

export default function RequireAuth({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Supabase's session check is async — without this, a signed-in user
  // would flash through a redirect to /login before their session resolves.
  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />
  }

  return <Outlet />
}
