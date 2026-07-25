import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { MOCK_USERS } from './mockUsers'

const AuthContext = createContext(null)
const STORAGE_KEY = 'serviceproof_auth'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser)

  // Mock implementation today: checks credentials against a local list and
  // resolves instantly. Swapping in real auth later means replacing the body
  // of this function with an API call (e.g. `await fetch('/api/login', ...)`)
  // — everything that calls useAuth() keeps working unchanged, since login()
  // stays async and either resolves with a session or throws.
  const login = useCallback(async (username, password) => {
    const match = MOCK_USERS.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    )
    if (!match) {
      throw new Error('Incorrect username or password.')
    }
    const session = { id: match.id, name: match.name, role: match.role }
    setUser(session)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    return session
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
