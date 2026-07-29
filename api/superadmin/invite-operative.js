import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Mirrors api/invite-operative.js, but the organization is specified
// directly by the superadmin rather than inferred from the caller's own
// profile - a superadmin has no single organization of their own.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
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

    const { data: superadmin } = await supabaseAdmin
      .from('superadmins')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (!superadmin) {
      return res.status(403).json({ error: 'Superadmin access required' })
    }

    const { organizationId, name, email } = req.body || {}
    if (!organizationId || !name || !email) {
      return res.status(400).json({ error: 'Organization, name and email are required' })
    }

    const { data: operative, error: operativeError } = await supabaseAdmin
      .from('operatives')
      .insert({
        organization_id: organizationId,
        name,
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (operativeError) {
      return res.status(500).json({ error: operativeError.message })
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/set-password`,
    })

    if (inviteError) {
      await supabaseAdmin.from('operatives').delete().eq('id', operative.id)
      const alreadyExists = /already.*(registered|exists)/i.test(inviteError.message || '')
      return res.status(500).json({
        error: alreadyExists
          ? 'That email already has an account. Use a different email, or remove the existing account first.'
          : inviteError.message,
      })
    }

    const { error: linkError } = await supabaseAdmin.from('profiles').insert({
      id: invitedUser.user.id,
      organization_id: organizationId,
      role: 'operative',
      name,
      operative_id: operative.id,
    })

    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(invitedUser.user.id)
      await supabaseAdmin.from('operatives').delete().eq('id', operative.id)
      return res.status(500).json({ error: linkError.message })
    }

    return res.status(200).json({ operative })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
