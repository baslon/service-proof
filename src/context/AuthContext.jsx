import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// Supabase's own session only carries auth identity (id, email) — the
// app-specific fields (role, org, which operative this is) live in our own
// profiles table and have to be loaded separately after authenticating.
async function loadProfile(authUser) {
  if (!authUser) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('organization_id, role, name, operative_id, organizations(name, site_limit, operative_limit)')
    .eq('id', authUser.id)
    .single()
  if (error || !data) return null
  return {
    id: authUser.id,
    name: data.name,
    role: data.role,
    operativeId: data.operative_id,
    organizationId: data.organization_id,
    organizationName: data.organizations?.name || '',
    // Null means unlimited - the dashboard only ever warns when a real
    // number is set and usage is approaching it.
    siteLimit: data.organizations?.site_limit ?? null,
    operativeLimit: data.organizations?.operative_limit ?? null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // onAuthStateChange fires immediately with the current session on
  // subscribe, so it covers both the initial load and every later change
  // (login, logout, token refresh) without a separate getSession() call.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(await loadProfile(session?.user ?? null))
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error('Incorrect email or password.')
    }
    const profile = await loadProfile(data.user)
    if (!profile) {
      await supabase.auth.signOut()
      throw new Error('No profile is set up for this account yet.')
    }
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
