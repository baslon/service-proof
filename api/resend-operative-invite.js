import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// invite_status flips to 'active' the moment the operative's account is
// created — before they've opened the email or set a password (see
// mark_operative_active). So "active" here never meant "has logged in", and
// a stuck or expired invite link looks identical to a working one in this
// column. This exists because that gap is real: there is no other way to
// give someone a fresh link.
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

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id, organizations(name)')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can resend an invite' })
    }

    const { operativeId } = req.body || {}
    if (!operativeId) {
      return res.status(400).json({ error: 'operativeId is required' })
    }

    // Re-derive everything from the operative's own organization rather than
    // trusting anything about it from the request, so one org's admin can
    // never resend an invite belonging to a different org's operative.
    const { data: operative, error: operativeError } = await supabaseAdmin
      .from('operatives')
      .select('id, name')
      .eq('id', operativeId)
      .eq('organization_id', callerProfile.organization_id)
      .single()

    if (operativeError || !operative) {
      return res.status(404).json({ error: 'Operative not found in your organization' })
    }

    const { data: linkedProfile, error: linkedProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('operative_id', operativeId)
      .eq('role', 'operative')
      .single()

    if (linkedProfileError || !linkedProfile) {
      return res.status(400).json({ error: 'This operative has no linked account to resend an invite for.' })
    }

    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(linkedProfile.id)
    if (authUserError || !authUser?.user?.email) {
      return res.status(500).json({ error: 'Could not find an email address for this operative.' })
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(authUser.user.email, {
      redirectTo: `${origin}/set-password`,
      data: { org_name: callerProfile.organizations?.name || '' },
    })

    if (inviteError) {
      // Supabase only refuses a re-invite once the person has actually set a
      // password - at which point "resend the invite" is the wrong action,
      // since there is no longer an invite to resend.
      const alreadyConfirmed = /already.*(registered|exists)/i.test(inviteError.message || '')
      return res.status(500).json({
        error: alreadyConfirmed
          ? 'This operative has already set a password and signed in — there is no pending invite left to resend.'
          : inviteError.message,
      })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
