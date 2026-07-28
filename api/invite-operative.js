import { createClient } from '@supabase/supabase-js'

// Uses the service_role key, which bypasses RLS entirely — this must only
// ever run server-side. Creating another person's login account (the
// Supabase Admin API) isn't something the browser can do with the anon key,
// which is the whole reason this exists as a serverless function.
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

    // The caller's own organization is looked up server-side rather than
    // trusted from the request body, so one org's admin can never invite an
    // operative into a different organization.
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite operatives' })
    }

    const { name, email } = req.body || {}
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    const { data: operative, error: operativeError } = await supabaseAdmin
      .from('operatives')
      .insert({
        organization_id: callerProfile.organization_id,
        name,
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (operativeError) {
      return res.status(500).json({ error: operativeError.message })
    }

    // Send the invite link straight to the password-setup page, rather than
    // wherever the project's Site URL happens to point — otherwise a new
    // operative lands on an arbitrary page already signed in with no
    // password ever set.
    const origin = req.headers.origin || `https://${req.headers.host}`
    const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/set-password`,
    })

    if (inviteError) {
      // Roll back the roster entry rather than leaving an orphaned
      // "invited" operative with no way to actually invite them again.
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
      organization_id: callerProfile.organization_id,
      role: 'operative',
      name,
      operative_id: operative.id,
    })

    if (linkError) {
      return res.status(500).json({ error: linkError.message })
    }

    return res.status(200).json({ operative })
  } catch (err) {
    // Catches anything unexpected (e.g. the Admin API throwing instead of
    // returning an error object) so the client always gets valid JSON back
    // instead of a crashed, bodyless response.
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
