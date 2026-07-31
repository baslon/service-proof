import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// operatives (name, invite_status, invited_at) is already readable straight
// from the browser under RLS - this endpoint exists only for the one field
// RLS can never expose: email, which lives in auth.users, not in any table
// PostgREST serves. Reading it takes the Admin API, which needs service_role.
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view the operative roster' })
    }

    const { data: operatives, error: operativesError } = await supabaseAdmin
      .from('operatives')
      .select('id, name, invite_status, invited_at')
      .eq('organization_id', callerProfile.organization_id)
      .order('name')

    if (operativesError) {
      return res.status(500).json({ error: operativesError.message })
    }

    // Maps operative_id -> the auth user id that can log in as them, so email
    // (which only exists on that auth user) can be attached below. Most
    // operatives have exactly one; one created but never invited has none.
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, operative_id')
      .eq('organization_id', callerProfile.organization_id)
      .eq('role', 'operative')

    const authIdByOperativeId = Object.fromEntries((profiles || []).map((p) => [p.operative_id, p.id]))

    const roster = await Promise.all(
      operatives.map(async (op) => {
        const authId = authIdByOperativeId[op.id]
        let email = null
        if (authId) {
          const { data } = await supabaseAdmin.auth.admin.getUserById(authId)
          email = data?.user?.email || null
        }
        return {
          id: op.id,
          name: op.name,
          email,
          inviteStatus: op.invite_status,
          invitedAt: op.invited_at,
        }
      })
    )

    return res.status(200).json({ operatives: roster })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
