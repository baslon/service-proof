import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth({ roles }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/submit'} replace />
  }

  return <Outlet />
}
