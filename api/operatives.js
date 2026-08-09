import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Consolidates what used to be four separate functions (list, invite,
// resend, set-active) into one. Vercel's Hobby plan caps a deployment at
// 12 serverless functions, and this project crossed that the moment the
// Stripe endpoints were added. Routed by method (GET = list) and an
// `action` field on POST - each branch below is still exactly the
// endpoint it used to be, just no longer paying for a function slot of
// its own.
export default async function handler(req, res) {
  try {
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
      return res.status(403).json({ error: 'Only admins can manage operatives' })
    }

    if (req.method === 'GET') {
      return await listOperatives(res, callerProfile)
    }

    if (req.method === 'POST') {
      const { action } = req.body || {}
      if (action === 'invite') return await inviteOperative(req, res, callerProfile)
      if (action === 'resend') return await resendInvite(req, res, callerProfile)
      if (action === 'setActive') return await setActive(req, res, callerProfile)
      return res.status(400).json({ error: 'Unknown action' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

// operatives (name, invite_status, invited_at) is already readable straight
// from the browser under RLS - this exists only for the one field RLS can
// never expose: email, which lives in auth.users, not in any table
// PostgREST serves. Reading it takes the Admin API, which needs service_role.
async function listOperatives(res, callerProfile) {
  const { data: operatives, error: operativesError } = await supabaseAdmin
    .from('operatives')
    .select('id, name, invite_status, invited_at')
    .eq('organization_id', callerProfile.organization_id)
    .order('name')

  if (operativesError) {
    return res.status(500).json({ error: operativesError.message })
  }

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
}

async function inviteOperative(req, res, callerProfile) {
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

  const origin = req.headers.origin || `https://${req.headers.host}`
  const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/set-password`,
    data: { org_name: callerProfile.organizations?.name || '' },
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
    organization_id: callerProfile.organization_id,
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
}

// invite_status flips to 'active' the moment the operative's account is
// created - before they've opened the email or set a password. So "active"
// here never meant "has logged in", and a stuck or expired invite link
// looks identical to a working one in this column. This exists because
// that gap is real: there is no other way to give someone a fresh link.
async function resendInvite(req, res, callerProfile) {
  const { operativeId } = req.body || {}
  if (!operativeId) {
    return res.status(400).json({ error: 'operativeId is required' })
  }

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
}

// operatives has no update policy for anyone but service_role, and banning a
// login is only possible through the Admin API. Deactivating does two
// independent things: flips a flag on the operatives row (what "not offered
// for new jobs" reads), and bans the linked auth user (what actually stops
// them signing in) - a flag alone would just be a label a former employee's
// real session could ignore. The ban only takes effect on their next
// sign-in or token refresh, since Supabase checks it at issuance, not by
// revoking tokens already handed out.
async function setActive(req, res, callerProfile) {
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
}
