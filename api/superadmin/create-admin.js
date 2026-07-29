import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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

    // Same redirect as the operative invite flow, so a newly invited admin
    // lands on the password-setup page instead of signed in with no
    // password ever set.
    const origin = req.headers.origin || `https://${req.headers.host}`
    const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/set-password`,
    })

    if (inviteError) {
      const alreadyExists = /already.*(registered|exists)/i.test(inviteError.message || '')
      return res.status(500).json({
        error: alreadyExists
          ? 'That email already has an account. Use a different email, or remove the existing account first.'
          : inviteError.message,
      })
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: invitedUser.user.id,
      organization_id: organizationId,
      role: 'admin',
      name,
    })

    if (profileError) {
      // Roll back the Auth account rather than leaving a dangling invite
      // with no profile - an "authenticated but unrecognized" dead end if
      // they ever click their invite link.
      await supabaseAdmin.auth.admin.deleteUser(invitedUser.user.id)
      return res.status(500).json({ error: profileError.message })
    }

    return res.status(200).json({ adminId: invitedUser.user.id })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
