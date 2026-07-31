import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// operatives has no update policy for anyone but service_role, and banning a
// login is only possible through the Admin API - both reasons this has to
// be a serverless function rather than a direct write from the browser.
//
// Deactivating does two independent things: it flips a flag on the
// operatives row (which is what "not offered for new jobs" reads), and it
// bans the linked auth user (which is what actually stops them signing in).
// A flag alone would just be a label a former employee's real session could
// ignore. Note the ban only takes effect on their next sign-in or token
// refresh - an already-open session keeps working until its access token
// expires, since Supabase checks the ban at issuance, not by revoking
// tokens already handed out.
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
      .select('role, organization_id')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change an operative\'s active status' })
    }

    const { operativeId, active } = req.body || {}
    if (!operativeId || typeof active !== 'boolean') {
      return res.status(400).json({ error: 'operativeId and a boolean active are required' })
    }

    const { data: operative, error: operativeError } = await supabaseAdmin
      .from('operatives')
      .select('id')
      .eq('id', operativeId)
      .eq('organization_id', callerProfile.organization_id)
      .single()

    if (operativeError || !operative) {
      return res.status(404).json({ error: 'Operative not found in your organization' })
    }

    const { error: updateError } = await supabaseAdmin.from('operatives').update({ active }).eq('id', operativeId)
    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    const { data: linkedProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('operative_id', operativeId)
      .eq('role', 'operative')
      .maybeSingle()

    // An operative created but never invited has no auth account yet -
    // nothing to ban, the flag change alone is the whole story for them.
    if (linkedProfile) {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(linkedProfile.id, {
        ban_duration: active ? 'none' : '876000h',
      })
      if (banError) {
        return res.status(500).json({ error: `Status updated, but login access could not be changed: ${banError.message}` })
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
